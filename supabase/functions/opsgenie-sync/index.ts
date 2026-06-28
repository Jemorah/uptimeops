// UptimeOps v2.1 — OpsGenie Sync
// Syncs engineer on-call schedules with Atlassian OpsGenie
// Fetches schedules, syncs on-call status, handles overrides

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'opsgenie-sync';
const OPSGENIE_API_BASE = 'https://api.opsgenie.com/v2';

interface OpsGenieRequest {
  action: 'sync_schedules' | 'get_oncall' | 'sync_engineer' | 'list_schedules';
  engineer_id?: string;
  schedule_id?: string;
  date_from?: string;
  date_to?: string;
}

// ═══════════════════════════════════════════════════════════════
// OPSGENIE API CLIENT
// ═══════════════════════════════════════════════════════════════

function getOpsGenieHeaders() {
  const apiKey = Deno.env.get('OPSGENIE_API_KEY');
  return {
    'Authorization': `GenieKey ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function opsgenieFetch(path: string, options: RequestInit = {}) {
  const apiKey = Deno.env.get('OPSGENIE_API_KEY');
  if (!apiKey) {
    logWarn(FUNCTION, 'OPSGENIE_API_KEY not configured, using mock data');
    return null;
  }

  try {
    const resp = await fetch(`${OPSGENIE_API_BASE}${path}`, {
      ...options,
      headers: { ...getOpsGenieHeaders(), ...options.headers },
    });

    if (!resp.ok) {
      const err = await resp.text();
      logError(FUNCTION, `OpsGenie API error ${resp.status}`, err);
      return null;
    }

    return await resp.json();
  } catch (e) {
    logError(FUNCTION, 'OpsGenie API call failed', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SYNC ALL SCHEDULES
// ═══════════════════════════════════════════════════════════════

async function syncSchedules(supabase: any, dateFrom?: string, dateTo?: string): Promise<{
  synced: number;
  schedules: any[];
}> {
  const fromDate = dateFrom || new Date().toISOString().split('T')[0];
  const toDate = dateTo || fromDate;

  // Try OpsGenie API
  const schedulesData = await opsgenieFetch('/schedules');

  if (!schedulesData) {
    // Fallback: generate from existing opsgenie_sync records
    logInfo(FUNCTION, 'Using local sync data');
    const { data: syncRecords } = await supabase.from('opsgenie_sync').select('*, engineer_profiles(*)');

    return {
      synced: syncRecords?.length || 0,
      schedules: (syncRecords || []).map((r: any) => ({
        engineer_id: r.engineer_id,
        engineer_name: r.engineer_profiles?.full_name || 'Unknown',
        schedule_id: r.schedule_id,
        status: r.sync_status,
      })),
    };
  }

  // Process OpsGenie schedules
  const synced: any[] = [];
  const schedules = schedulesData.data || [];

  for (const schedule of schedules) {
    // Get on-call participants for this schedule
    const timelineData = await opsgenieFetch(
      `/schedules/${schedule.id}/timeline?date=${fromDate}`
    );

    const rotations = timelineData?.timeline?.rotations || [];

    for (const rotation of rotations) {
      for (const period of rotation.periods || []) {
        const recipient = period.recipient;
        if (!recipient?.id) continue;

        // Upsert sync record
        await supabase.from('opsgenie_sync').upsert({
          engineer_id: recipient.id,
          opsgenie_user_id: recipient.id,
          opsgenie_username: recipient.username || recipient.name,
          schedule_id: schedule.id,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        }, { onConflict: 'engineer_id' });

        synced.push({
          engineer_id: recipient.id,
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          from: period.startTime,
          to: period.endTime,
        });
      }
    }
  }

  return { synced: synced.length, schedules: synced };
}

// ═══════════════════════════════════════════════════════════════
// GET CURRENT ON-CALL ENGINEER
// ═══════════════════════════════════════════════════════════════

async function getOnCall(supabase: any, scheduleId?: string): Promise<{
  oncall: any[];
}> {
  if (scheduleId) {
    const data = await opsgenieFetch(`/schedules/${scheduleId}/on-calls`);
    if (data?.data?.onCallParticipants) {
      return { oncall: data.data.onCallParticipants };
    }
  }

  // Get all on-call
  const data = await opsgenieFetch('/schedules/on-calls');
  if (data?.data) {
    return { oncall: data.data };
  }

  // Fallback: check local oncall_schedules table
  const today = new Date().toISOString().split('T')[0];
  const { data: localOnCall } = await supabase
    .from('oncall_schedules')
    .select('*, engineer_profiles(id, full_name, email, specialization)')
    .eq('schedule_date', today)
    .eq('is_on_call', true);

  return {
    oncall: (localOnCall || []).map((r: any) => ({
      id: r.engineer_id,
      name: r.engineer_profiles?.full_name || 'Unknown',
      email: r.engineer_profiles?.email,
      specialization: r.engineer_profiles?.specialization || [],
      schedule_date: r.schedule_date,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// SYNC SINGLE ENGINEER
// ═══════════════════════════════════════════════════════════════

async function syncEngineer(supabase: any, engineerId: string): Promise<{
  synced: boolean;
  opsgenie_user_id?: string;
}> {
  // Get engineer profile
  const { data: profile } = await supabase
    .from('engineer_profiles')
    .select('*')
    .eq('id', engineerId)
    .single();

  if (!profile) {
    return { synced: false };
  }

  // Try to find/create in OpsGenie
  const userData = await opsgenieFetch(`/users/${profile.email}`);

  if (userData?.data) {
    // User exists in OpsGenie
    await supabase.from('opsgenie_sync').upsert({
      engineer_id: engineerId,
      opsgenie_user_id: userData.data.id,
      opsgenie_username: userData.data.username || profile.email,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
    }, { onConflict: 'engineer_id' });

    return { synced: true, opsgenie_user_id: userData.data.id };
  }

  // Create in OpsGenie
  const createResult = await opsgenieFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      username: profile.email,
      fullName: profile.full_name,
      role: 'User',
      timezone: profile.timezone || 'America/New_York',
    }),
  });

  if (createResult?.data) {
    await supabase.from('opsgenie_sync').upsert({
      engineer_id: engineerId,
      opsgenie_user_id: createResult.data.id,
      opsgenie_username: profile.email,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
    }, { onConflict: 'engineer_id' });

    return { synced: true, opsgenie_user_id: createResult.data.id };
  }

  // Mark as pending if OpsGenie not available
  await supabase.from('opsgenie_sync').upsert({
    engineer_id: engineerId,
    sync_status: 'pending',
  }, { onConflict: 'engineer_id' });

  return { synced: false };
}

// ═══════════════════════════════════════════════════════════════
// LIST SCHEDULES
// ═══════════════════════════════════════════════════════════════

async function listSchedules(): Promise<any[]> {
  const data = await opsgenieFetch('/schedules');
  if (data?.data) {
    return data.data.map((s: any) => ({ id: s.id, name: s.name, timezone: s.timezone }));
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

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

    // Auth check for admin actions
    const adminActions = ['sync_schedules', 'sync_engineer'];
    if (adminActions.includes(action)) {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
      }

      // Check admin/coordinator role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || !['admin', 'coordinator'].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: 'Admin/coordinator required' }), { status: 403, headers: corsHeaders });
      }
    }

    switch (action) {
      case 'sync_schedules': {
        const result = await syncSchedules(supabase, body.date_from, body.date_to);
        return new Response(JSON.stringify(result), { headers: corsHeaders });
      }

      case 'get_oncall': {
        const result = await getOnCall(supabase, body.schedule_id);
        return new Response(JSON.stringify(result), { headers: corsHeaders });
      }

      case 'sync_engineer': {
        if (!body.engineer_id) {
          return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });
        }
        const result = await syncEngineer(supabase, body.engineer_id);
        return new Response(JSON.stringify(result), { headers: corsHeaders });
      }

      case 'list_schedules': {
        const schedules = await listSchedules();
        return new Response(JSON.stringify({ schedules }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
    }

  } catch (err) {
    logError(FUNCTION, 'OpsGenie sync failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

import { logWarn } from '../_shared/logger.ts';
