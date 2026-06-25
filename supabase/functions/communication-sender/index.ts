// ═══════════════════════════════════════════════════════════════
// FUNCTION 5: communication-sender
// Send SMS (Twilio), Email (Resend), Dashboard notification
// Templates: Dynamic content based on incident status and customer tier
// Retry: 3 attempts, fallback channel on failure
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Channel providers
const TWILIO_SID = Deno.env.get('TWILIO_SID')!;
const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')!;
const TWILIO_FROM = Deno.env.get('TWILIO_FROM')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'alerts@uptimeops.com';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface CommPayload {
  type: string;
  entity_type: string;
  entity_id: string;
  channel: 'sms' | 'email' | 'push' | 'dashboard' | 'all';
  customer_id?: string;
  metadata?: Record<string, unknown>;
  force_fallback?: boolean;
}

// ── Templates ──

const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; body: string; sms?: string }> = {
  incident_created: (d) => ({
    subject: `[UptimeOps] Incident Detected — ${d.website_url}`,
    body: `We've detected an issue with ${d.website_url}.\n\nOur AI is already investigating. We'll keep you updated every step of the way.\n\nIncident ID: ${d.incident_id}\nStatus: ${d.status}\n\nView live progress: ${d.dashboard_url}`,
    sms: `UptimeOps: Incident detected on ${d.website_url}. AI investigating. Track: ${d.dashboard_url}`,
  }),
  incident_resolved: (d) => ({
    subject: `[UptimeOps] Resolved — ${d.website_url}`,
    body: `Great news! The issue with ${d.website_url} has been resolved.\n\nResolution: ${d.resolution_summary}\nDuration: ${d.duration}\n\nPlease verify: ${d.verification_url}\n\nYour site is now fully operational.`,
    sms: `UptimeOps: ${d.website_url} is back online. Please verify: ${d.verification_url}`,
  }),
  approval_required: (d) => ({
    subject: `[Action Required] Deployment Approval — ${d.incident_id}`,
    body: `AI confidence: ${d.confidence}%. A deployment is awaiting your approval.\n\nReview and approve: ${d.approval_url}`,
  }),
  payment_succeeded: (d) => ({
    subject: `[UptimeOps] Payment Confirmed — $${d.amount}`,
    body: `Payment of $${d.amount} received. Our AI is starting the fix now.\n\nTrack progress: ${d.dashboard_url}`,
  }),
  dunning_email: (d) => ({
    subject: `[UptimeOps] Payment Failed — Please Update`,
    body: `Your payment failed after ${d.retry_count} attempts.\n\nPlease update your payment method to continue: ${d.payment_url}\n\nIf not resolved within 24 hours, your fix request will be cancelled.`,
  }),
  invoice_paid: (d) => ({
    subject: `[UptimeOps] Invoice Paid — $${d.amount}`,
    body: `Thank you! Your invoice for $${d.amount} has been paid.\n\nYour subscription is active through ${d.period_end}.`,
  }),
  exit_survey: (d) => ({
    subject: `[UptimeOps] We're sorry to see you go`,
    body: `Your subscription has been cancelled and will remain active until ${d.period_end}.\n\nWe'd love your feedback: ${d.survey_url}\n\nNeed help? Reply to this email or contact support@uptimeops.com`,
  }),
  credential_approval_request: (d) => ({
    subject: `[UptimeOps] Credential Access Requested`,
    body: `An engineer needs temporary access to your credentials.\n\nVM Session: ${d.vm_session_id}\nEngineer: ${d.engineer_id}\n\nApprove or deny in your dashboard: ${d.dashboard_url}\n\nThis request expires in 5 minutes.`,
    sms: `UptimeOps: Engineer needs credential access. Approve: ${d.dashboard_url} (expires 5min)`,
  }),
  ai_escalation: (d) => ({
    subject: `[UptimeOps] AI Escalated — Engineer Assigned`,
    body: `Our AI could not fully resolve the issue and has escalated to a human engineer.\n\nReason: ${d.reason}\nEngineer will be assigned shortly.\n\nTrack: ${d.dashboard_url}`,
  }),
  default: (d) => ({
    subject: `[UptimeOps] Notification — ${d.type || 'Update'}`,
    body: JSON.stringify(d, null, 2),
  }),
};

