// UptimeOps — Stripe Webhook Handler
// Verifies stripe-signature, processes payment events

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'stripe-webhook';

// HMAC-SHA256 signature verification for Stripe webhooks
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sigHash = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !sigHash) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === sigHash;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature header');

    const body = await req.text();

    // Verify signature with STRIPE_WEBHOOK_SECRET
    const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (stripeSecret) {
      const valid = await verifyStripeSignature(body, signature, stripeSecret);
      if (!valid) {
        logError(FUNCTION, 'Invalid stripe-signature', null);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(body);
    logInfo(FUNCTION, `Received ${event.type}`, { id: event.id });

    const supabase = getSupabaseClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await supabase.from('one_time_fixes')
          .update({ status: 'paid', amount_paid: pi.amount_received / 100, paid_at: new Date().toISOString() })
          .eq('payment_intent_id', pi.id);

        await supabase.from('audit_logs').insert({
          table_name: 'one_time_fixes', entity_type: 'payment', entity_id: pi.id,
          action: 'payment_succeeded', performed_by_type: 'stripe',
          new_values: { amount: pi.amount_received },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const fix = await supabase.from('one_time_fixes').select('retry_count').eq('payment_intent_id', pi.id).single();
        const retries = (fix.data?.retry_count || 0) + 1;

        await supabase.from('one_time_fixes')
          .update({
            status: retries >= 3 ? 'payment_failed' : 'payment_pending',
            retry_count: retries,
            next_retry_at: retries < 3 ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          })
          .eq('payment_intent_id', pi.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase.from('subscriptions')
            .update({ status: 'active', current_period_end: new Date(invoice.lines.data[0]?.period?.end * 1000).toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase.from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription);

          await supabase.from('customers')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('stripe_subscription_id', sub.id);
        await supabase.from('churn_events').insert({
          stripe_subscription_id: sub.id,
          customer_id: (await supabase.from('customers').select('id').eq('stripe_subscription_id', sub.id).single()).data?.id,
          reason: 'subscription_cancelled',
        });
        break;
      }

      default:
        logInfo(FUNCTION, `Unhandled event type`, { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
