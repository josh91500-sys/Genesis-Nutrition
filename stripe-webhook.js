// netlify/functions/stripe-webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch(e) {
    console.log('Webhook signature failed:', e.message);
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  switch(stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      console.log('New Pro subscriber:', customerId, subscriptionId);
      // Store in localStorage via success redirect with token
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = stripeEvent.data.object;
      console.log('Subscription cancelled:', sub.customer);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object;
      console.log('Payment failed:', invoice.customer);
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