// ── Channel Senders ──

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: message }),
    });
    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, text: body }),
    });
    return { success: response.ok, error: response.ok ? undefined : await response.text() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendDashboard(customerId: string, type: string, metadata: Record<string, unknown>): Promise<{ success: boolean }> {
  const { error } = await supabase.from('notifications').insert({
    customer_id: customerId,
    type,
    message: metadata.message as string || `New notification: ${type}`,
    metadata,
    read: false,
  });
  return { success: !error };
}

// ── Retry Wrapper ──

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 1) throw e;
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// ── Main Handler ──

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: CommPayload = await req.json();
  const results: Record<string, { success: boolean; error?: string }> = {};

  try {
    // Get customer details
    let customerId = payload.customer_id;
    let phone: string | undefined;
    let email: string | undefined;

    if (!customerId && payload.entity_type && payload.entity_id) {
      // Resolve customer from entity
      if (payload.entity_type === 'incident') {
        const { data } = await supabase.from('incidents').select('customer_id').eq('id', payload.entity_id).single();
        customerId = data?.customer_id;
      } else if (payload.entity_type === 'one_time_fix') {
        const { data } = await supabase.from('one_time_fixes').select('customer_id').eq('id', payload.entity_id).single();
        customerId = data?.customer_id;
      } else if (payload.entity_type === 'subscription') {
        const { data } = await supabase.from('subscriptions').select('customer_id').eq('id', payload.entity_id).single();
        customerId = data?.customer_id;
      } else if (payload.entity_type === 'credential') {
        const { data } = await supabase.from('credentials_vault').select('customer_id').eq('id', payload.entity_id).single();
        customerId = data?.customer_id;
      }
    }

    if (customerId) {
      const { data: customer } = await supabase.from('customers').select('phone, email').eq('id', customerId).single();
      phone = customer?.phone || undefined;
      email = customer?.email || undefined;
    }

    // Get template
    const template = TEMPLATES[payload.type] || TEMPLATES.default;
    const content = template(payload.metadata || {});

    // Determine channels
    const channels: string[] = payload.channel === 'all'
      ? ['dashboard', 'email', 'sms']
      : [payload.channel];

    // Send to each channel
    for (const channel of channels) {
      switch (channel) {
        case 'sms': {
          if (phone && content.sms) {
            const result = await withRetry(() => sendSMS(phone!, content.sms!));
            results.sms = result;
            if (!result.success && !payload.force_fallback) {
              // Fallback to email
              if (email) {
                const fallback = await sendEmail(email, content.subject, content.body);
                results.sms_fallback = fallback;
              }
            }
          }
          break;
        }
        case 'email': {
          if (email) {
            const result = await withRetry(() => sendEmail(email, content.subject, content.body));
            results.email = result;
            if (!result.success && !payload.force_fallback) {
              // Fallback to dashboard
              if (customerId) {
                const fallback = await sendDashboard(customerId, payload.type, {
                  ...payload.metadata,
                  message: content.body.substring(0, 500),
                });
                results.email_fallback = fallback;
              }
            }
          }
          break;
        }
        case 'dashboard':
        case 'push': {
          if (customerId) {
            const result = await sendDashboard(customerId, payload.type, {
              ...payload.metadata,
              message: content.body.substring(0, 500),
            });
            results.dashboard = result;
          }
          break;
        }
      }
    }

    // Log communication
    await supabase.from('communications_log').insert({
      customer_id: customerId,
      type: payload.type,
      channel: payload.channel,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      subject: content.subject,
      body: content.body,
      metadata: {
        ...payload.metadata,
        delivery_results: results,
      },
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      channels_sent: Object.keys(results),
      results,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg, partial_results: results }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
