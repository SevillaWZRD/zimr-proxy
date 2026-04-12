export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    // Capitol Trades has an undocumented REST API used by their frontend
    // Format: /api/trades with JSON response
    const r = await fetch('https://www.capitoltrades.com/trades?pageSize=96', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      }
    });

    const html = await r.text();

    // Extract the Nuxt payload — Capitol Trades uses Nuxt 3
    // Data is in <script id="__NUXT_DATA__" type="application/json">
    const nuxtMatch = html.match(/<script\s+id="__NUXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
    if (!nuxtMatch) throw new Error('Nuxt data not found in page');

    const raw = JSON.parse(nuxtMatch[1]);

    // The nuxt data is a flat array. We need to find the trades.
    // Capitol Trades structures: find arrays of objects with txDate
    const trades = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        // Look for trade objects — they have txDate or transactionDate
        if (item.txDate || item.transactionDate) {
          // Find politician name — usually nearby in the array
          const politician = raw[i - 1] || {};
          const issuer = raw[i + 1] || {};
          trades.push({
            name:              (typeof politician === 'object' ? politician.name : null) || item.politician || '',
            ticker:            (typeof issuer === 'object' ? issuer.symbol : null) || item.ticker || '--',
            asset_description: (typeof issuer === 'object' ? issuer.name : null) || item.asset || '',
            type:              item.txType || item.type || '',
            amount:            item.txValue ? '$' + Number(item.txValue).toLocaleString() : (item.amount || ''),
            date:              item.discloseDate || item.disclosureDate || '',
            traded:            item.txDate || item.transactionDate || '',
            party:             item.party || '',
            state:             item.state || '',
            chamber:           item.chamber || '',
          });
        }
      }
    }

    if (trades.length > 0) {
      return res.status(200).json({ trades: trades.slice(0, 80), count: trades.length, source: 'capitoltrades-live' });
    }

    throw new Error('Could not parse trades from page — ' + trades.length + ' found');

  } catch(e) {
    // Fallback: fetch from a working public JSON source
    try {
      // Try the PolyMarket / Unusual Whales public congress data
      const r2 = await fetch('https://api.unusualwhales.com/api/congress/recent?limit=50', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Origin': 'https://unusualwhales.com',
        }
      });
      if (!r2.ok) throw new Error('UW returned ' + r2.status);
      const d2 = await r2.json();
      const arr = d2.data || d2.trades || d2;
      const trades2 = arr.slice(0, 80).map(t => ({
        name:              t.full_name || t.politician || '',
        ticker:            t.symbol || t.ticker || '--',
        asset_description: t.security_name || t.description || '',
        type:              t.transaction_type || t.type || '',
        amount:            t.amount || t.range || '',
        date:              t.filed_at || t.disclosure_date || '',
        traded:            t.traded_at || t.transaction_date || '',
        party:             t.party || '',
        state:             t.state || '',
        chamber:           t.chamber || '',
      }));
      return res.status(200).json({ trades: trades2, count: trades2.length, source: 'unusualwhales' });
    } catch(e2) {
      return res.status(500).json({ error: e.message, fallback_error: e2.message });
    }
  }
}
