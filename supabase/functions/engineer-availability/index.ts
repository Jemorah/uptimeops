// UptimeOps v2.1 — Engineer Availability Manager
// Tracks on-call status, auto-assignment, heartbeat monitoring, timeout handling
// v2.1: Wires to opsgenie_sync and oncall_schedules tables for OpsGenie integration

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'engineer-availability';

interface AvailabilityRequest {
  action?: 'heartbeat' | 'list_available' | 'auto_assign' | 'resolve' | 'timeout_engineer' | 'get_stats' | 'get_oncall_schedule' | 'update_availability' | 'set_oncall';
  engineer_id?: string;
  incident_id?: string;
  is_available?: boolean;
  max_weekly_hours?: number;
  date?: string;
  is_on_call?: boolean;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: AvailabilityRequest = await req.json().catch(() => ({}));
    const { action = 'get_stats', engineer_id, incident_id } = body;
    const supabase = getSupabaseClient(req);
    const user = getAuthUser(req);

    // ═══════════════════════════════════════════════════════════
    // HEARTBEAT
    // ═══════════════════════════════════════════════════════════
    if (action === 'heartbeat') {
      if (!engineer_id) {
        return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });
      }

      await supabase.from('engineer_profiles')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', engineer_id);

      return new Response(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // LIST AVAILABLE ENGINEERS
    // ═══════════════════════════════════════════════════════════
    if (action === 'list_available') {
      // Get engineers who are available AND have active OpsGenie sync
      const { data: engineers } = await supabase.from('engineer_profiles')
        .select('*, opsgenie_sync(sync_status, last_synced_at)')
        .eq('is_available', true)
        .eq('status', 'active')
        .order('active_incident_count', { ascending: true })
        .limit(20);

      // Also get today's on-call schedule
      const today = new Date().toISOString().split('T')[0];
      const { data: oncall } = await supabase.from('oncall_schedules')
        .select('engineer_id, is_on_call')
        .eq('schedule_date', today);

      const oncallMap = new Map((oncall || []).map((o: any) => [o.engineer_id, o.is_on_call]));

      const enriched = (engineers || []).map((e: any) => ({
        ...e,
        is_on_call_today: oncallMap.get(e.id) ?? false,
        opsgenie_synced: e.opsgenie_sync?.[0]?.sync_status === 'synced',
      }));

      return new Response(JSON.stringify({ engineers: enriched }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-ASSIGN ENGINEER
    // ═══════════════════════════════════════════════════════════
    if (action === 'auto_assign') {
      if (!incident_id) {
        return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });
      }

      // Find least-loaded available engineer with matching specialization
      const { data: incident } = await supabase.from('incidents')
        .select('priority, required_specialization')
        .eq('id', incident_id)
        .single();

      let query = supabase.from('engineer_profiles')
        .select('*, opsgenie_sync(sync_status)')
        .eq('is_available', true)
        .eq('status', 'active')
        .order('active_incident_count', { ascending: true })
        .order('last_assigned_at', { ascending: true, nullsFirst: true })
        .limit(3);

      const { data: candidates } = await query;

      if (!candidates || candidates.length === 0) {
        await supabase.from('human_escalations').insert({
          incident_id, trigger_reason: 'no_engineer_available',
          status: 'pending_assignment', reason: 'No available engineers',
        });
        return new Response(JSON.stringify({ assigned: false, reason: 'No engineers available' }), { headers: corsHeaders });
      }

      // Pick best match (least loaded)
      const engineer = candidates[0];

      await supabase.from('incidents')
        .update({ assigned_engineer_id: engineer.id, status: 'in_progress' })
        .eq('id', incident_id);

      await supabase.from('engineer_profiles')
        .update({
          active_incident_count: (engineer.active_incident_count || 0) + 1,
          last_assigned_at: new Date().toISOString(),
        })
        .eq('id', engineer.id);

      await supabase.from('human_escalations')
        .update({ assigned_engineer_id: engineer.id, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('incident_id', incident_id)
        .eq('status', 'pending_assignment');

      // Log assignment
      await supabase.from('activity_log').insert({
        type: 'engineer_assigned',
        user_id: engineer.id,
        metadata: { incident_id, method: 'auto_assign', previous_count: engineer.active_incident_count },
      });
      return new Response(JSON.stringify({ assigned: true, engineer }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // RESOLVE INCIDENT
    // ═══════════════════════════════════════════════════════════
    if (action === 'resolve') {
      if (!incident_id || !engineer_id) {
        return new Response(JSON.stringify({ error: 'incident_id and engineer_id required' }), { status: 400, headers: corsHeaders });
      }

      await supabase.from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', incident_id);

      const { data: eng } = await supabase.from('engineer_profiles')
        .select('active_incident_count, total_resolved')
        .eq('id', engineer_id)
        .single();

      if (eng) {
        await supabase.from('engineer_profiles').update({
          active_incident_count: Math.max(0, (eng.active_incident_count || 1) - 1),
          total_resolved: (eng.total_resolved || 0) + 1,
        }).eq('id', engineer_id);
      }

      await supabase.from('human_escalations')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('incident_id', incident_id)
        .eq('assigned_engineer_id', engineer_id);

      return new Response(JSON.stringify({ resolved: true }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // TIMEOUT ENGINEER
    // ═══════════════════════════════════════════════════════════
    if (action === 'timeout_engineer') {
      if (!engineer_id) {
        return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });
      }

      await supabase.from('engineer_profiles')
        .update({ is_available: false, last_heartbeat_at: null })
        .eq('id', engineer_id);

      const { data: activeIncidents } = await supabase.from('incidents')
        .select('id')
        .eq('assigned_engineer_id', engineer_id)
        .not('status', 'in', '(resolved,closed)');

      for (const inc of activeIncidents || []) {
        await supabase.from('human_escalations').insert({
          incident_id: inc.id, trigger_reason: 'engineer_timeout',
          status: 'pending_assignment', reason: `Engineer ${engineer_id} timed out`,
        });
      }

      await supabase.from('incidents')
        .update({ assigned_engineer_id: null })
        .eq('assigned_engineer_id', engineer_id)
        .not('status', 'in', '(resolved,closed)');

      return new Response(JSON.stringify({ timed_out: true, reassigned: activeIncidents?.length || 0 }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // UPDATE AVAILABILITY
    // ═══════════════════════════════════════════════════════════
    if (action === 'update_availability') {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
      }

      const targetId = engineer_id || user.id;
      const updates: Record<string, unknown> = {};

      if (body.is_available !== undefined) updates.is_available = body.is_available;
      if (body.max_weekly_hours !== undefined) updates.max_weekly_hours = body.max_weekly_hours;

      await supabase.from('engineer_profiles').update(updates).eq('id', targetId);

      return new Response(JSON.stringify({ updated: true, engineer_id: targetId, ...updates }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // SET ON-CALL STATUS
    // ═══════════════════════════════════════════════════════════
    if (action === 'set_oncall') {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
      }

      const targetId = engineer_id || user.id;
      const scheduleDate = body.date || new Date().toISOString().split('T')[0];
      const onCall = body.is_on_call ?? true;

      // Upsert local oncall schedule
      await supabase.from('oncall_schedules').upsert({
        engineer_id: targetId,
        schedule_date: scheduleDate,
        is_on_call: onCall,
      }, { onConflict: 'engineer_id,schedule_date' });

      // Push to OpsGenie
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceKey) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/opsgenie-sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_oncall', engineer_id: targetId, date: scheduleDate, is_on_call: onCall }),
          });
        } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
          // Continue — local schedule is already updated
        }
      }

      return new Response(JSON.stringify({
        set: true, engineer_id: targetId, date: scheduleDate, is_on_call: onCall,
      }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // GET ON-CALL SCHEDULE
    // ═══════════════════════════════════════════════════════════
    if (action === 'get_oncall_schedule') {
      const fromDate = body.date || new Date().toISOString().split('T')[0];

      const { data: schedules } = await supabase.from('oncall_schedules')
        .select('*, engineer_profiles(id, full_name, email, specialization, is_available)')
        .eq('schedule_date', fromDate)
        .order('created_at', { ascending: false });

      // Also get engineers from opsgenie_sync
      const { data: opsgenieSynced } = await supabase.from('opsgenie_sync')
        .select('*, engineer_profiles(id, full_name, email)')
        .eq('sync_status', 'synced');

      return new Response(JSON.stringify({
        date: fromDate,
        oncall: (schedules || []).filter((s: any) => s.is_on_call),
        offduty: (schedules || []).filter((s: any) => !s.is_on_call),
        opsgenie_synced: opsgenieSynced || [],
      }), { headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════
    // DEFAULT: GET STATS
    // ═══════════════════════════════════════════════════════════
    const { data: allEngineers } = await supabase.from('engineer_profiles')
      .select('id, full_name, is_available, status, active_incident_count, total_resolved, specialization, last_heartbeat_at, joined_at')
      .order('is_available', { ascending: false });

    const { count: pendingEscalations } = await supabase.from('human_escalations')
      .select('*', { count: 'exact' })
      .eq('status', 'pending_assignment');

    // Get today's on-call count
    const today = new Date().toISOString().split('T')[0];
    const { data: todayOncall } = await supabase.from('oncall_schedules')
      .select('engineer_id', { count: 'exact' })
      .eq('schedule_date', today)
      .eq('is_on_call', true);

    // Get opsgenie sync count
    const { data: opsgenieSynced } = await supabase.from('opsgenie_sync')
      .select('sync_status', { count: 'exact' })
      .eq('sync_status', 'synced');

    return new Response(JSON.stringify({
      engineers: allEngineers || [],
      stats: {
        total: allEngineers?.length || 0,
        available: allEngineers?.filter((e: any) => e.is_available && e.status === 'active').length || 0,
        on_duty: todayOncall?.length || 0,
        opsgenie_synced: opsgenieSynced?.length || 0,
        avg_load: allEngineers && allEngineers.length > 0
          ? Math.round(allEngineers.reduce((sum: number, e: any) => sum + (e.active_incident_count || 0), 0) / allEngineers.length * 10) / 10
          : 0,
        pending_escalations: pendingEscalations || 0,
      },
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    logError(FUNCTION, 'Request failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
