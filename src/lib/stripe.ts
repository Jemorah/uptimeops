// ═══════════════════════════════════════════════════════════════
// STRIPE CLIENT — UptimeOps
// Loads Stripe.js from CDN to avoid npm install issues on Vercel
// ═══════════════════════════════════════════════════════════════

import { STRIPE_KEY } from './constants';

// Add Stripe.js script to document if not present
function loadStripeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Stripe) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });
}

async function getStripeInstance(): Promise<any> {
  await loadStripeScript();
  const Stripe = (window as any).Stripe;
  if (!Stripe) throw new Error('Stripe.js not available');
  return Stripe(STRIPE_KEY);
}

export async function createCheckoutSession(
  planType: 'guardian' | 'sentinel' | 'fortress',
  billingCycle: 'monthly' | 'yearly'
) {
  const stripe = await getStripeInstance();

  const productId = billingCycle === 'yearly'
    ? (planType === 'guardian' ? 'price_guardian_yearly' : planType === 'sentinel' ? 'price_sentinel_yearly' : 'price_fortress_yearly')
    : (planType === 'guardian' ? 'price_guardian_monthly' : planType === 'sentinel' ? 'price_sentinel_monthly' : 'price_fortress_monthly');

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: productId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/#/customer?success=true`,
    cancelUrl: `${window.location.origin}/#/pricing?canceled=true`,
  });

  if (error) throw error;
}

export async function createOneTimeCheckout(fixType: 'rapid' | 'critical' | 'catastrophic') {
  const stripe = await getStripeInstance();

  const productId = fixType === 'rapid' ? 'price_rapid_fix'
    : fixType === 'critical' ? 'price_critical_fix'
    : 'price_catastrophic_fix';

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: productId, quantity: 1 }],
    mode: 'payment',
    successUrl: `${window.location.origin}/#/emergency?success=true`,
    cancelUrl: `${window.location.origin}/#/emergency?canceled=true`,
  });

  if (error) throw error;
}
