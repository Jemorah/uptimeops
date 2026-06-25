// ═══════════════════════════════════════════════════════════════
// FUNCTION 7: subscription-manager
// Cron: Daily check — renewals, reminders, pauses, MRR updates
// Incident allowance reset on billing period start
// Churn prediction, at-risk flagging
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ManagerPayload {
  action: 'daily_cron' | 'reset_allowance' | 'churn_check' | 'mrr_update' | 'overage_check';
  subscription_id?: string;
  customer_id?: string;
}

// Plan incident allowances
const PLAN_ALLOWANCES: Record<string, number> = {
  guardian: 3,
  sentinel: 10,
  fortress: 999,
};

async function dailyCron() {
  const results: Record<string, unknown> = {};
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Check upcoming renewals (next 3 days)
  const { data: upcomingRenewals } = await supabase
    .from('subscriptions')
    .select('id, customer_id, current_period_end, plan, incidents_used_this_period')
    .eq('status', 'active')
    .lte('current_period_end', tomorrow.toISOString())
    .gte('current_period_end', now.toISOString());

  for (const sub of upcomingRenewals || []) {
    // Send renewal reminder
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'renewal_reminder',
        entity_type: 'subscription',
        entity_id: sub.id,
        channel: 'email',
        metadata: { period_end: sub.current_period_end, plan: sub.plan },
      }),
    });
  }
  results.upcoming_renewals = upcomingRenewals?.length || 0;

  // 2. Reset allowances for subscriptions starting new period
  const { data: newPeriodSubs } = await supabase
    .from('subscriptions')
    .select('id, plan')
    .eq('status', 'active')
    .lte('current_period_start', now.toISOString())
    .gt('current_period_start', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  for (const sub of newPeriodSubs || []) {
    const allowance = PLAN_ALLOWANCES[sub.plan.toLowerCase()] || 3;
    await supabase.from('subscriptions').update({
      incidents_used_this_period: 0,
      incidents_allowance: allowance,
    }).eq('id', sub.id);
  }
  results.allowances_reset = newPeriodSubs?.length || 0;

  // 3. Update MRR for all active customers
  const { data: mrrData } = await supabase.rpc('calculate_all_mrr');
  results.mrr_updated = mrrData;

  // 4. Check paused subscriptions (pause ends today)
  const { data: unpausing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('status', 'paused')
    .lte('pause_end_date', now.toISOString());

  for (const sub of unpausing || []) {
    await supabase.from('subscriptions').update({
      status: 'active',
      pause_end_date: null,
    }).eq('id', sub.id);
  }
  results.unpaused = unpausing?.length || 0;

  // 5. At-risk flagging
  const { data: atRisk } = await supabase
    .from('subscriptions')
    .select('id, customer_id, incidents_used_this_period, incidents_allowance, plan')
    .eq('status', 'active')
    .gt('incidents_used_this_period', 0);

  const overUsageCustomers: string[] = [];
  for (const sub of atRisk || []) {
    const ratio = sub.incidents_used_this_period / (sub.incidents_allowance || 1);
    if (ratio >= 0.8) {
      overUsageCustomers.push(sub.customer_id);
      // Send overage alert
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'overage_alert',
          entity_type: 'subscription',
          entity_id: sub.id,
          channel: 'email',
          metadata: {
            used: sub.incidents_used_this_period,
            allowance: sub.incidents_allowance,
            ratio: Math.round(ratio * 100),
          },
        }),
      });
    }
  }
  results.over_usage_alerts = overUsageCustomers.length;

  return { success: true, date: now.toISOString(), ...results };
}

async function resetAllowance(subscriptionId: string) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('id', subscriptionId)
    .single();

  if (!sub) return { success: false, error: 'Subscription not found' };

  const allowance = PLAN_ALLOWANCES[sub.plan.toLowerCase()] || 3;
  await supabase.from('subscriptions').update({
    incidents_used_this_period: 0,
    incidents_allowance: allowance,
    current_period_start: new Date().toISOString(),
  }).eq('id', subscriptionId);

  return { success: true, allowance, plan: sub.plan };
}

async function churnCheck() {
  // Simple churn prediction: high incidents + low engagement
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, customer_id, incidents_used_this_period, created_at')
    .eq('status', 'active');

  const churnRisk: Array<{ customer_id: string; risk_score: number; reasons: string[] }> = [];

  for (const sub of subs || []) {
    const reasons: string[] = [];
    let score = 0;

    // High incident usage
    if (sub.incidents_used_this_period > 5) {
      score += 30;
      reasons.push('high_incident_usage');
    }

    // Account age (new accounts more likely to churn)
    const ageDays = Math.floor((Date.now() - new Date(sub.created_at).getTime()) / 86400000);
    if (ageDays < 14) {
      score += 20;
      reasons.push('new_account');
    }

    if (score >= 40) {
      churnRisk.push({ customer_id: sub.customer_id, risk_score: score, reasons });

      // Flag in database
      await supabase.from('customers').update({
        churn_risk_score: score,
        churn_risk_reasons: reasons,
      }).eq('id', sub.customer_id);
    }
  }

  return { success: true, at_risk_count: churnRisk.length, customers: churnRisk };
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: ManagerPayload = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'daily_cron':
        result = await dailyCron();
        break;
      case 'reset_allowance':
        if (!payload.subscription_id) {
          return new Response(JSON.stringify({ error: 'Missing subscription_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        result = await resetAllowance(payload.subscription_id);
        break;
      case 'churn_check':
        result = await churnCheck();
        break;
      case 'mrr_update':
        const { data: mrr } = await supabase.rpc('calculate_all_mrr');
        result = { success: true, mrr };
        break;
      case 'overage_check': {
        const { data: overage } = await supabase
          .from('subscriptions')
          .select('id, customer_id, incidents_used_this_period, incidents_allowance')
          .eq('status', 'active')
          .gt('incidents_used_this_period', 0);
        const over = (overage || []).filter(s => s.incidents_used_this_period >= (s.incidents_allowance || 3));
        result = { success: true, overage_count: over.length, customers: over };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
