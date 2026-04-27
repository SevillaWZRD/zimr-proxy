export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const feedUrl = req.query.feed;
  if (!feedUrl) return res.status(400).json({ error: 'Missing feed param' });

  try {
    // First try rss2json
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=20`;
    const r = await fetch(rss2jsonUrl, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('rss2json HTTP ' + r.status);
    const data = await r.json();
    if (data.items && data.items.length) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json(data);
    }
    throw new Error('empty');
  } catch (err) {
    // Fallback: fetch raw RSS and return as items array
    try {
      const rawR = await fetch(feedUrl);
      if (!rawR.ok) throw new Error('raw HTTP ' + rawR.status);
      const xml = await rawR.text();

      // Parse RSS items from XML
      const items = [];
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = (block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
        const link  = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/) ||
                       block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1] || '';
        const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
        if (title && link) {
          items.push({
            title: title.replace(/<[^>]+>/g, '').trim(),
            link: link.trim(),
            pubDate: pubDate.trim()
          });
        }
      }
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({ items });
    } catch (err2) {
      return res.status(500).json({ error: err2.message });
    }
  }
}
