// ═══════════════════════════════════════════════════════════════
// WEBHOOK: External Monitoring & Alert Integration
// Handles: Uptime monitoring alerts (Pingdom, UptimeRobot, etc.)
//          Security alerts (Snyk, Dependabot)
//          Custom customer webhooks
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface AlertPayload {
  source: 'pingdom' | 'uptimerobot' | 'snyk' | 'custom';
  website_url: string;
  alert_type: 'down' | 'degraded' | 'security' | 'performance';
  severity?: 'p1_critical' | 'p2_high' | 'p3_medium' | 'p4_low';
  title: string;
  description: string;
  customer_id?: string;
  subscription_id?: string;
}

export default async (req: Request) => {
  const payload: AlertPayload = await req.json();
  const startTime = Date.now();

  try {
    // Normalize severity
    const severityMap: Record<string, string> = {
      down: 'p1_critical',
      degraded: 'p2_high',
      security: 'p1_critical',
      performance: 'p3_medium',
    };
    const severity = payload.severity || (severityMap[payload.alert_type] as any) || 'p3_medium';

    // Find customer by website URL if not provided
    let customerId = payload.customer_id;
    let subscriptionId = payload.subscription_id;

    if (!customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', req.headers.get('x-customer-email') || '')
        .single();

      if (customer) {
        customerId = customer.id;
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('customer_id', customerId)
          .eq('status', 'active')
          .single();
        if (sub) subscriptionId = sub.id;
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer not found. Provide customer_id or x-customer-email header.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if incident already exists for this URL
    const { data: existing } = await supabase
      .from('incidents')
      .select('id, status')
      .eq('website_url', payload.website_url)
      .in('status', ['open', 'in_progress', 'ai_repairing', 'human_escalated', 'coordinator_review'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let incidentId: string;

    if (existing) {
      // Update existing incident
      incidentId = existing.id;
      await supabase.from('incidents').update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      }).eq('id', incidentId);

      await supabase.from('audit_logs').insert({
        entity_type: 'incident',
        entity_id: incidentId,
        action: 'alert_reopened',
        performed_by_type: 'system',
        metadata: { source: payload.source, alert_type: payload.alert_type },
      });
    } else {
      // Create new incident
      const { data: incident } = await supabase.from('incidents').insert({
        subscription_id: subscriptionId,
        customer_id: customerId,
        status: 'open',
        severity: severity as any,
        title: payload.title,
        description: payload.description,
        website_url: payload.website_url,
      }).select().single();

      incidentId = incident!.id;
    }

    // Send notification
    await supabase.from('communications').insert({
      customer_id: customerId,
      incident_id: incidentId,
      channel: 'dashboard',
      content: `Alert from ${payload.source}: ${payload.title}. Incident #${incidentId.substring(0, 8)} created.`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Trigger TRIAGE agent
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-triage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ incident_id: incidentId, type: 'incident' }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        incident_id: incidentId,
        severity,
        processing_time_ms: Date.now() - startTime,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
