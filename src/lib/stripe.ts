// ═══════════════════════════════════════════════════════════════
// STRIPE CLIENT — UptimeOps
// Lazy-loads Stripe.js to avoid build dependency issues
// ═══════════════════════════════════════════════════════════════

import { STRIPE_KEY } from './constants';

let stripePromise: Promise<any> | null = null;

export async function getStripe(): Promise<any> {
  if (!stripePromise) {
    // Dynamic import avoids build-time dependency on @stripe/stripe-js
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(STRIPE_KEY);
  }
  return stripePromise;
}

export async function createCheckoutSession(planType: 'guardian' | 'sentinel' | 'fortress', billingCycle: 'monthly' | 'yearly') {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe not initialized');

  const productId = billingCycle === 'yearly'
    ? (planType === 'guardian' ? 'prod_Um9dAynxxwolzX' : planType === 'sentinel' ? 'prod_Um9gZlxDs7fk4l' : 'prod_Um9huwzGFCJaBa')
    : (planType === 'guardian' ? 'prod_Um79wEliQGos8X' : planType === 'sentinel' ? 'prod_Um7AYtqRId4owu' : 'prod_Um7Bx7cqfF4MvC');

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: productId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/#/customer?success=true`,
    cancelUrl: `${window.location.origin}/#/pricing?canceled=true`,
  });

  if (error) throw error;
}

export async function createOneTimeCheckout(fixType: 'rapid' | 'critical' | 'catastrophic') {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe not initialized');

  const productId = fixType === 'rapid' ? 'prod_Um718W8HxLu5q0'
    : fixType === 'critical' ? 'prod_Um74N2ScOrpsh0'
    : 'prod_Um75fvmmmJ9tTN';

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: productId, quantity: 1 }],
    mode: 'payment',
    successUrl: `${window.location.origin}/#/emergency?success=true`,
    cancelUrl: `${window.location.origin}/#/emergency?canceled=true`,
  });

  if (error) throw error;
}
