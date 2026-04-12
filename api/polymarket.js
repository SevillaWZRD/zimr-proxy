export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  try {
    const r = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=60&active=true&order=volume24hr&ascending=false&closed=false',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!r.ok) throw new Error('Polymarket API: ' + r.status);
    const data = await r.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
