// UptimeOps v2.1 — OpsGenie Sync
// Syncs engineer on-call schedules with Atlassian OpsGenie
// Requires OPSGENIE_API_KEY in Edge Function Secrets

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'opsgenie-sync';
const OPSGENIE_API_BASE = 'https://api.opsgenie.com/v2';

interface OpsGenieRequest {
  action: 'sync_schedules' | 'get_oncall' | 'sync_engineer' | 'list_schedules' | 'set_oncall' | 'create_alert';
  engineer_id?: string;
  schedule_id?: string;
  date_from?: string;
  date_to?: string;
  is_on_call?: boolean;
  date?: string;
  alert_payload?: {
    message: string;
    alias?: string;
    description?: string;
    responders?: Array<{ id: string; type: string }>;
    priority?: 'P1' | 'P2' | 'P3' | 'P4';
  };
}

// ── OPSGENIE API CLIENT ─────────────────────────────────────

function getOpsGenieHeaders(): Record<string, string> {
  const apiKey = Deno.env.get('OPSGENIE_API_KEY');
  if (!apiKey) throw new Error('OPSGENIE_API_KEY not configured');
  return {
    Authorization: `GenieKey ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function opsgenieFetch(path: string, options: RequestInit = {}): Promise<any> {
  const resp = await fetch(`${OPSGENIE_API_BASE}${path}`, {
    ...options,
    headers: { ...getOpsGenieHeaders(), ...(options.headers || {}) },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpsGenie API ${resp.status}: ${err}`);
  }

  // 204 No Content
  if (resp.status === 204) return { success: true };

  return await resp.json();
}

// ── OPSGENIE OPERATIONS ─────────────────────────────────────

async function listOpsGenieSchedules(): Promise<any[]> {
  const data = await opsgenieFetch('/schedules');
  return (data?.data || []).map((s: any) => ({ id: s.id, name: s.name, timezone: s.timezone, enabled: s.enabled }));
}

async function getScheduleTimeline(scheduleId: string, date: string): Promise<any[]> {
  const data = await opsgenieFetch(`/schedules/${scheduleId}/timeline?date=${date}`);
  const rotations = data?.timeline?.rotations || [];
  const participants: any[] = [];

  for (const rotation of rotations) {
    for (const period of rotation.periods || []) {
      const recipient = period.recipient;
      if (recipient?.id) {
        participants.push({
          opsgenie_user_id: recipient.id,
          opsgenie_username: recipient.username || recipient.name,
          schedule_id: scheduleId,
          schedule_name: data?.timeline?.name,
          from: period.startTime,
          to: period.endTime,
          type: recipient.type,
        });
      }
    }
  }
  return participants;
}

async function getOnCallParticipants(scheduleId?: string): Promise<any[]> {
  const path = scheduleId ? `/schedules/${scheduleId}/on-calls` : '/schedules/on-calls';
  const data = await opsgenieFetch(path);

  if (scheduleId && data?.data?.onCallParticipants) {
    return data.data.onCallParticipants;
  }
  if (data?.data) return data.data;
  return [];
}

async function getOpsGenieUser(email: string): Promise<any | null> {
  try {
    return await opsgenieFetch(`/users/${email}`);
  } catch {
    return null;
  }
}

async function createOpsGenieUser(email: string, fullName: string, timezone: string): Promise<any> {
  return await opsgenieFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      username: email,
      fullName,
      role: 'User',
      timezone: timezone || 'America/New_York',
    }),
  });
}

async function createOpsGenieAlert(payload: OpsGenieRequest['alert_payload']): Promise<any> {
  if (!payload) throw new Error('alert_payload required');
  return await opsgenieFetch('/alerts', {
    method: 'POST',
    body: JSON.stringify({
      message: payload.message,
      alias: payload.alias || `uptimeops-${Date.now()}`,
      description: payload.description || '',
      responders: payload.responders || [],
      priority: payload.priority || 'P3',
      source: 'UptimeOps',
    }),
  });
}

// ── SUPABASE SYNC OPERATIONS ─────────────────────────────────

async function persistScheduleSync(supabase: any, participants: any[]): Promise<number> {
  let synced = 0;
  for (const p of participants) {
    // Find engineer by email (opsgenie_username is email)
    const { data: profile } = await supabase
      .from('engineer_profiles')
      .select('id')
      .eq('email', p.opsgenie_username)
      .maybeSingle();

    if (profile) {
      await supabase.from('opsgenie_sync').upsert({
        engineer_id: profile.id,
        opsgenie_user_id: p.opsgenie_user_id,
        opsgenie_username: p.opsgenie_username,
        schedule_id: p.schedule_id,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
      }, { onConflict: 'engineer_id' });

      // Update oncall_schedules
      const scheduleDate = p.from ? p.from.split('T')[0] : new Date().toISOString().split('T')[0];
      await supabase.from('oncall_schedules').upsert({
        engineer_id: profile.id,
        schedule_date: scheduleDate,
        is_on_call: true,
        opsgenie_schedule_id: p.schedule_id,
      }, { onConflict: 'engineer_id,schedule_date' });

      synced++;
    }
  }
  return synced;
}

