// ═══════════════════════════════════════════════════════════════
// WEBHOOK: Stripe Payment Events
// Handles: payment_intent.succeeded, payment_intent.payment_failed
//          invoice.paid, invoice.payment_failed, subscription events
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export default async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  try {
    // In production: verify signature with Stripe library
    const event = JSON.parse(body);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // Update one-time fix to paid
        const { data: fix } = await supabase
          .from('one_time_fixes')
          .select('id, customer_id')
          .eq('payment_intent_id', pi.id)
          .single();

        if (fix) {
          await supabase.from('one_time_fixes').update({
            status: 'paid',
            amount_paid: pi.amount_received / 100,
            updated_at: new Date().toISOString(),
          }).eq('id', fix.id);

          // Auto-trigger TRIAGE
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-triage`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fix_id: fix.id, type: 'one_time_fix' }),
          });

          // Log
          await supabase.from('audit_logs').insert({
            entity_type: 'one_time_fix',
            entity_id: fix.id,
            action: 'payment_received',
            performed_by_type: 'system',
            metadata: { amount: pi.amount_received / 100, payment_intent: pi.id },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await supabase.from('one_time_fixes')
          .update({ status: 'pending_payment', updated_at: new Date().toISOString() })
          .eq('payment_intent_id', pi.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        // Update subscription period
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (sub) {
          await supabase.from('subscriptions').update({
            status: 'active',
            incidents_used_this_period: 0,
            current_period_start: new Date(invoice.period_start * 1000).toISOString(),
            current_period_end: new Date(invoice.period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await supabase.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
