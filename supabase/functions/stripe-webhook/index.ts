// UptimeOps — Stripe Webhook Handler
// Processes payment_intent.succeeded, payment_intent.payment_failed, invoice.* events

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';

const FUNCTION = 'stripe-webhook';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature header');

    const body = await req.text();
    const event = JSON.parse(body);

    logInfo(FUNCTION, `Received ${event.type}`, { id: event.id });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
        logInfo(FUNCTION, `Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Webhook processing failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
