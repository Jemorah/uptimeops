// UptimeOps v2.1 — AI Multi-Agent Orchestrator
// Manages the 6-agent pipeline: Triage → Isolate → Repair → Validate → Deploy → Audit
// Integrates with scanner_registry (42 scanners) and scan_results tables

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'ai-orchestrator';
const AUTO_DEPLOY_THRESHOLD = 90;
const STAGE_ORDER = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;

type Stage = typeof STAGE_ORDER[number];

interface OrchestratorRequest {
  incident_id: string;
  action?: 'start' | 'retry' | 'approve' | 'status';
  stage?: Stage;
}

interface StageResult {
  success: boolean;
  scanners_triggered: number;
  stage: Stage;
  confidence: number;
  error?: string;
}

async function getIncident(supabase: any, incident_id: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*, customers(*)')
    .eq('id', incident_id)
    .single();
  if (error) throw error;
  return data;
}

async function getScannersForStage(supabase: any, stage: Stage) {
  const { data, error } = await supabase
    .from('scanner_registry')
    .select('*')
    .eq('category', stage)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

async function createScanEntries(supabase: any, incident_id: string, scanners: any[], stage: Stage) {
  const entries = scanners.map(s => ({
    incident_id,
    agent_stage: stage,
    scanner_id: s.id,
    scanner_name: s.name,
    status: 'pending' as const,
    findings: {},
    severity_counts: {},
  }));

  const { data, error } = await supabase
    .from('scan_results')
    .insert(entries)
    .select();

  if (error) throw error;
  return data || [];
}

async function invokeStageFunction(
  stage: Stage,
  incident_id: string,
  pipeline_id: string,
  scan_ids: string[],
  website_url?: string
): Promise<StageResult> {
  const functionName = `ai-${stage}`;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  logInfo(FUNCTION, `Invoking ${functionName}`, { pipeline_id, scan_count: scan_ids.length });

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ incident_id, pipeline_id, scan_ids, website_url }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`${functionName} returned ${resp.status}: ${err}`);
    }

    const result = await resp.json();
    return {
      success: result.success !== false,
      scanners_triggered: scan_ids.length,
      stage,
      confidence: result.confidence || 0,
    };
  } catch (err) {
    logError(FUNCTION, `${functionName} invocation failed`, err, { pipeline_id, stage });
    return {
      success: false,
      scanners_triggered: scan_ids.length,
      stage,
      confidence: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function updatePipeline(
  supabase: any,
  pipeline_id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('pipeline_states')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('pipeline_id', pipeline_id);
  if (error) throw error;
}

async function createNotification(supabase: any, type: string, message: string, entity_id: string) {
  await supabase.from('notifications').insert({
    type,
    message,
    entity_type: 'pipeline',
    entity_id,
  });
}

async function escalateToHuman(
  supabase: any,
  incident_id: string,
  pipeline_id: string,
  failed_stage: Stage,
  reason: string
) {
  logInfo(FUNCTION, 'Escalating to human', { pipeline_id, failed_stage, reason });

  await supabase.from('human_escalations').insert({
    incident_id,
    pipeline_id,
    trigger_reason: 'ai_pipeline_failure',
    failed_step: failed_stage,
    status: 'pending_assignment',
    reason,
  });

  await updatePipeline(supabase, pipeline_id, {
    status: 'escalated',
    current_step: failed_stage,
  });

  await createNotification(supabase, 'ai_escalation',
    `Pipeline ${pipeline_id} escalated: ${reason}`, pipeline_id);
}

async function runStage(
  supabase: any,
  incident_id: string,
  pipeline_id: string,
  stage: Stage,
  website_url?: string
): Promise<StageResult> {
  // 1. Get scanners for this stage
  const scanners = await getScannersForStage(supabase, stage);
  if (!scanners.length) {
    logInfo(FUNCTION, `No active scanners for stage ${stage}`, { pipeline_id });
    return { success: true, scanners_triggered: 0, stage, confidence: 0 };
  }

  // 2. Create scan_result entries
  const scanEntries = await createScanEntries(supabase, incident_id, scanners, stage);
  const scan_ids = scanEntries.map(e => e.id);

  // 3. Update pipeline to show running scanners
  await updatePipeline(supabase, pipeline_id, {
    current_step: stage,
    status: 'running',
    step_results: { stage_status: `${stage}_running`, scanner_count: scanners.length },
  });

  // 4. Invoke the stage function
  const result = await invokeStageFunction(stage, incident_id, pipeline_id, scan_ids, website_url);

  // 5. Update scan entries based on result
  if (!result.success) {
    await supabase
      .from('scan_results')
      .update({ status: 'failed' })
      .in('id', scan_ids);
  }

  return result;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: OrchestratorRequest = await req.json().catch(() => ({ incident_id: '' }));
    const { incident_id, action = 'start', stage } = body;

    if (!incident_id) {
      return new Response(
        JSON.stringify({ error: 'incident_id is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient(req);
    const user = getAuthUser(req);

    // Get or create pipeline
    let { data: pipeline } = await supabase
      .from('pipeline_states')
      .select('*')
      .eq('incident_id', incident_id)
      .single();

    if (!pipeline) {
      const pipeline_id = `pl-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      const { data: newPipeline } = await supabase
        .from('pipeline_states')
        .insert({ pipeline_id, incident_id, current_step: 'triage', status: 'pending' })
        .select()
        .single();
      pipeline = newPipeline;
      logInfo(FUNCTION, 'Created pipeline', { pipeline_id, incident_id });
    }

    // Handle status check
    if (action === 'status') {
      // Get scan results summary
      const { data: scans } = await supabase
        .from('scan_results')
        .select('agent_stage, status, confidence_score')
        .eq('incident_id', incident_id);

      return new Response(JSON.stringify({
        pipeline,
        scan_summary: scans || [],
        stage_order: STAGE_ORDER,
      }), { headers: corsHeaders });
    }

    // Handle retry
    if (action === 'retry' && stage) {
      const incident = await getIncident(supabase, incident_id);
      const result = await runStage(supabase, incident_id, pipeline.pipeline_id, stage, incident.customers?.website);
      return new Response(JSON.stringify({ retried: true, stage, result }), { headers: corsHeaders });
    }

    // Handle approval (for deploy stage)
    if (action === 'approve') {
      if (pipeline.status !== 'awaiting_approval') {
        return new Response(
          JSON.stringify({ error: 'Pipeline not awaiting approval' }),
          { status: 400, headers: corsHeaders }
        );
      }
      await updatePipeline(supabase, pipeline.pipeline_id, {
        status: 'running',
        current_step: 'deploy',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });

      const incident = await getIncident(supabase, incident_id);
      const result = await runStage(supabase, incident_id, pipeline.pipeline_id, 'deploy', incident.customers?.website);

      if (!result.success) {
        await escalateToHuman(supabase, incident_id, pipeline.pipeline_id, 'deploy',
          `Deploy failed: ${result.error || 'unknown'}`);
        return new Response(JSON.stringify({ escalated: true, stage: 'deploy', result }), { headers: corsHeaders });
      }

      // Continue to audit
      const auditResult = await runStage(supabase, incident_id, pipeline.pipeline_id, 'audit', incident.customers?.website);

      // Complete pipeline
      await updatePipeline(supabase, pipeline.pipeline_id, {
        current_step: 'completed',
        status: 'completed',
        confidence: auditResult.confidence,
        completed_at: new Date().toISOString(),
      });

      await supabase.from('incidents').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      }).eq('id', incident_id);

      return new Response(JSON.stringify({ completed: true, stage: 'audit', result: auditResult }), { headers: corsHeaders });
    }

    // Determine current stage to run
    const currentStage = pipeline.current_step as Stage;
    if (!STAGE_ORDER.includes(currentStage) && currentStage !== 'completed' && currentStage !== 'escalated') {
      return new Response(
        JSON.stringify({ error: `Invalid pipeline stage: ${currentStage}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (currentStage === 'completed' || currentStage === 'escalated') {
      return new Response(
        JSON.stringify({ pipeline, message: `Pipeline already ${currentStage}` }),
        { headers: corsHeaders }
      );
    }

    // Get incident data
    const incident = await getIncident(supabase, incident_id);

    // Run current stage
    const result = await runStage(supabase, incident_id, pipeline.pipeline_id, currentStage, incident.customers?.website);

    if (!result.success) {
      await escalateToHuman(supabase, incident_id, pipeline.pipeline_id, currentStage,
        `Stage ${currentStage} failed: ${result.error || 'unknown'}`);
      return new Response(
        JSON.stringify({ escalated: true, stage: currentStage, result }),
        { headers: corsHeaders }
      );
    }

    // Determine next stage
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const nextStage = STAGE_ORDER[currentIdx + 1];

    if (!nextStage) {
      // All stages completed
      await updatePipeline(supabase, pipeline.pipeline_id, {
        current_step: 'completed',
        status: 'completed',
        confidence: result.confidence,
        completed_at: new Date().toISOString(),
      });

      await supabase.from('incidents').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      }).eq('id', incident_id);

      return new Response(
        JSON.stringify({ completed: true, pipeline_id: pipeline.pipeline_id, confidence: result.confidence }),
        { headers: corsHeaders }
      );
    }

    // Check auto-deploy threshold
    const needsApproval = nextStage === 'deploy' && result.confidence < AUTO_DEPLOY_THRESHOLD;

    await updatePipeline(supabase, pipeline.pipeline_id, {
      current_step: nextStage,
      status: needsApproval ? 'awaiting_approval' : 'running',
      confidence: result.confidence,
      step_results: {
        ...pipeline.step_results,
        [currentStage]: { completed: true, confidence: result.confidence, scanners: result.scanners_triggered },
      },
    });

    if (needsApproval) {
      await createNotification(supabase, 'approval_required',
        `Pipeline ${pipeline.pipeline_id} requires approval before deploy (confidence: ${result.confidence}%)`,
        pipeline.pipeline_id);
    }

    return new Response(JSON.stringify({
      stage_completed: currentStage,
      next_stage: nextStage,
      confidence: result.confidence,
      scanners_triggered: result.scanners_triggered,
      awaiting_approval: needsApproval,
      pipeline_id: pipeline.pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Orchestrator failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
