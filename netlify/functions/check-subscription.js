// Netlify function to verify if an email has an active Stripe subscription
// Deploy at: netlify/functions/check-subscription.js

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
    }

    // 1. Find customer by email
    const customerRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const customerData = await customerRes.json();

    if (!customerData.data || customerData.data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ active: false, reason: 'No customer found' }) };
    }

    const customerId = customerData.data[0].id;

    // 2. Check for active subscription
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const subData = await subRes.json();

    const hasActiveSub = subData.data && subData.data.length > 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        active: hasActiveSub,
        customerId: hasActiveSub ? customerId : null,
      }),
    };
  } catch (err) {
    console.error('check-subscription error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
