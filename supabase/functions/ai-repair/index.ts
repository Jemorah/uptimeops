// ═══════════════════════════════════════════════════════════════
// AI AGENT 3: REPAIR
// Executes fix on isolated VM
// Runs on: After ISOLATE completes (site cloned)
// Output: Fix applied, VM session status = repairing/testing
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RepairPayload {
  vm_session_id: string;
  incident_id?: string;
  fix_id?: string;
}

// Simulated repair strategies based on issue category
const repairStrategies: Record<string, string[]> = {
  plugin_conflict: [
    'Scanning wp-content/plugins for recently modified files',
    'Detected WooCommerce 8.2 incompatibility with custom-gateway v1.4',
    'Isolating conflicting plugin: custom-payment-gateway',
    'Applying compatibility patch: updating gateway API calls',
    'Verifying checkout flow with patched plugin',
  ],
  malware: [
    'Running signature-based malware scan on all files',
    'Detected suspicious base64 encoded payload in header.php',
    'Quarantining infected files to /var/quarantine/',
    'Restoring clean versions from git repository',
    'Applying security hardening rules to wp-config.php',
  ],
  broken_code: [
    'Analyzing PHP error logs for stack traces',
    'Identifying syntax error in functions.php line 142',
    'Parsing AST to understand code context',
    'Generating fix: correcting function signature mismatch',
    'Running PHP lint to verify fix validity',
  ],
  performance: [
    'Profiling database query execution times',
    'Identifying N+1 query pattern in product listing',
    'Applying query optimization: adding composite index',
    'Enabling object caching via Redis',
    'Verifying TTFB improvement (< 200ms target)',
  ],
  firewall: [
    'Analyzing WAF rule triggers for false positives',
    'Detected rate limit blocking legitimate payment webhooks',
    'Whitelisting Stripe IP ranges in firewall config',
    'Adjusting rate limit thresholds: 100 req/min for /webhook/*',
    'Testing webhook delivery with adjusted rules',
  ],
  ddos: [
    'Analyzing traffic patterns for attack signature',
    'Activating rate limiting: 10 req/sec per IP',
    'Enabling Cloudflare Under Attack mode',
    'Blocking identified botnet IP ranges',
    'Verifying legitimate traffic flow restoration',
  ],
  other: [
    'Running comprehensive site health diagnostics',
    'Checking file permissions and ownership',
    'Verifying database connectivity and charset',
    'Reviewing recent changes in version control',
    'Applying general stability fixes',
  ],
};

export default async (req: Request) => {
  const payload: RepairPayload = await req.json();
  const startTime = Date.now();

  try {
    // Get VM session
    const { data: vmSession } = await supabase
      .from('vm_sessions')
      .select('*')
      .eq('id', payload.vm_session_id)
      .single();

    if (!vmSession) throw new Error('VM session not found');

    // Get source entity for issue category
    let category = 'other';
    if (vmSession.incident_id) {
      const { data: incident } = await supabase.from('incidents').select('description').eq('id', vmSession.incident_id).single();
      if (incident) {
        const desc = incident.description.toLowerCase();
        if (desc.includes('plugin')) category = 'plugin_conflict';
        else if (desc.includes('malware') || desc.includes('hack')) category = 'malware';
        else if (desc.includes('error') || desc.includes('fatal')) category = 'broken_code';
        else if (desc.includes('slow') || desc.includes('performance')) category = 'performance';
        else if (desc.includes('firewall') || desc.includes('block')) category = 'firewall';
        else if (desc.includes('ddos') || desc.includes('attack')) category = 'ddos';
      }
    } else if (vmSession.one_time_fix_id) {
      const { data: fix } = await supabase.from('one_time_fixes').select('issue_category').eq('id', vmSession.one_time_fix_id).single();
      if (fix?.issue_category) category = fix.issue_category;
    }

    const steps = repairStrategies[category] || repairStrategies.other;

    // Execute repair steps with simulated timing
    const repairLogs = [];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      repairLogs.push({
        step: step,
        timestamp: new Date().toISOString(),
        success: true,
      });
    }

    // Calculate confidence based on complexity
    const complexityFactor = steps.length * 10;
    const randomFactor = Math.random() * 20 - 10;
    const confidence = Math.min(98, Math.max(60, 85 + randomFactor - complexityFactor * 0.1));

    // Update VM session
    await supabase.from('vm_sessions').update({
      session_status: 'testing',
      ai_agent_logs: [...(vmSession.ai_agent_logs || []), ...repairLogs],
      confidence_score: confidence,
    }).eq('id', payload.vm_session_id);

    // Update parent entity
    if (vmSession.incident_id) {
      await supabase.from('incidents').update({
        status: 'ai_repairing',
        ai_confidence_score: confidence,
        updated_at: new Date().toISOString(),
      }).eq('id', vmSession.incident_id);
    }
    if (vmSession.one_time_fix_id) {
      await supabase.from('one_time_fixes').update({
        status: 'repairing',
        ai_confidence_score: confidence,
        updated_at: new Date().toISOString(),
      }).eq('id', vmSession.one_time_fix_id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'vm_session',
      entity_id: payload.vm_session_id,
      action: 'repair_complete',
      performed_by_type: 'ai_agent',
      metadata: {
        category,
        steps_completed: steps.length,
        confidence_score: confidence,
        repair_duration_ms: Date.now() - startTime,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        agent: 'REPAIR',
        duration_ms: Date.now() - startTime,
        result: {
          category,
          steps_completed: steps.length,
          confidence: Math.round(confidence * 10) / 10,
          requires_approval: confidence < 90,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('audit_logs').insert({
      entity_type: 'vm_session',
      entity_id: payload.vm_session_id,
      action: 'repair_failed',
      performed_by_type: 'system',
      metadata: { error: errorMessage },
    });

    return new Response(
      JSON.stringify({ success: false, agent: 'REPAIR', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
