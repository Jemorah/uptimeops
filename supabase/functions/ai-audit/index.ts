// UptimeOps v2.1 — AI AUDIT Agent
// NEW: Immutable Hash Chain + Audit Report Generation
// Runs 4 audit meta-scanners: SHA-256 Chain Engine, SARIF Merger, Compliance Mapper, Timeline Reconstructor
// Creates immutable blockchain-style audit trail and generates compliance reports

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';
import { callAI } from '../_shared/ai.ts';

const FUNCTION = 'ai-audit';

interface AuditRequest {
  incident_id: string;
  pipeline_id: string;
  scan_ids: string[];
  website_url?: string;
}

// ═══════════════════════════════════════════════════════════════
// CRYPTO: SHA-256 hashing using Web Crypto API
// ═══════════════════════════════════════════════════════════════

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Build a hash chain block: H(prev_hash + artifact_hash + timestamp + block_index)
async function buildHashBlock(
  previousHash: string,
  artifactHash: string,
  blockIndex: number,
  timestamp: string
): Promise<string> {
  const combined = `${previousHash}:${artifactHash}:${blockIndex}:${timestamp}`;
  return sha256(combined);
}

// ═══════════════════════════════════════════════════════════════
// HASH CHAIN ENGINE
// ═══════════════════════════════════════════════════════════════

async function buildHashChain(
  supabase: any,
  incident_id: string,
  scanResults: any[],
  pipeline_id: string
): Promise<{ root_hash: string; blocks: number }> {;

  // Get existing chain for this incident
  const { data: existingBlocks } = await supabase
    .from('audit_hash_chain')
    .select('*')
    .eq('incident_id', incident_id)
    .order('block_index', { ascending: true });

  let previousHash = '0' .repeat(64); // Genesis hash
  let blockIndex = 0;

  if (existingBlocks && existingBlocks.length > 0) {
    const lastBlock = existingBlocks[existingBlocks.length - 1];
    previousHash = lastBlock.combined_hash;
    blockIndex = lastBlock.block_index + 1;
  }

  const newBlocks: any[] = [];
  const stages = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;

  for (const stage of stages) {
    const stageScans = scanResults.filter(s => s.agent_stage === stage);
    if (!stageScans.length) continue;

    // Build artifact hash from all scan results in this stage
    const artifactData = stageScans.map(s =>
      `${s.scanner_name}:${s.status}:${JSON.stringify(s.severity_counts)}:${s.confidence_score || 0}`
    ).join('|');

    const artifactHash = await sha256(artifactData);
    const timestamp = new Date().toISOString();
    const combinedHash = await buildHashBlock(previousHash, artifactHash, blockIndex, timestamp);

    newBlocks.push({
      incident_id,
      block_index: blockIndex,
      agent_stage: stage,
      artifact_hash: artifactHash,
      previous_hash: previousHash,
      combined_hash: combinedHash,
      timestamp,
    });

    previousHash = combinedHash;
    blockIndex++;
  }

  // Insert blocks - the immutable trigger prevents any future modification
  if (newBlocks.length > 0) {
    const { error } = await supabase.from('audit_hash_chain').insert(newBlocks);
    if (error) {;
      throw error;
    }
  }

  const rootHash = previousHash;

  // Update incident with root hash
  await supabase.from('incidents')
    .update({ hash_chain_root: rootHash })
    .eq('id', incident_id);

  return { root_hash: rootHash, blocks: newBlocks.length };
}

// ═══════════════════════════════════════════════════════════════
// SARIF MERGER
// ═══════════════════════════════════════════════════════════════

async function mergeSarif(scanResults: any[]): Promise<object> {
  const runs = scanResults.map(scan => ({
    tool: { driver: { name: scan.scanner_name, version: '1.0.0' } },
    results: (scan.findings || []).map((f: any, idx: number) => ({
      ruleId: f.rule || `${scan.scanner_name}-${idx}`,
      message: { text: f.message },
      level: f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note',
      locations: f.file ? [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line || 1 } } }] : [],
    })),
  }));

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE MAPPER (SOC2)
// ═══════════════════════════════════════════════════════════════

