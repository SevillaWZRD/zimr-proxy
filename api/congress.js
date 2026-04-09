export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    const response = await fetch('https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    const latest = data.slice(0, 80);
    res.status(200).json(latest);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
