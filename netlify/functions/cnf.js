exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Cache-Control':'public, max-age=86400'};
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const params = event.queryStringParameters || {};
  const endpoint = params.endpoint || 'food';
  const id = params.id || '';
  if (!['food','nutrientamount','nutrientname'].includes(endpoint)) return { statusCode: 400, headers, body: '{"error":"bad"}' };
  try {
    let url = `https://food-nutrition.canada.ca/api/canadian-nutrient-file/${endpoint}/?lang=en&type=json`;
    if (id) url += `&id=${encodeURIComponent(id)}`;
    const res = await fetch(url);
    const text = await res.text();
    return { statusCode: 200, headers, body: text };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({error: err.message}) };
  }
};