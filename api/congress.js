export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const response = await fetch('https://api.quiverquant.com/beta/live/congresstrading', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: 'fetch failed' });
  }
}
