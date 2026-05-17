const SYSTEM = `You are a shopping assistant that finds REAL product pages on Amazon and Walmart.

Given a user query (possibly with typos or vague descriptions):

STEP 1 — Interpret the query. Fix typos, clarify vague terms. Examples:
  "leathrmn" → "Leatherman Multi-Tool"
  "knee things for work" → "Knee Pads"
  "that foldy knife tool" → "Multi-Tool Pocket Knife"

STEP 2 — Use web_search to find REAL product URLs:
  - Search: "amazon.com [clean product name]" — extract amazon.com/dp/ URLs
  - Search: "walmart.com [clean product name]" — extract walmart.com/ip/ URLs
  Do 2-4 searches to get enough real product links.

STEP 3 — Return ONLY raw JSON, no markdown, no backticks, no explanation:
{
  "rawTerm": "exactly what the user typed",
  "cleanTerm": "Clean Product Name in Title Case",
  "urlTerm": "url+encoded+search+term",
  "amazon": [
    { "title": "Brand Model Key Feature (under 65 chars)", "url": "https://www.amazon.com/dp/ASIN" },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." }
  ],
  "walmart": [
    { "title": "Brand Model Key Feature (under 65 chars)", "url": "https://www.walmart.com/ip/slug/ITEMID" },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." },
    { "title": "...", "url": "..." }
  ]
}

STRICT RULES:
- Amazon URLs MUST contain /dp/ — if you can't find a real one, use https://www.amazon.com/s?k=Brand+Model
- Walmart URLs MUST contain /ip/ — if you can't find a real one, use https://www.walmart.com/search?q=Brand+Model  
- Return exactly 4 products per store
- No duplicate products
- Titles must be specific (include brand + model when possible)`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth check ──────────────────────────────────────────────────────────────
  const appPass = process.env.APP_PASS;
  if (appPass) {
    const provided = req.headers['x-app-pass'];
    if (!provided || provided !== appPass) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'No query provided' });

  // ── Claude call helper ───────────────────────────────────────────────────────
  const callClaude = (messages) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    }),
  }).then(r => r.json());

  // ── Tool loop ────────────────────────────────────────────────────────────────
  let messages = [{ role: 'user', content: String(query).trim() }];

  try {
    for (let i = 0; i < 12; i++) {
      const data = await callClaude(messages);

      if (data.error) return res.status(502).json({ error: data.error.message });

      const textBlocks   = (data.content || []).filter(b => b.type === 'text');
      const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use');

      // Done — parse final JSON response
      if (data.stop_reason === 'end_turn' || (textBlocks.length && !toolUseBlocks.length)) {
        const raw    = textBlocks.map(b => b.text).join('');
        const clean  = raw.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(clean);

        if (!parsed.cleanTerm || !Array.isArray(parsed.amazon) || !Array.isArray(parsed.walmart)) {
          return res.status(502).json({ error: 'Unexpected response structure from model.' });
        }

        res.setHeader('Cache-Control', 'no-store');
        return res.json(parsed);
      }

      // Tool use — add assistant turn + empty tool results, continue loop
      if (data.stop_reason === 'tool_use' && toolUseBlocks.length) {
        messages.push({ role: 'assistant', content: data.content });

        const toolResults = toolUseBlocks.map(b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: b.input?.query
            ? `Searched for: ${b.input.query}`
            : 'Search executed.',
        }));

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop — return what we have if any text exists
      if (textBlocks.length) {
        const raw   = textBlocks.map(b => b.text).join('');
        const clean = raw.replace(/```json|```/gi, '').trim();
        return res.json(JSON.parse(clean));
      }

      break;
    }

    return res.status(502).json({ error: 'Model did not return a result after search loop.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
