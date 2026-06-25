// ═══════════════════════════════════════════════════════════════
// AI MASTER ORCHESTRATOR
// Chains all 6 AI agents: TRIAGE → ISOLATE → REPAIR → VALIDATE → DEPLOY → AUDIT
// Triggered by: Database webhooks on incident/one_time_fix status changes
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const AGENT_ENDPOINTS: Record<string, string> = {
  TRIAGE: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-triage`,
  ISOLATE: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-isolate`,
  REPAIR: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-repair`,
  VALIDATE: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-validate`,
  DEPLOY: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-deploy`,
};

interface OrchestratorPayload {
  incident_id?: string;
  fix_id?: string;
  trigger: 'new_incident' | 'payment_received' | 'status_change' | 'coordinator_approved';
}

async function callAgent(agentName: string, payload: object) {
  const endpoint = AGENT_ENDPOINTS[agentName];
  if (!endpoint) throw new Error(`Unknown agent: ${agentName}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${agentName} failed: ${error}`);
  }

  return response.json();
}

export default async (req: Request) => {
  const payload: OrchestratorPayload = await req.json();
  const pipelineId = `pipeline-${Date.now()}`;
  const pipelineStart = Date.now();

  const results: Record<string, any> = {};

  try {
    // ── STEP 1: TRIAGE ──
    const triageResult = await callAgent('TRIAGE', {
      incident_id: payload.incident_id,
      fix_id: payload.fix_id,
      type: payload.incident_id ? 'incident' : 'one_time_fix',
    });
    results.TRIAGE = triageResult;

    if (!triageResult.success) throw new Error('TRIAGE failed');

    // ── STEP 2: ISOLATE ──
    await new Promise(r => setTimeout(r, 500));
    const isolateResult = await callAgent('ISOLATE', {
      incident_id: payload.incident_id,
      fix_id: payload.fix_id,
    });
    results.ISOLATE = isolateResult;

    if (!isolateResult.success) throw new Error('ISOLATE failed');

    const vmSessionId = isolateResult.result?.vm_session_id;

    // ── STEP 3: REPAIR ──
    await new Promise(r => setTimeout(r, 500));
    const repairResult = await callAgent('REPAIR', {
      vm_session_id: vmSessionId,
      incident_id: payload.incident_id,
      fix_id: payload.fix_id,
    });
    results.REPAIR = repairResult;

    if (!repairResult.success) throw new Error('REPAIR failed');

    // ── STEP 4: VALIDATE ──
    await new Promise(r => setTimeout(r, 500));
    const validateResult = await callAgent('VALIDATE', {
      vm_session_id: vmSessionId,
    });
    results.VALIDATE = validateResult;

    if (!validateResult.success) throw new Error('VALIDATE failed');

    // ── STEP 5: DEPLOY (with coordinator gate) ──
    const confidence = validateResult.result?.overall_confidence || 0;

    if (confidence >= 90) {
      // Auto-deploy path
      await new Promise(r => setTimeout(r, 500));
      const deployResult = await callAgent('DEPLOY', {
        vm_session_id: vmSessionId,
        approved: true,
      });
      results.DEPLOY = deployResult;
    } else {
      // Requires coordinator approval
      results.DEPLOY = {
        success: false,
        reason: 'AWAITING_COORDINATOR_APPROVAL',
        confidence,
        vm_session_id: vmSessionId,
      };
    }

    // ── STEP 6: AUDIT (always runs) ──
    await supabase.from('audit_logs').insert({
      entity_type: payload.incident_id ? 'incident' : 'one_time_fix',
      entity_id: payload.incident_id || payload.fix_id!,
      action: 'pipeline_complete',
      performed_by_type: 'system',
      metadata: {
        pipeline_id: pipelineId,
        total_duration_ms: Date.now() - pipelineStart,
        agents_run: Object.keys(results),
        final_confidence: confidence,
        auto_deployed: confidence >= 90,
        results,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        pipeline_id: pipelineId,
        total_duration_ms: Date.now() - pipelineStart,
        confidence,
        auto_deployed: confidence >= 90,
        agents: results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log pipeline failure
    await supabase.from('audit_logs').insert({
      entity_type: payload.incident_id ? 'incident' : 'one_time_fix',
      entity_id: payload.incident_id || payload.fix_id!,
      action: 'pipeline_failed',
      performed_by_type: 'system',
      metadata: {
        pipeline_id: pipelineId,
        error: errorMessage,
        completed_agents: Object.keys(results),
        results,
      },
    });

    return new Response(
      JSON.stringify({
        success: false,
        pipeline_id: pipelineId,
        error: errorMessage,
        completed_agents: results,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
