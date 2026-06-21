// api/cmc.js  —  ZIMR proxy
// Runs a CMC Skill Hub skill over MCP (Streamable HTTP), then formats the
// result with Claude. Keys come from Vercel env vars, never from the request.
//
// Env required (set in Vercel → Settings → Environment Variables):
//   CMC_MCP_API_KEY   — your CoinMarketCap Skill Hub key
//   ANTHROPIC_API_KEY — your Claude key (already present)
//
// Request body from the dashboard:
//   {
//     skill:      "daily_market_overview",   // CMC unique_name (required)
//     parameters: { preview: true },         // skill params (optional)
//     system:     "voice / format rules",    // how Claude should write it
//     question:   "Give the daily read",      // user-facing ask (optional)
//     model:      "claude-sonnet-4-20250514", // optional
//     max_tokens: 1200                         // optional
//   }
//
// Response: Anthropic-shaped { content:[{type:'text',text:'...'}], skill_raw:'...' }

export const maxDuration = 60; // Vercel Hobby cap. Heavy skills may need Pro (300).

const MCP_ENDPOINT = 'https://mcp.coinmarketcap.com/skill-hub/stream';
const MCP_PROTOCOL = '2025-06-18';

// --- parse a Streamable-HTTP / SSE-framed JSON-RPC response into an object ---
function parseMcpBody(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  // event-stream framing: lines like "event: message" / "data: {json}"
  if (trimmed.includes('data:')) {
    const chunks = [];
    for (const line of trimmed.split(/\r?\n/)) {
      if (line.startsWith('data:')) chunks.push(line.slice(5).trim());
    }
    const joined = chunks.join('');
    if (joined) { try { return JSON.parse(joined); } catch (e) {} }
  }
  try { return JSON.parse(trimmed); } catch (e) { return null; }
}

// --- one JSON-RPC POST to the MCP server ---
async function mcpPost(payload, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'X-CMC-MCP-API-KEY': process.env.CMC_MCP_API_KEY,
    'MCP-Protocol-Version': MCP_PROTOCOL
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const r = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const text = await r.text();
  return {
    ok: r.ok,
    status: r.status,
    sessionId: r.headers.get('mcp-session-id') || sessionId,
    json: parseMcpBody(text),
    text
  };
}

// --- full MCP run: initialize → initialized → tools/call execute_skill ---
async function runSkill(skill, parameters) {
  // 1) initialize
  const init = await mcpPost({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'zimr-proxy', version: '1.0.0' }
    }
  });
  if (!init.ok || (init.json && init.json.error)) {
    throw new Error('MCP initialize failed: ' + (init.json?.error?.message || init.status));
  }
  const session = init.sessionId;

  // 2) initialized notification (no id)
  await mcpPost({ jsonrpc: '2.0', method: 'notifications/initialized' }, session);

  // 3) execute the skill
  const call = await mcpPost({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: {
      name: 'execute_skill',
      arguments: { unique_name: skill, parameters: parameters || {} }
    }
  }, session);

  if (call.json && call.json.error) {
    throw new Error('Skill error: ' + call.json.error.message);
  }
  const result = call.json && call.json.result;
  if (!result) throw new Error('No result from skill (status ' + call.status + ')');

  // pull all text out of the MCP content blocks
  const blocks = Array.isArray(result.content) ? result.content : [];
  const textOut = blocks
    .filter(b => b && (b.type === 'text' || typeof b.text === 'string'))
    .map(b => b.text).join('\n').trim();

  return textOut || JSON.stringify(result);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.CMC_MCP_API_KEY) {
    return res.status(500).json({ error: 'CMC_MCP_API_KEY not set in Vercel' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { skill, parameters, system, question, model, max_tokens } = body;
    if (!skill) return res.status(400).json({ error: 'Missing "skill"' });

    // 1) get the real data from the CMC Skill Hub
    const skillData = await runSkill(skill, parameters);

    // 2) hand it to Claude with the requested voice / format
    const userContent =
      (question ? question + '\n\n' : '') +
      'Use only the skill data below. If a value is not present, say so plainly.\n\n' +
      'SKILL DATA:\n' + skillData;

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1200,
        system: system || 'You are the ZIMR Capital desk agent. Write a direct, precise crypto read in plain language. No hype, no em dashes, no bullet points. End with one line: not financial advice.',
        messages: [{ role: 'user', content: userContent }]
      })
    });
    const aiData = await aiResp.json();
    if (aiData && !aiData.error) aiData.skill_raw = skillData; // keep raw data for debugging
    return res.status(aiResp.status).json(aiData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
