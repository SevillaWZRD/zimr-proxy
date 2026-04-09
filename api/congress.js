export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');

  try {
    const response = await fetch('https://www.capitoltrades.com/trades?pageSize=80', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const text = await response.text();
    res.status(200).send(text);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
