// UptimeOps — Webhook Alert Handler
// Processes external monitoring webhooks (Datadog, PagerDuty, custom) and creates incidents

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

// ── Guard: require secrets ──
function requireSecret(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`${name} not set in Supabase Edge Function Secrets`);
  return val;
}

const FUNCTION = 'webhook-alert';

function detectPriority(title: string, severity?: string): string {
  if (severity === 'critical' || /critical|p1|down|outage/.test(title.toLowerCase())) return 'P1_CRITICAL';
  if (severity === 'warning' || /high|p2|error|fail/.test(title.toLowerCase())) return 'P2_HIGH';
  return 'P3_MEDIUM';
}

function extractWebsite(text: string): string | null {
  const match = text.match(/(?:https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*\.[-a-zA-Z0-9.]+[a-zA-Z0-9])/);
  return match ? match[1] : null;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload = await req.json().catch(() => ({}));
    const source = req.headers.get('x-alert-source') || 'unknown';
    const supabase = getSupabaseClient(req);

    logInfo(FUNCTION, 'Alert received', { source, alert_id: payload.id || payload.alert_id || 'unknown' });

    // Normalize alert from different sources
    let title: string;
    let description: string;
    let severity: string;
    let website: string | null;
    let customerIdentifier: string | null;

    switch (source) {
      case 'datadog':
        title = payload.title || 'Datadog Alert';
        description = payload.message || payload.body || JSON.stringify(payload);
        severity = payload.alert_type || 'warning';
        website = extractWebsite(title + ' ' + description);
        customerIdentifier = payload.tags?.find((t: string) => t.startsWith('customer:'))?.split(':')[1] || null;
        break;
      case 'pagerduty':
        title = payload.incident?.title || 'PagerDuty Alert';
        description = payload.incident?.description || payload.incident?.summary || JSON.stringify(payload);
        severity = payload.incident?.urgency || 'high';
        website = extractWebsite(title + ' ' + description);
        customerIdentifier = null;
        break;
      default:
        title = payload.title || payload.message || payload.alert_name || 'External Alert';
        description = payload.description || payload.body || payload.details || JSON.stringify(payload);
        severity = payload.severity || payload.priority || 'medium';
        website = payload.website_url || extractWebsite(title + ' ' + description);
        customerIdentifier = payload.customer_id || null;
    }

    // Find customer
    let customerId: string | null = customerIdentifier;
    if (!customerId && website) {
      const { data: customer } = await supabase.from('customers')
        .select('id').ilike('website', `%${website}%`).limit(1).single();
      if (customer) customerId = customer.id;
    }

    // If no customer found, create as unassigned lead incident
    if (!customerId) {
      // Create a placeholder customer record for the lead
      const { data: placeholderCustomer } = await supabase.from('customers').insert({
        email: `alert-${Date.now()}@uptimeops.com`,
        website: website || 'unknown',
        status: 'lead',
        plan: 'guardian',
        mrr: 0,
      }).select().single();
      if (!placeholderCustomer?.id) {
        logError(FUNCTION, 'Failed to create placeholder customer for unassigned alert');
        return new Response(JSON.stringify({ error: 'Could not create placeholder customer' }), { status: 500, headers: corsHeaders });
      }
      customerId = placeholderCustomer.id;
    }

    const priority = detectPriority(title, severity);

    // Create incident
    const { data: incident } = await supabase.from('incidents').insert({
      customer_id: customerId,
      source_type: 'subscription',
      title,
      description,
      website_url: website,
      status: 'triage',
      priority: priority as any,
    }).select().single();

    // Trigger AI orchestrator
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incident?.id }),
      });
    } catch (e) {
      logError(FUNCTION, 'Failed to trigger AI orchestrator', e);
    }

    logInfo(FUNCTION, 'Incident created from alert', { incident_id: incident?.id, priority, customer_id: customerId });

    return new Response(JSON.stringify({
      incident_created: true,
      incident_id: incident?.id,
      priority,
      customer_id: customerId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    logError(FUNCTION, 'Alert processing failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});

