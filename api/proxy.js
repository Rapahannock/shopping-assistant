export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'No query provided' });

  const SYSTEM = `You are a shopping assistant that interprets product search queries and returns structured results.

Given a user's query (which may contain typos, vague descriptions, or brain fog phrasing), you must:
1. Interpret the actual product they want
2. Return 4 real Amazon product URLs and 4 real Walmart product URLs

Return ONLY raw JSON — no markdown, no backticks, no explanation whatsoever.

Required format:
{
  "rawTerm": "exactly what the user typed",
  "cleanTerm": "Clean Specific Product Name in Title Case",
  "urlTerm": "clean+url+encoded+search+term",
  "amazon": [
    { "title": "Brand + Model + Key Feature (concise)", "url": "https://www.amazon.com/dp/ASIN_HERE" },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." }
  ],
  "walmart": [
    { "title": "Brand + Model + Key Feature (concise)", "url": "https://www.walmart.com/ip/Product-Slug/ITEM_ID" },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." }
  ]
}

Rules:
- For Amazon: use real ASINs you know (10-char codes like B09MSMWMRH). If unsure of a specific ASIN, use https://www.amazon.com/s?k=Brand+Model+specific+product instead.
- For Walmart: use real item IDs you know (walmart.com/ip/Slug/1234567890). If unsure, use https://www.walmart.com/search?q=Brand+Model+specific+product instead.
- Titles must be short — max 60 characters, cut off with "..." if needed.
- Always return exactly 4 items per store.
- Never return placeholder or fake URLs.`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM,
        messages: [{ role: 'user', content: String(query).trim() }],
      }),
    });

    const data = await apiRes.json();
    if (data.error) return res.status(502).json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || '').join('');
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate shape
    if (!parsed.cleanTerm || !Array.isArray(parsed.amazon) || !Array.isArray(parsed.walmart)) {
      return res.status(502).json({ error: 'Unexpected response shape from model' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
