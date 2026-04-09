export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    const response = await fetch('https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json');
    const data = await response.json();
    const latest = data.slice(0, 80).map(t => ({
      name: t.representative || 'Unknown',
      party: t.party || '',
      chamber: 'House',
      ticker: t.ticker || '—',
      company: t.asset_description || '',
      action: (t.type || '').toLowerCase().includes('purchase') ? 'buy' : 'sell',
      amount: t.amount || '—',
      tradeDate: t.transaction_date || '—',
      filedDate: t.disclosure_date || '—',
    }));
    res.status(200).json(latest);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
