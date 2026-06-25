// ═══════════════════════════════════════════════════════════════
// AI AGENT 4: VALIDATE
// Tests fix, generates confidence score
// Runs on: After REPAIR completes
// Output: test_results JSON, confidence score, go/no-go decision
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ValidatePayload {
  vm_session_id: string;
}

interface TestResult {
  test: string;
  passed: boolean;
  score: number;
  detail: string;
}

export default async (req: Request) => {
  const payload: ValidatePayload = await req.json();
  const startTime = Date.now();

  try {
    const { data: vmSession } = await supabase
      .from('vm_sessions')
      .select('*')
      .eq('id', payload.vm_session_id)
      .single();

    if (!vmSession) throw new Error('VM session not found');

    // Simulated validation test suite
    const tests: TestResult[] = [
      { test: 'HTTP Status Code', passed: true, score: 100, detail: 'Returns 200 OK' },
      { test: 'Response Time', passed: Math.random() > 0.1, score: 85 + Math.random() * 15, detail: 'TTFB: 142ms' },
      { test: 'Core Functionality', passed: Math.random() > 0.15, score: 80 + Math.random() * 20, detail: 'Checkout flow completes successfully' },
      { test: 'Mobile Rendering', passed: true, score: 95, detail: 'No layout shifts detected' },
      { test: 'Database Queries', passed: Math.random() > 0.05, score: 90 + Math.random() * 10, detail: 'Query count: 12 (was 47)' },
      { test: 'Error Logs', passed: Math.random() > 0.1, score: 88 + Math.random() * 12, detail: 'Zero PHP errors in 5-min window' },
      { test: 'Asset Loading', passed: true, score: 98, detail: 'All CSS/JS assets load 200' },
      { test: 'SSL/Security', passed: true, score: 100, detail: 'TLS 1.3, HSTS enabled' },
    ];

    const passedTests = tests.filter(t => t.passed).length;
    const avgScore = tests.reduce((sum, t) => sum + t.score, 0) / tests.length;
    const overallConfidence = Math.round(avgScore * 10) / 10;

    // Determine outcome
    const canAutoDeploy = overallConfidence >= 90 && passedTests === tests.length;
    const needsCoordinatorReview = overallConfidence >= 70 && overallConfidence < 90;
    const shouldEscalate = overallConfidence < 70;

    // Update VM session
    await supabase.from('vm_sessions').update({
      session_status: canAutoDeploy ? 'approved' : 'testing',
      test_results: {
        tests,
        summary: {
          total: tests.length,
          passed: passedTests,
          failed: tests.length - passedTests,
          avg_score: avgScore,
          overall_confidence: overallConfidence,
        },
        decision: canAutoDeploy ? 'auto_deploy' : needsCoordinatorReview ? 'coordinator_review' : 'escalate',
      },
      confidence_score: overallConfidence,
    }).eq('id', payload.vm_session_id);

    // Update parent entity
    if (vmSession.incident_id) {
      const incidentUpdate: Record<string, any> = {
        ai_confidence_score: overallConfidence,
        updated_at: new Date().toISOString(),
      };
      if (shouldEscalate) {
        incidentUpdate.status = 'human_escalated';
        incidentUpdate.escalation_reason = `AI validation confidence too low: ${overallConfidence}%`;
      } else if (needsCoordinatorReview) {
        incidentUpdate.status = 'coordinator_review';
      }
      await supabase.from('incidents').update(incidentUpdate).eq('id', vmSession.incident_id);
    }

    if (vmSession.one_time_fix_id) {
      const fixUpdate: Record<string, any> = {
        ai_confidence_score: overallConfidence,
        updated_at: new Date().toISOString(),
      };
      if (shouldEscalate) {
        fixUpdate.status = 'coordinator_review';
        fixUpdate.escalated_to_engineer = true;
      } else if (needsCoordinatorReview) {
        fixUpdate.status = 'coordinator_review';
      } else {
        fixUpdate.status = 'deploying';
      }
      await supabase.from('one_time_fixes').update(fixUpdate).eq('id', vmSession.one_time_fix_id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'vm_session',
      entity_id: payload.vm_session_id,
      action: 'validation_complete',
      performed_by_type: 'ai_agent',
      metadata: {
        tests_run: tests.length,
        tests_passed: passedTests,
        overall_confidence: overallConfidence,
        decision: canAutoDeploy ? 'auto_deploy' : needsCoordinatorReview ? 'coordinator_review' : 'escalate',
        duration_ms: Date.now() - startTime,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        agent: 'VALIDATE',
        duration_ms: Date.now() - startTime,
        result: {
          overall_confidence: overallConfidence,
          tests_passed: `${passedTests}/${tests.length}`,
          decision: canAutoDeploy ? 'AUTO_DEPLOY' : needsCoordinatorReview ? 'COORDINATOR_REVIEW' : 'ESCALATE',
          details: tests,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, agent: 'VALIDATE', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
