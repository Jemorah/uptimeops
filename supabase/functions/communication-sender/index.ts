// UptimeOps — Communication Sender
// Sends email (Resend), SMS (Twilio), push notifications, and in-app dashboard messages

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'communication-sender';

interface CommPayload {
  type: string;
  customer_id?: string;
  entity_type?: string;
  entity_id?: string;
  channel: 'email' | 'sms' | 'push' | 'dashboard' | 'all';
  subject?: string;
  body?: string;
  to?: string;
  metadata?: Record<string, unknown>;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) { logWarn(FUNCTION, 'RESEND_API_KEY not set, skipping email'); return false; }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'UptimeOps <alerts@uptimeops.com>', to, subject, html: body }),
    });
    return resp.ok;
  } catch (e) { logError(FUNCTION, 'Email send failed', e); return false; }
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  const twilioSid = Deno.env.get('TWILIO_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom = Deno.env.get('TWILIO_PHONE');
  if (!twilioSid || !twilioToken) { logWarn(FUNCTION, 'Twilio credentials not set, skipping SMS'); return false; }

  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: twilioFrom || '', To: to, Body: body }),
    });
    return resp.ok;
  } catch (e) { logError(FUNCTION, 'SMS send failed', e); return false; }
}

async function createNotification(supabase: any, payload: CommPayload) {
  if (!payload.customer_id) return;
  await supabase.from('notifications').insert({
    customer_id: payload.customer_id,
    type: payload.type,
    message: payload.body || payload.subject || payload.type,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    metadata: payload.metadata || {},
  });
}

import { logWarn } from '../_shared/logger.ts';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const payload: CommPayload = await req.json();
    const supabase = getSupabaseClient(req);

    logInfo(FUNCTION, 'Processing communication', { type: payload.type, channel: payload.channel });

    // Resolve recipient email/phone from customer record if not provided
    let toEmail = payload.to;
    let toPhone: string | undefined;
    if (payload.customer_id && !payload.to) {
      const { data: customer } = await supabase.from('customers')
        .select('email, phone').eq('id', payload.customer_id).single();
      if (customer) { toEmail = customer.email; toPhone = customer.phone; }
    }

    const channels = payload.channel === 'all' ? ['email', 'sms', 'dashboard'] : [payload.channel];
    const results: Record<string, boolean> = {};

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          if (toEmail && payload.subject) {
            results.email = await sendEmail(toEmail, payload.subject, payload.body || '');
          }
          break;
        case 'sms':
          if (toPhone && payload.body) {
            results.sms = await sendSMS(toPhone, payload.body);
          }
          break;
        case 'push':
          // Web push logic would go here (requires VAPID keys)
          results.push = false;
          break;
        case 'dashboard':
          await createNotification(supabase, payload);
          results.dashboard = true;
          break;
      }
    }

    // Log communication
    if (payload.customer_id) {
      await supabase.from('communications_log').insert({
        customer_id: payload.customer_id,
        type: payload.type,
        channel: payload.channel,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        subject: payload.subject,
        body: payload.body,
        delivery_status: Object.values(results).some(Boolean) ? 'delivered' : 'failed',
        metadata: { results, ...payload.metadata },
      });
    }

    return new Response(JSON.stringify({ sent: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Send failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
