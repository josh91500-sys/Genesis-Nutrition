// netlify/functions/stripe-checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST'){
    return {statusCode:405, body:'Method not allowed'};
  }

  try {
    const body = JSON.parse(event.body||'{}');
    const priceId = body.priceId || 'price_1TMcrPL35VL5z6ikzMkMgzKg';
    const successUrl = body.successUrl || 'https://genesisnutrition.netlify.app/?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = body.cancelUrl || 'https://genesisnutrition.netlify.app/?cancelled=1';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{price: priceId, quantity: 1}],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
      body: JSON.stringify({url: session.url})
    };
  } catch(e){
    console.log('Stripe error:', e.message);
    return {
      statusCode: 500,
      headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
      body: JSON.stringify({error: e.message})
    };
  }
};
