exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: { message: 'API key not configured' } }) };
  }
  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: { message: 'Invalid JSON' } }) };
  }

  // Detect whether the request wants to use web_search. If so, we need to
  // include the web-search beta header. Without it, Claude silently ignores
  // the tool and won't actually search the web.
  var wantsWebSearch = false;
  if (Array.isArray(body.tools)) {
    for (var i = 0; i < body.tools.length; i++) {
      var t = body.tools[i];
      if (t && (t.type === 'web_search_20250305' || t.name === 'web_search')) {
        wantsWebSearch = true;
        break;
      }
    }
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
    if (wantsWebSearch) {
      headers['anthropic-beta'] = 'web-search-2025-03-05';
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return { statusCode: response.status, headers: corsHeaders(), body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: { message: err.message } }) };
  }
};
function corsHeaders() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
}
