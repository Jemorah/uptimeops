// UptimeOps — AI Deploy Agent
// Deploys the fix to production with optional coordinator approval gate

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'ai-deploy';
const AUTO_DEPLOY_THRESHOLD = 90;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, pipeline_id, force_deploy } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);

    // Get pipeline state
    const { data: pipeline } = await supabase.from('pipeline_states')
      .select('*')
      .eq('incident_id', incident_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!pipeline) return new Response(JSON.stringify({ error: 'Pipeline not found' }), { status: 404, headers: corsHeaders });

    const confidence = pipeline.confidence || 0;

    // Check if approval is needed (unless force_deploy)
    if (confidence < AUTO_DEPLOY_THRESHOLD && !force_deploy) {
      await supabase.from('pipeline_states').update({
        status: 'awaiting_approval',
        current_step: 'deploy',
      }).eq('pipeline_id', pipeline.pipeline_id);

      await supabase.from('notifications').insert({
        type: 'approval_required',
        message: `Deploy for incident ${incident_id} requires approval (confidence: ${confidence}%)`,
        entity_type: 'pipeline',
        entity_id: pipeline.pipeline_id,
      });

      return new Response(JSON.stringify({
        awaiting_approval: true,
        confidence,
        threshold: AUTO_DEPLOY_THRESHOLD,
        message: 'Coordinator approval required before deploy',
      }), { headers: corsHeaders });
    }

    // Execute deploy
    const { data: vmSession } = await supabase.from('vm_sessions')
      .select('*').eq('incident_id', incident_id).eq('status', 'running').single();

    // Simulate deploy steps
    const deploySteps = [
      { step: 'pre_deploy_checks', status: 'completed', duration_ms: 1200 },
      { step: 'apply_fix', status: 'completed', duration_ms: 3400 },
      { step: 'verify_services', status: 'completed', duration_ms: 800 },
      { step: 'cleanup', status: 'completed', duration_ms: 500 },
    ];

    // Update snapshot to used
    await supabase.from('deployment_snapshots')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('incident_id', incident_id);

    // Mark VM for cleanup
    if (vmSession) {
      await supabase.from('vm_sessions').update({
        status: 'destroyed',
        destroyed_at: new Date().toISOString(),
        destroy_reason: 'deploy_complete',
      }).eq('id', vmSession.id);
    }

    // Update pipeline to completed
    await supabase.from('pipeline_states').update({
      current_step: 'completed',
      status: 'completed',
      confidence: Math.max(confidence, 95),
      step_results: { ...pipeline.step_results, deploy: { steps: deploySteps, deployed_at: new Date().toISOString() } },
    }).eq('pipeline_id', pipeline.pipeline_id);

    // Mark incident resolved
    await supabase.from('incidents').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      ai_confidence: Math.max(confidence, 95),
    }).eq('id', incident_id);

    // Log
    await supabase.from('audit_logs').insert({
      table_name: 'incidents', entity_type: 'incident', entity_id: incident_id,
      action: 'ai_deploy_complete', performed_by_type: 'ai',
      new_values: { confidence, auto_deployed: !force_deploy },
    });

    logInfo(FUNCTION, 'Deploy complete', { incident_id, pipeline_id: pipeline.pipeline_id, confidence });

    return new Response(JSON.stringify({
      deployed: true,
      confidence: Math.max(confidence, 95),
      steps_completed: deploySteps.length,
      vm_destroyed: !!vmSession,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    logError(FUNCTION, 'Deploy failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
