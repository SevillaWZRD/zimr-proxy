export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800');

  try {
    // House Stock Watcher API — free public JSON
    const r = await fetch('https://housestockwatcher.com/api', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const data = await r.json();

    // Returns array, take most recent 80
    const trades = data.slice(0, 80).map(t => ({
      name:              t.representative || '',
      ticker:            t.ticker || '--',
      asset_description: t.asset_description || '',
      type:              t.type || '',
      amount:            t.amount || '',
      date:              t.disclosure_date || '',
      traded:            t.transaction_date || '',
      party:             t.party || '',
      state:             t.state || '',
      chamber:           'House',
    }));

    res.status(200).json({ trades, count: trades.length });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
