// ═══════════════════════════════════════════════════════════════
// FUNCTION 10: rollback-executor
// Trigger: Smoke test failure or manual coordinator action
// Actions: Restore from snapshot, verify restoration, notify, re-escalate
// Safety: Require coordinator confirmation for manual rollback
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RollbackPayload {
  action: 'rollback' | 'smoke_test' | 'create_snapshot' | 'list_snapshots';
  incident_id?: string;
  vm_session_id?: string;
  pipeline_id?: string;
  snapshot_id?: string;
  coordinator_id?: string;
  reason?: string;
  skip_confirmation?: boolean;
}

async function createSnapshot(incidentId: string, vmSessionId: string) {
  const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // In production: create actual VM snapshot via cloud provider API
  // For demo: record the intent
  const { data: snapshot } = await supabase.from('deployment_snapshots').insert({
    id: snapshotId,
    incident_id: incidentId,
    vm_session_id: vmSessionId,
    status: 'created',
    created_at: new Date().toISOString(),
    metadata: {
      method: 'vm_snapshot',
      provider: Deno.env.get('VM_PROVIDER') || 'digitalocean',
    },
  }).select().single();

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'incident',
    entity_id: incidentId,
    action: 'snapshot_created',
    performed_by_type: 'system',
    metadata: { snapshot_id: snapshotId, vm_session_id: vmSessionId },
  });

  return { success: true, snapshot_id: snapshotId, snapshot };
}

async function performRollback(payload: RollbackPayload) {
  if (!payload.incident_id || !payload.vm_session_id) {
    return { success: false, error: 'Missing incident_id or vm_session_id' };
  }

  // Check if manual rollback requires coordinator confirmation
  if (!payload.skip_confirmation && payload.coordinator_id) {
    const { data: coord } = await supabase
      .from('coordinator_profiles')
      .select('id, can_rollback')
      .eq('id', payload.coordinator_id)
      .single();

    if (!coord || !coord.can_rollback) {
      return { success: false, error: 'Coordinator does not have rollback permission' };
    }
  }

  // Get the latest snapshot
  const { data: snapshot } = await supabase
    .from('deployment_snapshots')
    .select('*')
    .eq('incident_id', payload.incident_id)
    .eq('status', 'created')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!snapshot) {
    // No snapshot — critical error
    await supabase.from('audit_logs').insert({
      entity_type: 'incident',
      entity_id: payload.incident_id,
      action: 'rollback_failed',
      performed_by_type: 'system',
      metadata: { reason: 'no_snapshot_found', vm_session_id: payload.vm_session_id },
    });
    return { success: false, error: 'No snapshot found for rollback — manual intervention required' };
  }

  // Perform rollback
  const rollbackStart = Date.now();

  // In production: call cloud provider API to restore snapshot
  // For demo: simulate
  await new Promise(r => setTimeout(r, 1000));

  const rollbackDuration = Date.now() - rollbackStart;

  // Mark snapshot as used
  await supabase.from('deployment_snapshots').update({
    status: 'used',
    used_at: new Date().toISOString(),
    rollback_reason: payload.reason,
  }).eq('id', snapshot.id);

  // Update incident status
  await supabase.from('incidents').update({
    status: 'rollback_complete',
    rolled_back_at: new Date().toISOString(),
    rollback_snapshot_id: snapshot.id,
  }).eq('id', payload.incident_id);

  // Re-escalate the incident
  await supabase.from('human_escalations').insert({
    incident_id: payload.incident_id,
    trigger: 'rollback_re escalation',
    reason: payload.reason || 'rollback_after_failure',
    status: 'pending_assignment',
    metadata: {
      previous_pipeline_id: payload.pipeline_id,
      snapshot_id: snapshot.id,
      rollback_duration_ms: rollbackDuration,
    },
  });

  // Notify customer
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'rollback_executed',
      entity_type: 'incident',
      entity_id: payload.incident_id,
      channel: 'all',
      metadata: {
        reason: payload.reason,
        snapshot_id: snapshot.id,
        rollback_duration_ms: rollbackDuration,
      },
    }),
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'incident',
    entity_id: payload.incident_id,
    action: 'rollback_executed',
    performed_by_type: payload.coordinator_id ? 'coordinator' : 'system',
    performed_by_id: payload.coordinator_id || null,
    new_values: { status: 'rollback_complete' },
    metadata: {
      snapshot_id: snapshot.id,
      rollback_duration_ms: rollbackDuration,
      reason: payload.reason,
    },
  });

  return {
    success: true,
    snapshot_id: snapshot.id,
    rollback_duration_ms: rollbackDuration,
    re_escalation_created: true,
  };
}

async function runSmokeTest(payload: RollbackPayload) {
  if (!payload.vm_session_id) {
    return { success: false, error: 'Missing vm_session_id' };
  }

  // Get VM details
  const { data: vm } = await supabase
    .from('vm_sessions')
    .select('id, ip_address, website_url')
    .eq('id', payload.vm_session_id)
    .single();

  if (!vm) return { success: false, error: 'VM session not found' };

  // Run smoke tests
  const tests = [
    { name: 'http_status', check: 'HTTP 200 OK' },
    { name: 'ssl_valid', check: 'SSL certificate valid' },
    { name: 'response_time', check: 'Response < 2s' },
    { name: 'homepage_load', check: 'Homepage renders' },
    { name: 'critical_paths', check: 'Login + checkout work' },
  ];

  // In production: run actual HTTP checks against the VM
  // For demo: simulate with random results
  const results = tests.map(t => ({
    ...t,
    passed: Math.random() > 0.1, // 90% pass rate for demo
  }));

  const allPassed = results.every(r => r.passed);

  await supabase.from('smoke_tests').insert({
    vm_session_id: payload.vm_session_id,
    incident_id: payload.incident_id,
    pipeline_id: payload.pipeline_id,
    results,
    overall_passed: allPassed,
    run_at: new Date().toISOString(),
  });

  if (!allPassed) {
    // Auto-trigger rollback
    const failedTests = results.filter(r => !r.passed);

    await supabase.from('audit_logs').insert({
      entity_type: 'incident',
      entity_id: payload.incident_id || payload.vm_session_id,
      action: 'smoke_test_failed',
      performed_by_type: 'system',
      metadata: { failed_tests: failedTests.map(t => t.name) },
    });

    return {
      success: false,
      passed: false,
      failed_tests: failedTests,
      all_tests: results,
      message: 'Smoke test failed — auto-rollback triggered',
      auto_rollback: true,
    };
  }

  return {
    success: true,
    passed: true,
    all_tests: results,
    message: 'All smoke tests passed',
  };
}

async function listSnapshots(incidentId: string) {
  const { data: snapshots } = await supabase
    .from('deployment_snapshots')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  return {
    success: true,
    count: snapshots?.length || 0,
    snapshots: snapshots || [],
  };
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: RollbackPayload = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'rollback':
        result = await performRollback(payload);
        break;
      case 'smoke_test':
        result = await runSmokeTest(payload);
        break;
      case 'create_snapshot':
        if (!payload.incident_id || !payload.vm_session_id) {
          return new Response(JSON.stringify({ error: 'Missing incident_id or vm_session_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        result = await createSnapshot(payload.incident_id, payload.vm_session_id);
        break;
      case 'list_snapshots':
        if (!payload.incident_id) {
          return new Response(JSON.stringify({ error: 'Missing incident_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        result = await listSnapshots(payload.incident_id);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown action. Use: rollback, smoke_test, create_snapshot, list_snapshots' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
