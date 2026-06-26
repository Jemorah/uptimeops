// UptimeOps — AI Multi-Agent Orchestrator
// Manages the 6-agent pipeline: Triage → Isolate → Repair → Validate → Deploy → Audit

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'ai-orchestrator';
const AGENTS = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;
const AUTO_DEPLOY_THRESHOLD = 90;

interface PipelineContext {
  incident_id: string;
  pipeline_id: string;
  current_step: string;
  step_results: Record<string, unknown>;
  confidence: number;
}

async function callAgent(agent: string, context: PipelineContext): Promise<{ success: boolean; confidence: number; result: unknown }> {
  logInfo(FUNCTION, `Calling agent: ${agent}`, { pipeline_id: context.pipeline_id });

  // In production, this calls the ANTIGRAVITY SDK or internal agent functions
  // For now, simulate with progressive confidence scoring
  const baseConfidence = context.confidence || 70;
  const randomBoost = Math.floor(Math.random() * 20);
  const confidence = Math.min(98, baseConfidence + randomBoost);

  // Simulate occasional failures for testing escalation
  const success = confidence >= 60 || agent === 'audit';

  return {
    success,
    confidence,
    result: {
      agent,
      timestamp: new Date().toISOString(),
      confidence,
      recommendations: success ? [`${agent}_completed`] : [`${agent}_failed`],
    },
  };
}

async function escalateToHuman(supabase: any, context: PipelineContext, reason: string) {
  logInfo(FUNCTION, 'Escalating to human engineer', { pipeline_id: context.pipeline_id, reason });

  await supabase.from('human_escalations').insert({
    incident_id: context.incident_id,
    pipeline_id: context.pipeline_id,
    trigger_reason: 'ai_pipeline_failure',
    failed_step: context.current_step,
    status: 'pending_assignment',
    reason,
  });

  await supabase.from('pipeline_states')
    .update({ status: 'escalated', updated_at: new Date().toISOString() })
    .eq('pipeline_id', context.pipeline_id);

  await supabase.from('notifications').insert({
    type: 'ai_escalation',
    message: `AI pipeline escalated: ${reason}`,
    entity_type: 'pipeline',
    entity_id: context.pipeline_id,
  });
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const { incident_id, action } = body;

    if (!incident_id) {
      return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient(req);

    // Special action: retry a failed step
    if (action === 'retry') {
      const { data: pipeline } = await supabase.from('pipeline_states')
        .select('*').eq('incident_id', incident_id).single();
      if (!pipeline) return new Response(JSON.stringify({ error: 'Pipeline not found' }), { status: 404, headers: corsHeaders });

      const ctx: PipelineContext = {
        incident_id, pipeline_id: pipeline.pipeline_id,
        current_step: pipeline.current_step, step_results: pipeline.step_results || {},
        confidence: pipeline.confidence || 0,
      };

      const agentResult = await callAgent(pipeline.current_step, ctx);
      await supabase.from('pipeline_states').update({
        confidence: agentResult.confidence,
        step_results: { ...ctx.step_results, [pipeline.current_step]: agentResult.result },
        error_count: (pipeline.error_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('pipeline_id', pipeline.pipeline_id);

      return new Response(JSON.stringify({ retried: true, step: pipeline.current_step, result: agentResult }), { headers: corsHeaders });
    }

    // Get or create pipeline
    let { data: pipeline } = await supabase.from('pipeline_states')
      .select('*').eq('incident_id', incident_id).single();

    if (!pipeline) {
      const pipeline_id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: newPipeline } = await supabase.from('pipeline_states')
        .insert({ pipeline_id, incident_id, current_step: 'triage', status: 'running' })
        .select().single();
      pipeline = newPipeline;
      logInfo(FUNCTION, 'Created new pipeline', { pipeline_id, incident_id });
    }

    if (pipeline.status === 'escalated' || pipeline.status === 'completed') {
      return new Response(JSON.stringify({ pipeline, message: `Pipeline already ${pipeline.status}` }), { headers: corsHeaders });
    }

    // Execute current agent step
    const ctx: PipelineContext = {
      incident_id, pipeline_id: pipeline.pipeline_id,
      current_step: pipeline.current_step,
      step_results: pipeline.step_results || {},
      confidence: pipeline.confidence || 0,
    };

    const agentResult = await callAgent(pipeline.current_step, ctx);

    if (!agentResult.success) {
      await escalateToHuman(supabase, ctx, `Agent ${pipeline.current_step} failed with confidence ${agentResult.confidence}%`);
      return new Response(JSON.stringify({ escalated: true, reason: `${pipeline.current_step} failed`, confidence: agentResult.confidence }), { headers: corsHeaders });
    }

    // Update pipeline with results
    const newStepResults = { ...ctx.step_results, [pipeline.current_step]: agentResult.result };
    const currentIdx = AGENTS.indexOf(pipeline.current_step as typeof AGENTS[number]);
    const nextAgent = AGENTS[currentIdx + 1];

    if (!nextAgent) {
      // All agents completed
      await supabase.from('pipeline_states').update({
        current_step: 'completed',
        status: 'completed',
        confidence: agentResult.confidence,
        step_results: newStepResults,
        updated_at: new Date().toISOString(),
      }).eq('pipeline_id', pipeline.pipeline_id);

      await supabase.from('incidents').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        ai_confidence: agentResult.confidence,
      }).eq('id', incident_id);

      return new Response(JSON.stringify({ completed: true, confidence: agentResult.confidence }), { headers: corsHeaders });
    }

    // Check auto-deploy threshold before deploy step
    const needsApproval = nextAgent === 'deploy' && agentResult.confidence < AUTO_DEPLOY_THRESHOLD;

    await supabase.from('pipeline_states').update({
      current_step: nextAgent,
      status: needsApproval ? 'awaiting_approval' : 'running',
      confidence: agentResult.confidence,
      step_results: newStepResults,
      updated_at: new Date().toISOString(),
    }).eq('pipeline_id', pipeline.pipeline_id);

    if (needsApproval) {
      await supabase.from('notifications').insert({
        type: 'approval_required',
        message: `Pipeline ${pipeline.pipeline_id} requires coordinator approval (confidence: ${agentResult.confidence}%)`,
        entity_type: 'pipeline',
        entity_id: pipeline.pipeline_id,
      });
    }

    return new Response(JSON.stringify({
      step_completed: pipeline.current_step,
      next_step: nextAgent,
      confidence: agentResult.confidence,
      awaiting_approval: needsApproval,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Pipeline execution failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
