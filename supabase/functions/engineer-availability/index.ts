// ═══════════════════════════════════════════════════════════════
// FUNCTION 8: engineer-availability
// Cron: Every 2 minutes — check online status, auto-escalate
// Load balancing: round-robin assignment
// Alert: SMS to lead coordinator if zero engineers on-call
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const TWILIO_SID = Deno.env.get('TWILIO_SID')!;
const TWILIO_TOKEN = Deno.env.get('TWILIO_TOKEN')!;
const TWILIO_FROM = Deno.env.get('TWILIO_FROM')!;

interface AvailabilityPayload {
  action: 'cron_check' | 'assign_engineer' | 'set_presence' | 'get_online';
  engineer_id?: string;
  incident_id?: string;
  escalation_id?: string;
  presence?: 'online' | 'away' | 'offline';
}

// Round-robin assignment tracker (in-memory)
let lastAssignedIndex = 0;

async function checkAvailability() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Get all engineers marked as "online" with recent heartbeat
  const { data: onlineEngineers } = await supabase
    .from('engineer_profiles')
    .select('id, name, email, phone, level, last_heartbeat_at, is_on_call, active_incident_count')
    .eq('is_on_call', true)
    .gte('last_heartbeat_at', fiveMinutesAgo.toISOString())
    .order('active_incident_count', { ascending: true })
    .order('last_assigned_at', { ascending: true });

  const onlineCount = onlineEngineers?.length || 0;

  // Get pending escalations
  const { data: pendingEscalations } = await supabase
    .from('human_escalations')
    .select('id, incident_id, assigned_engineer_id, created_at, status')
    .eq('status', 'pending_assignment')
    .order('created_at', { ascending: true });

  const results = {
    online_engineers: onlineCount,
    pending_escalations: pendingEscalations?.length || 0,
    assignments_made: 0,
    alerts_sent: 0,
    timestamp: now.toISOString(),
  };

  // ZERO engineers on-call → alert lead coordinator
  if (onlineCount === 0) {
    // Get lead coordinator
    const { data: lead } = await supabase
      .from('coordinator_profiles')
      .select('phone, email, is_lead')
      .eq('is_lead', true)
      .single();

    if (lead?.phone) {
      await sendSMS(lead.phone, `URGENT: Zero engineers on-call at ${now.toISOString()}. ${pendingEscalations?.length || 0} escalations pending. Login to assign manually.`);
      results.alerts_sent++;
    }

    // Also send to all coordinators
    const { data: coordinators } = await supabase
      .from('coordinator_profiles')
      .select('phone')
      .not('phone', 'is', null);

    for (const coord of coordinators || []) {
      if (coord.phone && coord.phone !== lead?.phone) {
        await sendSMS(coord.phone, `ALERT: No engineers on-call. ${pendingEscalations?.length || 0} pending escalations need manual assignment.`);
      }
    }

    return { ...results, alert: 'ZERO_ENGINEERS_ON_CALL' };
  }

  // Assign pending escalations to available engineers (round-robin, least-loaded)
  if (onlineEngineers && pendingEscalations) {
    const sortedEngineers = [...onlineEngineers].sort((a, b) => {
      // Prioritize: lower active count, then least recently assigned
      if ((a.active_incident_count || 0) !== (b.active_incident_count || 0)) {
        return (a.active_incident_count || 0) - (b.active_incident_count || 0);
      }
      return new Date(a.last_assigned_at || 0).getTime() - new Date(b.last_assigned_at || 0).getTime();
    });

    for (const escalation of pendingEscalations) {
      // Find best engineer (round-robin from sorted list)
      const engineer = sortedEngineers[lastAssignedIndex % sortedEngineers.length];
      lastAssignedIndex++;

      if (!engineer) continue;

      // Assign escalation
      await supabase.from('human_escalations').update({
        assigned_engineer_id: engineer.id,
        status: 'assigned',
        assigned_at: now.toISOString(),
      }).eq('id', escalation.id);

      // Update engineer load
      await supabase.from('engineer_profiles').update({
        active_incident_count: (engineer.active_incident_count || 0) + 1,
        last_assigned_at: now.toISOString(),
      }).eq('id', engineer.id);

      // Notify engineer
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'incident_assigned',
          entity_type: 'human_escalation',
          entity_id: escalation.id,
          channel: 'dashboard',
          metadata: { engineer_id: engineer.id, incident_id: escalation.incident_id },
        }),
      });

      results.assignments_made++;
    }
  }

  // Check for timed-out engineer assignments (> 30 min without acknowledgment)
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const { data: timedOut } = await supabase
    .from('human_escalations')
    .select('id, assigned_engineer_id, assigned_at')
    .eq('status', 'assigned')
    .lt('assigned_at', thirtyMinutesAgo.toISOString());

  for (const escalation of timedOut || []) {
    // Re-assign to another engineer
    await supabase.from('human_escalations').update({
      status: 'pending_assignment',
      assigned_engineer_id: null,
      reassigned_at: now.toISOString(),
    }).eq('id', escalation.id);

    // Notify coordinator
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'engineer_timeout',
        entity_type: 'human_escalation',
        entity_id: escalation.id,
        channel: 'dashboard',
        metadata: { timed_out_engineer: escalation.assigned_engineer_id },
      }),
    });
  }

  if (timedOut && timedOut.length > 0) {
    results.reassignments = timedOut.length;
  }

  return results;
}

