export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    const response = await fetch('https://www.capitoltrades.com/trades?pageSize=80', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();

    // Extract __NUXT_DATA__ or next/data JSON embedded in the page
    let trades = [];

    // Try to find JSON data embedded in script tags
    const nuxtMatch = html.match(/<script[^>]*>\s*window\.__NUXT__\s*=\s*({.*?})\s*<\/script>/s);
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

    if (nextMatch) {
      try {
        const data = JSON.parse(nextMatch[1]);
        const pageData = data?.props?.pageProps;
        trades = pageData?.trades || pageData?.data || [];
      } catch(e) {}
    }

    // Fallback: scrape table rows from HTML
    if (!trades.length) {
      // Match trade rows — Capitol Trades renders a table
      const rowRegex = /<tr[^>]*class="[^"]*trade[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

      let rowMatch;
      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const row = rowMatch[1];
        const cells = [];
        let cellMatch;
        const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        while ((cellMatch = cellRe.exec(row)) !== null) {
          cells.push(stripTags(cellMatch[1]));
        }
        if (cells.length >= 4) {
          trades.push({
            name: cells[0] || '',
            ticker: cells[1] || '',
            type: cells[2] || '',
            amount: cells[3] || '',
            date: cells[4] || '',
            traded: cells[5] || '',
          });
        }
      }
    }

    // If still nothing, try to find any JSON-LD or embedded data
    if (!trades.length) {
      const jsonMatch = html.match(/\\"trades\\":\[(.*?)\]/s);
      if (jsonMatch) {
        try {
          trades = JSON.parse('[' + jsonMatch[1].replace(/\\"/g, '"') + ']');
        } catch(e) {}
      }
    }

    // Last resort: use House Stock Watcher API (always works, free)
    if (!trades.length) {
      const fallback = await fetch('https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const fallbackData = await fallback.json();
      // Return most recent 80
      trades = fallbackData.slice(0, 80).map(t => ({
        name: t.representative || '',
        ticker: t.ticker || '',
        type: t.type || '',
        amount: t.amount || '',
        date: t.disclosure_date || t.date || '',
        traded: t.transaction_date || '',
        party: t.party || '',
        state: t.state || '',
        asset_description: t.asset_description || '',
        chamber: 'House',
      }));
    }

    res.status(200).json({ trades, source: 'zimr-proxy', count: trades.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
