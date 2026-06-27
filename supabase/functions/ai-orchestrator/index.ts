// UptimeOps — AI Multi-Agent Orchestrator
// Manages the 6-agent pipeline: Triage → Isolate → Repair → Validate → Deploy → Audit
// Uses real AI via Anthropic/OpenAI/LangSmith fallback chain

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI } from '../_shared/ai.ts';

const FUNCTION = 'ai-orchestrator';
const AUTO_DEPLOY_THRESHOLD = 90;

interface PipelineContext {
  incident_id: string;
  pipeline_id: string;
  current_step: string;
  step_results: Record<string, unknown>;
  confidence: number;
}

async function executeAgent(agent: string, context: PipelineContext): Promise<{ success: boolean; confidence: number; result: unknown }> {
  logInfo(FUNCTION, `Executing agent: ${agent}`, { pipeline_id: context.pipeline_id });

  const supabase = getSupabaseClient();

  // Fetch incident details
  const { data: incident } = await supabase.from('incidents')
    .select('*, customers(email, website)').eq('id', context.incident_id).single();

  const systemPrompt = `You are the ${agent.toUpperCase()} agent in an infrastructure incident response pipeline. Analyze the incident and provide structured JSON output with your findings. Be concise and technical.`;

  const prompt = `Incident: "${incident?.title || 'Unknown'}"\nDescription: "${incident?.description || 'No description'}"\nWebsite: ${incident?.website_url || 'unknown'}\nPriority: ${incident?.priority || 'unknown'}\n\nAs the ${agent.toUpperCase()} agent, analyze this incident and provide:\n1. Your assessment\n2. Recommended actions\n3. Confidence score (0-100)\n4. Whether the step passed or failed\n\nRespond in JSON format with keys: assessment, actions (array), confidence (number), passed (boolean).`;

  const aiResponse = await callAI(prompt, systemPrompt);

  // Parse structured response
  const parsed = aiResponse.content.match(/\{[\s\S]*\}/);
  let result: Record<string, unknown> = {
    agent,
    provider: aiResponse.provider,
    model: aiResponse.model,
    timestamp: new Date().toISOString(),
  };
  let confidence = 50;
  let success = true;

  if (parsed) {
    try {
      const json = JSON.parse(parsed[0]);
      result = { ...result, ...json };
      confidence = Math.min(100, Math.max(0, Number(json.confidence) || 50));
      success = json.passed !== false;
    } catch {
      result.raw_response = aiResponse.content;
    }
  } else {
    result.raw_response = aiResponse.content;
    // Extract confidence from text
    const confidenceMatch = aiResponse.content.match(/confidence[:\s]+(\d+)/i);
    if (confidenceMatch) confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1])));
    success = !aiResponse.content.toLowerCase().includes('failed') && !aiResponse.content.toLowerCase().includes('cannot');
  }

  return { success, confidence, result };
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

    // Retry a failed step
    if (action === 'retry') {
      const { data: pipeline } = await supabase.from('pipeline_states')
        .select('*').eq('incident_id', incident_id).single();
      if (!pipeline) return new Response(JSON.stringify({ error: 'Pipeline not found' }), { status: 404, headers: corsHeaders });

      const ctx: PipelineContext = {
        incident_id, pipeline_id: pipeline.pipeline_id,
        current_step: pipeline.current_step, step_results: pipeline.step_results || {},
        confidence: pipeline.confidence || 0,
      };

      const agentResult = await executeAgent(pipeline.current_step, ctx);
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

    const agentResult = await executeAgent(pipeline.current_step, ctx);

    if (!agentResult.success) {
      await escalateToHuman(supabase, ctx, `Agent ${pipeline.current_step} failed with confidence ${agentResult.confidence}%`);
      return new Response(JSON.stringify({ escalated: true, reason: `${pipeline.current_step} failed`, confidence: agentResult.confidence }), { headers: corsHeaders });
    }

    // Update pipeline with results
    const newStepResults = { ...ctx.step_results, [pipeline.current_step]: agentResult.result };
    const agents = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'];
    const currentIdx = agents.indexOf(pipeline.current_step as typeof agents[number]);
    const nextAgent = agents[currentIdx + 1];

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
      provider: (agentResult.result as Record<string, unknown>)?.provider || 'unknown',
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Pipeline execution failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
