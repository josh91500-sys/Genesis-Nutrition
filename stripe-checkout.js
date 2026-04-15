// netlify/functions/stripe-checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST'){
    return {statusCode:405, body:'Method not allowed'};
  }

  try {
    const body = JSON.parse(event.body||'{}'); const {priceId} = body;
    if(!priceId || priceId === 'PRICE_ID_PENDING'){
      return {statusCode:400, body: JSON.stringify({error:'Price ID not configured'})};
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{price: priceId, quantity: 1}],
      mode: 'subscription',
      success_url: body.successUrl || process.env.URL+'/?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: body.cancelUrl || process.env.URL+'/?cancelled=1',
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({sessionId: session.id, url: session.url})
    };
  } catch(e){
    return {statusCode:500, body: JSON.stringify({error:e.message})};
  }
};
