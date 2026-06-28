// UptimeOps — Subscription Manager
// Handles plan changes, pause/resume, incident allowance, MRR recalculation, dunning

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'subscription-manager';

const PLAN_CONFIGS: Record<string, { price_cents: number; incidents: number }> = {
  guardian: { price_cents: 9900, incidents: 3 },
  sentinel: { price_cents: 24900, incidents: 10 },
  fortress: { price_cents: 59900, incidents: 999 },
};

serve(async (req) => {
  logInfo(FUNCTION, 'Request received');
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, customer_id, plan, pause_days } = body;
    const supabase = getSupabaseClient(req);

    // Daily cron: dunning, allowance checks, renewal reminders
    if (action === 'daily_cron') {
      // Flag subscriptions nearing allowance limit
      const { data: nearingLimit } = await supabase.from('subscriptions')
        .select('*, customers(email, full_name)')
        .eq('status', 'active')
        .gte('incidents_used_this_period', supabase.rpc('get_incidents_allowance'));
      return new Response(JSON.stringify({ cron: 'ok', checked: nearingLimit?.length || 0 }), { headers: corsHeaders });
    }

    // Change plan
    if (action === 'change_plan') {
      if (!customer_id || !plan) return new Response(JSON.stringify({ error: 'customer_id and plan required' }), { status: 400, headers: corsHeaders });
      const config = PLAN_CONFIGS[plan];
      if (!config) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: corsHeaders });

      await supabase.from('subscriptions')
        .update({ plan, price_cents: config.price_cents, incidents_allowance: config.incidents })
        .eq('customer_id', customer_id);

      await supabase.from('customers')
        .update({ plan, subscription_status: 'active' })
        .eq('id', customer_id);

      // Recalculate MRR
      await supabase.rpc('update_customer_mrr', { p_customer_id: customer_id });
      return new Response(JSON.stringify({ changed: true, plan, price_cents: config.price_cents }), { headers: corsHeaders });
    }

    // Pause subscription
    if (action === 'pause') {
      if (!customer_id) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });
      const pauseEnd = new Date();
      pauseEnd.setDate(pauseEnd.getDate() + (pause_days || 30));

      await supabase.from('subscriptions')
        .update({ status: 'paused', pause_start: new Date().toISOString(), pause_end: pauseEnd.toISOString() })
        .eq('customer_id', customer_id);

      await supabase.from('customers')
        .update({ subscription_status: 'paused' })
        .eq('id', customer_id);

      return new Response(JSON.stringify({ paused: true, until: pauseEnd.toISOString() }), { headers: corsHeaders });
    }

    // Resume subscription
    if (action === 'resume') {
      if (!customer_id) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });

      await supabase.from('subscriptions')
        .update({ status: 'active', pause_start: null, pause_end: null })
        .eq('customer_id', customer_id);

      await supabase.from('customers')
        .update({ subscription_status: 'active' })
        .eq('id', customer_id);

      return new Response(JSON.stringify({ resumed: true }), { headers: corsHeaders });
    }

    // Get subscription details
    if (action === 'get' && customer_id) {
      const { data: subscription } = await supabase.from('subscriptions')
        .select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1).single();

      const { data: customer } = await supabase.from('customers')
        .select('plan, incidents_used, incidents_allowance, mrr, subscription_status').eq('id', customer_id).single();

      return new Response(JSON.stringify({ subscription, customer }), { headers: corsHeaders });
    }

    // Calculate MRR
    if (action === 'calculate_mrr') {
      const { data: result } = await supabase.rpc('calculate_all_mrr');
      return new Response(JSON.stringify({ mrr: result }), { headers: corsHeaders });
    }

    // Increment incident usage
    if (action === 'increment_usage') {
      if (!customer_id) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });

      await supabase.rpc('update_customer_mrr', { p_customer_id: customer_id });
      const { data: sub } = await supabase.from('subscriptions')
        .select('incidents_used_this_period, incidents_allowance').eq('customer_id', customer_id)
        .order('created_at', { ascending: false }).limit(1).single();

      if (sub && sub.incidents_used_this_period >= sub.incidents_allowance) {
        await supabase.from('communications_log').insert({
          customer_id, type: 'overage_alert', channel: 'email',
          subject: '[UptimeOps] Incident Allowance Reached',
          body: 'You have used all incidents in your current period. Upgrade your plan for more.',
        });
      }

      return new Response(JSON.stringify({ incremented: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    logError(FUNCTION, \'Request failed\', err);;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
