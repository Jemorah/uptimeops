// UptimeOps — Engineer Availability Manager
// Tracks on-call status, auto-assignment, heartbeat monitoring, timeout handling

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'engineer-availability';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, engineer_id, incident_id } = body;
    const supabase = getSupabaseClient(req);

    // Heartbeat ping from engineer
    if (action === 'heartbeat') {
      if (!engineer_id) return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });

      await supabase.from('engineer_profiles')
        .update({ last_heartbeat_at: new Date().toISOString(), is_on_call: true })
        .eq('id', engineer_id);

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Get available engineers
    if (action === 'list_available') {
      const { data: engineers } = await supabase.from('engineer_profiles')
        .select('*')
        .eq('is_on_call', true)
        .order('active_incident_count', { ascending: true })
        .limit(20);

      return new Response(JSON.stringify({ engineers: engineers || [] }), { headers: corsHeaders });
    }

    // Auto-assign engineer to incident
    if (action === 'auto_assign') {
      if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

      // Find least-loaded on-call engineer
      const { data: engineer } = await supabase.from('engineer_profiles')
        .select('*')
        .eq('is_on_call', true)
        .order('active_incident_count', { ascending: true })
        .order('last_assigned_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

      if (!engineer) {
        // No engineer available — escalate
        await supabase.from('human_escalations').insert({
          incident_id, trigger_reason: 'no_engineer_available',
          status: 'pending_assignment', reason: 'No on-call engineers available',
        });
        return new Response(JSON.stringify({ assigned: false, reason: 'No engineers available' }), { headers: corsHeaders });
      }

      // Assign engineer
      await supabase.from('incidents')
        .update({ assigned_engineer_id: engineer.id })
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

      logInfo(FUNCTION, 'Auto-assigned engineer', { incident_id, engineer_id: engineer.id, engineer: engineer.name });
      return new Response(JSON.stringify({ assigned: true, engineer }), { headers: corsHeaders });
    }

    // Mark incident as resolved by engineer
    if (action === 'resolve') {
      if (!incident_id || !engineer_id) {
        return new Response(JSON.stringify({ error: 'incident_id and engineer_id required' }), { status: 400, headers: corsHeaders });
      }

      await supabase.from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', incident_id);

      // Decrement engineer's active count
      const { data: eng } = await supabase.from('engineer_profiles').select('active_incident_count, total_resolved').eq('id', engineer_id).single();
      if (eng) {
        await supabase.from('engineer_profiles').update({
          active_incident_count: Math.max(0, (eng.active_incident_count || 1) - 1),
          total_resolved: (eng.total_resolved || 0) + 1,
        }).eq('id', engineer_id);
      }

      // Mark escalation as resolved
      await supabase.from('human_escalations')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('incident_id', incident_id)
        .eq('assigned_engineer_id', engineer_id);

      return new Response(JSON.stringify({ resolved: true }), { headers: corsHeaders });
    }

    // Timeout engineer (coordinator action)
    if (action === 'timeout_engineer') {
      if (!engineer_id) return new Response(JSON.stringify({ error: 'engineer_id required' }), { status: 400, headers: corsHeaders });

      await supabase.from('engineer_profiles')
        .update({ is_on_call: false, last_heartbeat_at: null })
        .eq('id', engineer_id);

      // Reassign their active incidents
      const { data: activeIncidents } = await supabase.from('incidents')
        .select('id').eq('assigned_engineer_id', engineer_id)
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

    // Default: return engineer stats
    const { data: allEngineers } = await supabase.from('engineer_profiles').select('*').order('is_on_call', { ascending: false });
    const { count: pendingEscalations } = await supabase.from('human_escalations').select('*', { count: 'exact' }).eq('status', 'pending_assignment');

    return new Response(JSON.stringify({
      engineers: allEngineers || [],
      pending_escalations: pendingEscalations || 0,
      on_call_count: allEngineers?.filter((e: Record<string, unknown>) => e.is_on_call).length || 0,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Request failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
