export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800');

  try {
    // Senate Stock Watcher — open public API, no key needed
    const r = await fetch(
      'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions_for_senators.json',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );

    const text = await r.text();
    const data = JSON.parse(text);

    // data is array of senators, each with transactions[]
    const trades = [];
    for (const senator of data) {
      for (const t of (senator.transactions || [])) {
        trades.push({
          name:              senator.senator || '',
          ticker:            t.ticker || '--',
          asset_description: t.asset_description || '',
          type:              t.type || '',
          amount:            t.amount || '',
          date:              t.disclosure_date || t.date || '',
          traded:            t.transaction_date || '',
          party:             senator.party || '',
          state:             senator.state || '',
          chamber:           'Senate',
        });
      }
    }

    // Sort by date descending, take 80 most recent
    trades.sort((a, b) => (b.date > a.date ? 1 : -1));

    res.status(200).json({ trades: trades.slice(0, 80), count: trades.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