async function assignEngineer(escalationId: string) {
  const { data: escalation } = await supabase
    .from('human_escalations')
    .select('id, incident_id, status')
    .eq('id', escalationId)
    .single();

  if (!escalation || escalation.status !== 'pending_assignment') {
    return { success: false, error: 'Escalation not found or already assigned' };
  }

  // Get available engineers
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const { data: engineers } = await supabase
    .from('engineer_profiles')
    .select('id, active_incident_count')
    .eq('is_on_call', true)
    .gte('last_heartbeat_at', fiveMinutesAgo.toISOString())
    .order('active_incident_count', { ascending: true });

  if (!engineers || engineers.length === 0) {
    return { success: false, error: 'No engineers available' };
  }

  // Pick least-loaded
  const engineer = engineers[0];

  await supabase.from('human_escalations').update({
    assigned_engineer_id: engineer.id,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
  }).eq('id', escalationId);

  return { success: true, engineer_id: engineer.id };
}

async function setPresence(engineerId: string, presence: string) {
  const update: Record<string, unknown> = {
    last_heartbeat_at: new Date().toISOString(),
    is_on_call: presence === 'online',
  };

  if (presence === 'offline') {
    update.is_on_call = false;
  }

  await supabase.from('engineer_profiles').update(update).eq('id', engineerId);

  return { success: true, engineer_id: engineerId, presence };
}

async function sendSMS(phone: string, message: string) {
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: message }),
    });
  } catch (e) {
    console.error('SMS send failed:', e);
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: AvailabilityPayload = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'cron_check':
        result = await checkAvailability();
        break;
      case 'assign_engineer':
        if (!payload.escalation_id) {
          return new Response(JSON.stringify({ error: 'Missing escalation_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        result = await assignEngineer(payload.escalation_id);
        break;
      case 'set_presence':
        if (!payload.engineer_id || !payload.presence) {
          return new Response(JSON.stringify({ error: 'Missing engineer_id or presence' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        result = await setPresence(payload.engineer_id, payload.presence);
        break;
      case 'get_online': {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const { data } = await supabase
          .from('engineer_profiles')
          .select('id, name, level, active_incident_count, last_heartbeat_at')
          .eq('is_on_call', true)
          .gte('last_heartbeat_at', fiveMinAgo.toISOString());
        result = { success: true, count: data?.length || 0, engineers: data };
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
