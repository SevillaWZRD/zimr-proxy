export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800');

  try {
    // Quiver Quant — free public congressional trading API
    const r = await fetch(
      'https://api.quiverquant.com/beta/live/congresstrading',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        }
      }
    );

    if (!r.ok) throw new Error('Quiver API returned ' + r.status);

    const data = await r.json();

    const trades = data.slice(0, 80).map(t => ({
      name:              t.Representative || t.Name || '',
      ticker:            t.Ticker || '--',
      asset_description: t.Security || t.Description || '',
      type:              t.Transaction || '',
      amount:            t.Range || t.Amount || '',
      date:              t.ReportDate || t.DisclosureDate || '',
      traded:            t.TransactionDate || '',
      party:             t.Party || '',
      state:             t.State || '',
      chamber:           t.Chamber || '',
    }));

    res.status(200).json({ trades, count: trades.length });

  } catch(e) {
    // Fallback: use a CORS-friendly proxy to the House Stock Watcher JSON on GitHub
    try {
      const r2 = await fetch(
        'https://raw.githubusercontent.com/ratemypolitician/house-stock-watcher-data/main/data/all_transactions.json',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data2 = await r2.json();
      const trades2 = data2.slice(0, 80).map(t => ({
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
      res.status(200).json({ trades: trades2, count: trades2.length });
    } catch(e2) {
      res.status(500).json({ error: e.message + ' | fallback: ' + e2.message });
    }
  }
}
