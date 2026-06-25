// ═══════════════════════════════════════════════════════════════
// FUNCTION 2: ai-orchestrator
// State machine: triage → isolate → repair → validate → approve → deploy
// Error handling: Timeout, retry (max 3), escalation on failure
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const AGENT_ENDPOINTS: Record<string, string> = {
  triage:   `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-triage`,
  isolate:  `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-isolate`,
  repair:   `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-repair`,
  validate: `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-validate`,
  deploy:   `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-deploy`,
};

const STEP_ORDER = ['triage', 'isolate', 'repair', 'validate', 'deploy'] as const;
type Step = typeof STEP_ORDER[number];

interface PipelineState {
  pipeline_id: string;
  incident_id?: string;
  fix_id?: string;
  current_step: Step;
  step_results: Record<string, { success: boolean; data?: unknown; error?: string; attempts: number }>;
  confidence: number;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'escalated';
  started_at: string;
  updated_at: string;
  error_count: number;
}

const STEP_TIMEOUT = 60000; // 60 seconds per step
const MAX_RETRIES = 3;
const AUTO_DEPLOY_THRESHOLD = 90;

async function callAgent(step: Step, payload: object, attempt = 1): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const endpoint = AGENT_ENDPOINTS[step];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STEP_TIMEOUT);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${step} returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);

    if (attempt < MAX_RETRIES && !msg.includes('ABORT')) {
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, backoff));
      return callAgent(step, payload, attempt + 1);
    }

    return { success: false, error: msg };
  }
}

async function persistState(state: PipelineState) {
  await supabase.from('pipeline_states').upsert({
    pipeline_id: state.pipeline_id,
    incident_id: state.incident_id,
    fix_id: state.fix_id,
    current_step: state.current_step,
    step_results: state.step_results,
    confidence: state.confidence,
    status: state.status,
    started_at: state.started_at,
    updated_at: new Date().toISOString(),
    error_count: state.error_count,
  }, { onConflict: 'pipeline_id' });
}

