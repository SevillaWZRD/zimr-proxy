export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120');

  try {
    // Fetch more than we need so we can filter
    const r = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=150&active=true&order=volume24hr&ascending=false&closed=false',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!r.ok) throw new Error('Polymarket API: ' + r.status);
    const data = await r.json();

    const now = new Date();

    const filtered = data
      .filter(m => {
        // Must have an end date in the future
        if (!m.endDate) return false;
        const end = new Date(m.endDate);
        if (end <= now) return false;

        // Must have meaningful volume
        const vol = parseFloat(m.volume24hr || 0);
        if (vol < 1000) return false;

        // Must have a real question
        if (!m.question || m.question.length < 5) return false;

        return true;
      })
      .slice(0, 60); // return top 60 after filtering

    res.status(200).json(filtered);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
