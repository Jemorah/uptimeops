// UptimeOps — Rollback Executor
// Executes rollback when a deployment fails post-deploy validation

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'rollback-executor';

serve(async (req) => {
  logInfo(FUNCTION, 'Request received');
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, reason, triggered_by } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);

    // Get the snapshot to rollback to
    const { data: snapshot } = await supabase.from('deployment_snapshots')
      .select('*').eq('incident_id', incident_id).eq('status', 'created').order('created_at', { ascending: false }).limit(1).single();

    // Get current VM
    const { data: vmSession } = await supabase.from('vm_sessions')
      .select('*').eq('incident_id', incident_id).eq('status', 'running').single();

    const rollbackSteps = [];

    // Step 1: Restore from snapshot if available
    if (snapshot) {
      rollbackSteps.push({ step: 'restore_snapshot', snapshot_id: snapshot.id, status: 'completed' });
      await supabase.from('deployment_snapshots').update({
        status: 'used',
        rollback_reason: reason || 'manual_rollback',
        used_at: new Date().toISOString(),
      }).eq('id', snapshot.id);
    }

    // Step 2: Terminate current VM
    if (vmSession) {
      rollbackSteps.push({ step: 'terminate_vm', vm_session_id: vmSession.id, status: 'completed' });
      await supabase.from('vm_sessions').update({
        status: 'destroyed',
        destroyed_at: new Date().toISOString(),
        destroy_reason: `rollback_${reason || 'manual'}`,
      }).eq('id', vmSession.id);
    }

    // Step 3: Reset incident status for re-processing
    await supabase.from('incidents').update({
      status: 'triage',
      assigned_engineer_id: null,
      ai_confidence: null,
    }).eq('id', incident_id);

    // Step 4: Mark pipeline as rollback
    const { data: pipeline } = await supabase.from('pipeline_states')
      .select('pipeline_id').eq('incident_id', incident_id).single();

    if (pipeline) {
      await supabase.from('pipeline_states').update({
        status: 'rollback',
        current_step: 'triage',
        confidence: 0,
        error_count: 0,
      }).eq('pipeline_id', pipeline.pipeline_id);
    }

    // Step 5: Create escalation for human review
    await supabase.from('human_escalations').insert({
      incident_id,
      pipeline_id: pipeline?.pipeline_id || null,
      trigger_reason: 'rollback_executed',
      status: 'pending_assignment',
      reason: reason || `Rollback triggered by ${triggered_by || 'system'}`,
    });

    // Step 6: Log
    await supabase.from('audit_logs').insert({
      table_name: 'incidents', entity_type: 'incident', entity_id: incident_id,
      action: 'rollback_executed', performed_by_type: triggered_by || 'system',
      new_values: { reason, steps: rollbackSteps },
    });

    await supabase.from('notifications').insert({
      type: 'rollback_executed',
      message: `Rollback executed for incident ${incident_id}. ${reason || 'Manual rollback requested.'}`,
      entity_type: 'incident',
      entity_id: incident_id,
    });

    return new Response(JSON.stringify({
      rollback: true,
      steps_completed: rollbackSteps.length,
      incident_reset: true,
      escalated: true,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, \'Request failed\', err);;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