// ── MAIN HANDLER ─────────────────────────────────────────────

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: OpsGenieRequest = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'action required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient(req);
    const user = getAuthUser(req);

    // ── Auth check for admin actions ──
    const adminActions = ['sync_schedules', 'sync_engineer', 'set_oncall', 'create_alert'];
    if (adminActions.includes(action)) {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
      }
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || !['admin', 'coordinator'].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: 'Admin/coordinator required' }), { status: 403, headers: corsHeaders });
      }
    }

    // ── Verify OpsGenie key is configured ──
    if (!Deno.env.get('OPSGENIE_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'OPSGENIE_API_KEY not configured. Add it in Supabase Dashboard > Edge Functions > Secrets.' }),
        { status: 503, headers: corsHeaders }
      );
    }

    switch (action) {
      case 'sync_schedules': {
        const schedules = await listOpsGenieSchedules();
        const fromDate = body.date_from || new Date().toISOString().split('T')[0];

        let totalSynced = 0;
        const allParticipants: any[] = [];

        for (const schedule of schedules) {
          if (!schedule.enabled) continue;
          const participants = await getScheduleTimeline(schedule.id, fromDate);
          const synced = await persistScheduleSync(supabase, participants);
          totalSynced += synced;
          allParticipants.push(...participants);
        };
        return new Response(JSON.stringify({
          synced: totalSynced,
          schedules_found: schedules.length,
          participants: allParticipants,
        }), { headers: corsHeaders });
      }

      case 'get_oncall': {
        const participants = await getOnCallParticipants(body.schedule_id);
        return new Response(JSON.stringify({
          oncall: participants,
          count: participants.length,
          source: 'opsgenie',
        }), { headers: corsHeaders });
      }

      case 'sync_engineer': {
        if (!body.engineer_id) {
          return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });
        }

        const { data: profile } = await supabase
          .from('engineer_profiles')
          .select('*')
          .eq('id', body.engineer_id)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: 'Engineer not found' }), { status: 404, headers: corsHeaders });
        }

        // Check if user exists in OpsGenie
        let userData = await getOpsGenieUser(profile.email);

        if (!userData) {
          // Create user in OpsGenie;
          userData = await createOpsGenieUser(profile.email, profile.full_name, profile.timezone);
        }

        if (userData?.data) {
          await supabase.from('opsgenie_sync').upsert({
            engineer_id: body.engineer_id,
            opsgenie_user_id: userData.data.id,
            opsgenie_username: userData.data.username || profile.email,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          }, { onConflict: 'engineer_id' });

          return new Response(JSON.stringify({
            synced: true,
            opsgenie_user_id: userData.data.id,
            created: !userData.data.id, // Was the user just created?
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ synced: false, error: 'Failed to sync with OpsGenie' }), { status: 502, headers: corsHeaders });
      }

      case 'list_schedules': {
        const schedules = await listOpsGenieSchedules();
        return new Response(JSON.stringify({ schedules, count: schedules.length }), { headers: corsHeaders });
      }

      case 'set_oncall': {
        if (!body.engineer_id) {
          return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });
        }

        // Get engineer profile
        const { data: profile } = await supabase
          .from('engineer_profiles')
          .select('email, full_name, timezone')
          .eq('id', body.engineer_id)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: 'Engineer not found' }), { status: 404, headers: corsHeaders });
        }

        // Ensure user exists in OpsGenie
        let userData = await getOpsGenieUser(profile.email);
        if (!userData) {
          userData = await createOpsGenieUser(profile.email, profile.full_name, profile.timezone);
        }

        // Update local oncall_schedules
        const scheduleDate = body.date || new Date().toISOString().split('T')[0];
        await supabase.from('oncall_schedules').upsert({
          engineer_id: body.engineer_id,
          schedule_date: scheduleDate,
          is_on_call: body.is_on_call ?? true,
        }, { onConflict: 'engineer_id,schedule_date' });

        return new Response(JSON.stringify({
          set: true,
          engineer_id: body.engineer_id,
          date: scheduleDate,
          is_on_call: body.is_on_call ?? true,
          opsgenie_user_id: userData?.data?.id || null,
        }), { headers: corsHeaders });
      }

      case 'create_alert': {
        if (!body.alert_payload) {
          return new Response(JSON.stringify({ error: 'alert_payload required' }), { status: 400, headers: corsHeaders });
        }
        const result = await createOpsGenieAlert(body.alert_payload);
        return new Response(JSON.stringify({ created: true, alert: result.data || result }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
    }

  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isConfigError = message.includes('OPSGENIE_API_KEY not configured');
    return new Response(
      JSON.stringify({
        error: message,
        hint: isConfigError ? 'Add OPSGENIE_API_KEY in Supabase Dashboard > Edge Functions > Secrets' : undefined,
      }),
      { status: isConfigError ? 503 : 500, headers: corsHeaders }
    );
  }
});