async function escalateToEngineer(state: PipelineState, reason: string) {
  state.status = 'escalated';
  await persistState(state);

  // Create human escalation record
  await supabase.from('human_escalations').insert({
    incident_id: state.incident_id,
    fix_id: state.fix_id,
    trigger: 'ai_pipeline_failure',
    reason,
    pipeline_id: state.pipeline_id,
    failed_step: state.current_step,
    status: 'pending_assignment',
  });

  // Notify via communication-sender
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'ai_escalation',
      entity_type: 'incident',
      entity_id: state.incident_id,
      channel: 'dashboard',
      metadata: { pipeline_id: state.pipeline_id, reason, failed_step: state.current_step },
    }),
  });

  // Log
  await supabase.from('audit_logs').insert({
    entity_type: 'pipeline',
    entity_id: state.pipeline_id,
    action: 'pipeline_escalated',
    performed_by_type: 'system',
    new_values: { status: 'escalated', reason, failed_step: state.current_step },
    metadata: { step_results: state.step_results },
  });
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = await req.json();
  const pipelineId = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  const state: PipelineState = {
    pipeline_id: pipelineId,
    incident_id: payload.incident_id,
    fix_id: payload.fix_id,
    current_step: 'triage',
    step_results: {},
    confidence: 0,
    status: 'running',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    error_count: 0,
  };

  try {
    // ── STEP 1: TRIAGE ──
    const triageResult = await callAgent('triage', {
      incident_id: state.incident_id,
      fix_id: state.fix_id,
      type: payload.incident_id ? 'incident' : 'one_time_fix',
    });
    state.step_results.triage = { ...triageResult, attempts: triageResult.success ? 1 : MAX_RETRIES };
    if (!triageResult.success) {
      await escalateToEngineer(state, `TRIAGE failed: ${triageResult.error}`);
      return new Response(JSON.stringify({
        success: false, pipeline_id: pipelineId, status: 'escalated',
        reason: 'TRIAGE failed after max retries', error: triageResult.error,
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    state.current_step = 'isolate';

    // ── STEP 2: ISOLATE ──
    const isolateResult = await callAgent('isolate', {
      incident_id: state.incident_id,
      fix_id: state.fix_id,
      triage_data: triageResult.data,
    });
    state.step_results.isolate = { ...isolateResult, attempts: isolateResult.success ? 1 : MAX_RETRIES };
    if (!isolateResult.success) {
      await escalateToEngineer(state, `ISOLATE failed: ${isolateResult.error}`);
      return new Response(JSON.stringify({
        success: false, pipeline_id: pipelineId, status: 'escalated',
        reason: 'ISOLATE failed after max retries', error: isolateResult.error,
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    const vmSessionId = (isolateResult.data as Record<string, unknown>)?.vm_session_id as string;
    state.current_step = 'repair';

    // ── STEP 3: REPAIR ──
    const repairResult = await callAgent('repair', {
      vm_session_id: vmSessionId,
      incident_id: state.incident_id,
      fix_id: state.fix_id,
      triage_data: triageResult.data,
    });
    state.step_results.repair = { ...repairResult, attempts: repairResult.success ? 1 : MAX_RETRIES };
    if (!repairResult.success) {
      await escalateToEngineer(state, `REPAIR failed: ${repairResult.error}`);
      // Destroy VM
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vm-manager`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'destroy', vm_session_id: vmSessionId }),
      });
      return new Response(JSON.stringify({
        success: false, pipeline_id: pipelineId, status: 'escalated',
        reason: 'REPAIR failed after max retries', error: repairResult.error,
      }), { headers: { 'Content-Type': 'application/json' } });
    }
    state.current_step = 'validate';

    // ── STEP 4: VALIDATE ──
    const validateResult = await callAgent('validate', {
      vm_session_id: vmSessionId,
      incident_id: state.incident_id,
      fix_id: state.fix_id,
    });
    state.step_results.validate = { ...validateResult, attempts: validateResult.success ? 1 : MAX_RETRIES };
    if (!validateResult.success) {
      await escalateToEngineer(state, `VALIDATE failed: ${validateResult.error}`);
      return new Response(JSON.stringify({
        success: false, pipeline_id: pipelineId, status: 'escalated',
        reason: 'VALIDATE failed after max retries', error: validateResult.error,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    state.confidence = (validateResult.data as Record<string, unknown>)?.overall_confidence as number || 0;
    state.current_step = 'deploy';

    // ── STEP 5: DEPLOY ──
    if (state.confidence >= AUTO_DEPLOY_THRESHOLD) {
      // Auto-deploy with coordinator approval bypass
      const deployResult = await callAgent('deploy', {
        vm_session_id: vmSessionId,
        incident_id: state.incident_id,
        fix_id: state.fix_id,
        auto_approved: true,
        confidence: state.confidence,
      });
      state.step_results.deploy = { ...deployResult, attempts: deployResult.success ? 1 : MAX_RETRIES };

      if (!deployResult.success) {
        // Smoke test failed — trigger rollback
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rollback-executor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incident_id: state.incident_id,
            vm_session_id: vmSessionId,
            pipeline_id: state.pipeline_id,
            reason: 'deploy_smoke_test_failed',
          }),
        });
        state.status = 'failed';
        await persistState(state);
        return new Response(JSON.stringify({
          success: false, pipeline_id: pipelineId, status: 'rollback_triggered',
          reason: 'Deploy smoke test failed, rollback initiated',
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      state.status = 'completed';
      await persistState(state);

      // Smoke test — call rollback-executor to verify
      const smokeResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rollback-executor`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'smoke_test',
          incident_id: state.incident_id,
          vm_session_id: vmSessionId,
          pipeline_id: state.pipeline_id,
        }),
      });

      if (!smokeResult.ok) {
        // Smoke test failed → auto-rollback
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rollback-executor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rollback',
            incident_id: state.incident_id,
            vm_session_id: vmSessionId,
            pipeline_id: state.pipeline_id,
            reason: 'post_deploy_smoke_test_failed',
          }),
        });
        state.status = 'failed';
        await persistState(state);
        return new Response(JSON.stringify({
          success: false, pipeline_id: pipelineId, status: 'rollback_triggered',
          reason: 'Post-deploy smoke test failed, auto-rollback executed',
        }), { headers: { 'Content-Type': 'application/json' } });
      }

    } else {
      // Below threshold → require coordinator approval
      state.status = 'awaiting_approval';
      await persistState(state);

      // Notify coordinators
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'approval_required',
          entity_type: 'pipeline',
          entity_id: state.pipeline_id,
          channel: 'dashboard',
          metadata: {
            confidence: state.confidence,
            threshold: AUTO_DEPLOY_THRESHOLD,
            incident_id: state.incident_id,
            vm_session_id: vmSessionId,
          },
        }),
      });

      return new Response(JSON.stringify({
        success: true, pipeline_id: pipelineId, status: 'awaiting_approval',
        confidence: state.confidence, threshold: AUTO_DEPLOY_THRESHOLD,
        vm_session_id: vmSessionId,
        message: `Confidence ${state.confidence}% below ${AUTO_DEPLOY_THRESHOLD}%. Awaiting coordinator approval.`,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── Cleanup: Destroy VM ──
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vm-manager`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'destroy', vm_session_id: vmSessionId }),
    });

    // ── Final Audit Log ──
    const totalDuration = Date.now() - startTime;
    await supabase.from('audit_logs').insert({
      entity_type: 'pipeline',
      entity_id: pipelineId,
      action: 'pipeline_complete',
      performed_by_type: 'system',
      new_values: { status: state.status, confidence: state.confidence },
      metadata: {
        total_duration_ms: totalDuration,
        steps_completed: Object.keys(state.step_results),
        auto_deployed: state.confidence >= AUTO_DEPLOY_THRESHOLD,
        step_results: state.step_results,
      },
    });

    // Update incident status
    if (state.incident_id) {
      await supabase.from('incidents').update({
        status: state.status === 'completed' ? 'resolved' : state.status,
        ai_confidence: state.confidence,
        resolved_at: state.status === 'completed' ? new Date().toISOString() : null,
      }).eq('id', state.incident_id);
    }

    return new Response(JSON.stringify({
      success: true, pipeline_id: pipelineId, status: state.status,
      confidence: state.confidence, auto_deployed: state.confidence >= AUTO_DEPLOY_THRESHOLD,
      total_duration_ms: totalDuration, steps: state.step_results,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Pipeline failed';
    state.status = 'failed';
    state.error_count += 1;
    await persistState(state);

    await supabase.from('audit_logs').insert({
      entity_type: 'pipeline',
      entity_id: pipelineId,
      action: 'pipeline_failed',
      performed_by_type: 'system',
      metadata: { error: msg, state },
    });

    return new Response(JSON.stringify({
      success: false, pipeline_id: pipelineId, error: msg,
      status: 'failed', steps_completed: Object.keys(state.step_results),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
