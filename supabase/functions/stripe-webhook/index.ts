// ═══════════════════════════════════════════════════════════════
// FUNCTION 1: stripe-webhook
// Handles: payment_intent.succeeded, payment_intent.payment_failed,
//          invoice.paid, invoice.payment_failed, customer.subscription.deleted
// Security: Stripe signature verification, idempotency check
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });

// Idempotency: track processed events
const processedEvents = new Set<string>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old processed events every hour
setInterval(() => {
  const cutoff = Date.now() - IDEMPOTENCY_TTL;
  // Simple cleanup — in production use Redis/Supabase for persistence
  if (processedEvents.size > 10000) {
    processedEvents.clear();
  }
}, 3600000);

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  // Idempotency check
  if (processedEvents.has(pi.id)) {
    return { status: 'already_processed' };
  }

  // Find the one-time fix
  const { data: fix } = await supabase
    .from('one_time_fixes')
    .select('id, customer_id, status')
    .eq('payment_intent_id', pi.id)
    .single();

  if (!fix) {
    console.warn(`No fix found for payment_intent ${pi.id}`);
    return { status: 'no_fix_found' };
  }

  // Update fix status
  await supabase.from('one_time_fixes').update({
    status: 'paid',
    amount_paid: (pi.amount_received || 0) / 100,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', fix.id);

  // Create incident entry
  const { data: incident } = await supabase.from('incidents').insert({
    customer_id: fix.customer_id,
    source_type: 'one_time_fix',
    source_id: fix.id,
    status: 'triage',
    priority: 'P1',
    title: `Emergency Fix #${fix.id}`,
  }).select().single();

  // Trigger AI orchestrator
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-orchestrator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ incident_id: incident?.id, trigger: 'payment_received' }),
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'one_time_fix',
    entity_id: fix.id,
    action: 'payment_succeeded',
    performed_by_type: 'system',
    new_values: { amount: (pi.amount_received || 0) / 100, incident_id: incident?.id },
    metadata: { payment_intent: pi.id, event_id: pi.id },
  });

  processedEvents.add(pi.id);
  return { status: 'processed', fix_id: fix.id, incident_id: incident?.id };
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const { data: fix } = await supabase
    .from('one_time_fixes')
    .select('id, retry_count')
    .eq('payment_intent_id', pi.id)
    .single();

  if (!fix) return { status: 'no_fix_found' };

  const retryCount = (fix.retry_count || 0) + 1;

  if (retryCount >= 3) {
    // Max retries — send dunning email
    await supabase.from('one_time_fixes').update({
      status: 'payment_failed',
      retry_count: retryCount,
      updated_at: new Date().toISOString(),
    }).eq('id', fix.id);

    // Trigger dunning email via communication-sender
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'dunning_email',
        entity_type: 'one_time_fix',
        entity_id: fix.id,
        channel: 'email',
      }),
    });
  } else {
    // Schedule retry
    await supabase.from('one_time_fixes').update({
      status: 'payment_retry',
      retry_count: retryCount,
      next_retry_at: new Date(Date.now() + retryCount * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', fix.id);
  }

  return { status: 'retry_scheduled', retry_count: retryCount };
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return { status: 'no_subscription' };

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, customer_id')
    .eq('stripe_subscription_id', subId)
    .single();

  if (!sub) return { status: 'no_local_subscription' };

  // Update subscription
  await supabase.from('subscriptions').update({
    status: 'active',
    incidents_used_this_period: 0,
    current_period_start: new Date((invoice.period_start || 0) * 1000).toISOString(),
    current_period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', sub.id);

  // Update MRR
  await supabase.rpc('update_customer_mrr', { p_customer_id: sub.customer_id });

  // Send invoice email
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'invoice_paid',
      entity_type: 'subscription',
      entity_id: sub.id,
      channel: 'email',
      metadata: { amount: (invoice.amount_paid || 0) / 100, invoice_id: invoice.id },
    }),
  });

  return { status: 'subscription_renewed' };
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await supabase.from('subscriptions').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', sub.id);

  // Trigger exit survey + win-back sequence
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'exit_survey',
      entity_type: 'subscription',
      channel: 'email',
      metadata: { stripe_subscription_id: sub.id, cancelled_at: new Date().toISOString() },
    }),
  });

  // Log churn
  await supabase.from('churn_events').insert({
    stripe_subscription_id: sub.id,
    churned_at: new Date().toISOString(),
    reason: sub.cancellation_details?.reason || 'unknown',
    feedback: sub.cancellation_details?.comment || null,
  });

  return { status: 'cancelled_logged' };
}

// ── Main Handler ──

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event: StripeEvent;

  try {
    // Verify Stripe signature in production
    if (webhookSecret && signature) {
      const verified = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      event = { id: verified.id, type: verified.type, data: verified.data as { object: Record<string, unknown> } };
    } else {
      // Dev fallback: parse without verification
      event = JSON.parse(body);
    }

    // Idempotency: check if already processed
    if (processedEvents.has(event.id)) {
      return new Response(JSON.stringify({ received: true, idempotency: 'already_processed' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let result: Record<string, unknown>;

    switch (event.type) {
      case 'payment_intent.succeeded':
        result = await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        result = await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'invoice.paid':
        result = await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subId2 = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
        if (subId2) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', subId2);
        }
        result = { status: 'past_due_marked' };
        break;
      }
      default:
        result = { status: 'unhandled_event_type', type: event.type };
    }

    processedEvents.add(event.id);

    return new Response(JSON.stringify({ received: true, event_id: event.id, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error(`[stripe-webhook] Error: ${msg}`, error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
