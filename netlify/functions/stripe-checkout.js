// netlify/functions/stripe-checkout.js
// Uses fetch instead of stripe npm package to avoid dependency issues

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 200, headers, body: '' };
  }

  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, headers, body: JSON.stringify({error:'Method not allowed'}) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const priceId = body.priceId || 'price_1TMcrPL35VL5z6ikzMkMgzKg';
    const successUrl = body.successUrl || 'https://genesisnutrition.netlify.app/?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = body.cancelUrl || 'https://genesisnutrition.netlify.app/?cancelled=1';
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if(!secretKey){
      return { statusCode: 500, headers, body: JSON.stringify({error:'Stripe key not configured'}) };
    }

    // Use Stripe API directly with fetch - no npm package needed
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'subscription');
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('allow_promotion_codes', 'true');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await response.json();

    if(!response.ok){
      return { statusCode: 500, headers, body: JSON.stringify({error: session.error?.message || 'Stripe error'}) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url })
    };

  } catch(e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