async function mapCompliance(scanResults: any[]): Promise<object> {
  const soc2Controls: Record<string, { control: string; findings: any[]; status: string }> = {
    'CC6.1': { control: 'Logical and physical access controls', findings: [], status: 'passed' },
    'CC6.6': { control: 'Encryption for data at rest and in transit', findings: [], status: 'passed' },
    'CC7.1': { control: 'Detection of security events', findings: [], status: 'passed' },
    'CC7.2': { control: 'Incident response and recovery', findings: [], status: 'passed' },
    'CC8.1': { control: 'Change management', findings: [], status: 'passed' },
  };

  for (const scan of scanResults) {
    const criticalFindings = (scan.findings || []).filter((f: any) => f.severity === 'critical' || f.severity === 'high');

    // Map findings to SOC2 controls based on scanner category
    if (scan.agent_stage === 'isolate') {
      soc2Controls['CC6.1'].findings.push(...criticalFindings);
      if (criticalFindings.length) soc2Controls['CC6.1'].status = 'failed';
    }
    if (scan.agent_stage === 'triage') {
      soc2Controls['CC7.1'].findings.push(...criticalFindings);
      if (criticalFindings.length) soc2Controls['CC7.1'].status = 'failed';
    }
    if (scan.agent_stage === 'repair' || scan.agent_stage === 'validate') {
      soc2Controls['CC8.1'].findings.push(...criticalFindings);
      if (criticalFindings.length) soc2Controls['CC8.1'].status = 'failed';
    }
    if (scan.agent_stage === 'deploy') {
      soc2Controls['CC6.6'].findings.push(...criticalFindings);
      if (criticalFindings.length) soc2Controls['CC6.6'].status = 'failed';
    }
  }

  // Overall compliance status
  const allPassed = Object.values(soc2Controls).every(c => c.status === 'passed');

  return {
    framework: 'SOC2 Type II',
    overall_status: allPassed ? 'compliant' : 'non_compliant',
    overall_score: Object.values(soc2Controls).filter(c => c.status === 'passed').length / Object.keys(soc2Controls).length * 100,
    controls: soc2Controls,
    assessed_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE RECONSTRUCTOR
// ═══════════════════════════════════════════════════════════════

async function buildTimeline(
  supabase: any,
  incident_id: string,
  scanResults: any[],
  pipeline_id: string
): Promise<any[]> {
  const timeline: any[] = [];

  // Fetch incident creation
  const { data: incident } = await supabase
    .from('incidents')
    .select('created_at, started_at, resolved_at, status')
    .eq('id', incident_id)
    .single();

  if (incident) {
    timeline.push({
      timestamp: incident.created_at,
      event: 'Incident reported',
      type: 'incident',
      details: { status: incident.status },
    });
  }

  // Fetch pipeline events
  const { data: pipeline } = await supabase
    .from('pipeline_states')
    .select('*')
    .eq('incident_id', incident_id)
    .single();

  // Add scan execution events
  const stages = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'];
  for (const stage of stages) {
    const stageScans = scanResults.filter(s => s.agent_stage === stage);
    const completedScans = stageScans.filter(s => s.status === 'completed');
    const avgConfidence = completedScans.length
      ? Math.round(completedScans.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / completedScans.length)
      : 0;

    if (stageScans.length) {
      timeline.push({
        timestamp: stageScans[0].created_at,
        event: `${stage.charAt(0).toUpperCase() + stage.slice(1)} stage executed`,
        type: 'pipeline',
        details: {
          stage,
          scanners: stageScans.length,
          completed: completedScans.length,
          failed: stageScans.filter(s => s.status === 'failed').length,
          avg_confidence: avgConfidence,
        },
      });
    }
  }

  // Add hash chain creation
  const { data: hashBlocks } = await supabase
    .from('audit_hash_chain')
    .select('*')
    .eq('incident_id', incident_id)
    .order('block_index');

  if (hashBlocks?.length) {
    timeline.push({
      timestamp: hashBlocks[hashBlocks.length - 1].timestamp,
      event: 'Immutable audit hash chain created',
      type: 'audit',
      details: { blocks: hashBlocks.length, root_hash: hashBlocks[hashBlocks.length - 1].combined_hash },
    });
  }

  // Add resolution event
  if (incident?.resolved_at) {
    timeline.push({
      timestamp: incident.resolved_at,
      event: 'Incident resolved',
      type: 'resolution',
      details: { final_status: incident.status },
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: AuditRequest = await req.json();
    const { incident_id, pipeline_id, scan_ids } = body;

    if (!incident_id) {
      return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient();

    // Fetch incident
    const { data: incident } = await supabase
      .from('incidents')
      .select('*, customers(*)')
      .eq('id', incident_id)
      .single();

    if (!incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });
    }

    // Fetch ALL scan results for this incident (not just audit scan_ids)
    const { data: allScans } = await supabase
      .from('scan_results')
      .select('*')
      .eq('incident_id', incident_id);

    const scanResults = allScans || [];

    // Mark audit scan entries as running
    if (scan_ids?.length) {
      await supabase.from('scan_results').update({ status: 'running' }).in('id', scan_ids);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. BUILD IMMUTABLE HASH CHAIN
    // ═══════════════════════════════════════════════════════════
    const { root_hash, blocks } = await buildHashChain(supabase, incident_id, scanResults, pipeline_id);

    // ═══════════════════════════════════════════════════════════
    // 2. MERGE SARIF REPORT
    // ═══════════════════════════════════════════════════════════
    const sarifReport = await mergeSarif(scanResults);

    // ═══════════════════════════════════════════════════════════
    // 3. COMPLIANCE MAPPING
    // ═══════════════════════════════════════════════════════════
    const complianceReport = await mapCompliance(scanResults);

    // ═══════════════════════════════════════════════════════════
    // 4. TIMELINE RECONSTRUCTION
    // ═══════════════════════════════════════════════════════════
    const timeline = await buildTimeline(supabase, incident_id, scanResults, pipeline_id);

    // ═══════════════════════════════════════════════════════════
    // 5. GENERATE AUDIT REPORT SUMMARY
    // ═══════════════════════════════════════════════════════════
    const completedScans = scanResults.filter(s => s.status === 'completed');
    const avgConfidence = completedScans.length
      ? Math.round(completedScans.reduce((sum: number, s: any) => sum + (s.confidence_score || 0), 0) / completedScans.length)
      : 0;

    const totalFindings = scanResults.reduce((sum: number, s: any) =>
      sum + (s.severity_counts ? Object.values(s.severity_counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0), 0);

    const auditReport = {
      report_id: `audit-${incident_id}-${Date.now()}`,
      incident_id,
      pipeline_id,
      generated_at: new Date().toISOString(),
      summary: {
        total_scanners: scanResults.length,
        completed_scans: completedScans.length,
        failed_scans: scanResults.filter(s => s.status === 'failed').length,
        avg_confidence: avgConfidence,
        total_findings: totalFindings,
        hash_chain_blocks: blocks,
        hash_chain_root: root_hash,
      },
      sarif_report: sarifReport,
      compliance_report: complianceReport,
      timeline,
    };

    // Mark audit scans complete
    if (scan_ids?.length) {
      await supabase.from('scan_results').update({
        status: 'completed',
        confidence_score: avgConfidence,
        findings: [{ summary: auditReport.summary }],
        parsed_output: { audit_complete: true, blocks, root_hash },
      }).in('id', scan_ids);
    }

    // Store audit report in Supabase (for retrieval)
    await supabase.from('audit_reports').upsert({
      incident_id,
      pipeline_id,
      report_data: auditReport,
      hash_chain_root: root_hash,
      compliance_status: (complianceReport as any).overall_status,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'incident_id,pipeline_id' });

    return new Response(JSON.stringify({
      success: true,
      stage: 'audit',
      confidence: avgConfidence,
      hash_chain: { blocks, root_hash },
      compliance: (complianceReport as any).overall_status,
      total_findings: totalFindings,
      pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {;
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
