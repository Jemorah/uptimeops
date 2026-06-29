// UptimeOps v2.1 — AI DEPLOY Agent
// Runs 4 deploy scanners: tfsec, cfn-lint, Hadolint, Dockle
// Validates infrastructure-as-code and container images before deployment

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI, parseAIJson } from '../_shared/ai.ts';

const FUNCTION = 'ai-deploy';

interface DeployRequest {
  incident_id: string;
  pipeline_id: string;
  scan_ids: string[];
  website_url?: string;
}

interface DeployFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  resource_type?: 'terraform' | 'cloudformation' | 'dockerfile' | 'container';
  rule_id?: string;
  remediation?: string;
}

interface DeployOutput {
  findings: DeployFinding[];
  deployment_ready: boolean;
  blockers: string[];
  summary: string;
  confidence: number;
  passed: boolean;
}

async function analyzeDeploy(scannerName: string, incident: any, websiteUrl?: string): Promise<DeployOutput> {
  const systemPrompt = `You are the ${scannerName} deployment scanner. Validate IaC and container configs. Each finding: severity, message, resource_type (terraform/cloudformation/dockerfile/container), rule_id, remediation. Provide deployment_ready boolean, blockers[], summary, confidence (0-100), passed.`;

  const prompt = `Run ${scannerName} pre-deployment scan:

Title: ${incident.title || 'Unknown'}
Description: ${incident.description || 'No description'}
Website: ${websiteUrl || 'N/A'}
Priority: ${incident.priority || 'unknown'}

Check:
1. Terraform security (tfsec)
2. CloudFormation linting (cfn-lint)
3. Dockerfile best practices (Hadolint)
4. Container image security (Dockle)

Produce JSON: findings[], deployment_ready, blockers[], summary, confidence, passed.`;

  const aiResponse = await callAI(prompt, systemPrompt);
  const parsed = parseAIJson<DeployOutput>(aiResponse.content);

  if (parsed) {
    return {
      findings: parsed.findings || [],
      deployment_ready: parsed.deployment_ready !== false,
      blockers: parsed.blockers || [],
      summary: parsed.summary || `${scannerName} scan complete`,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      passed: parsed.passed !== false,
    };
  }

  // Fallback
  const findings: DeployFinding[] = [];
  const blockers: string[] = [];
  const lines = aiResponse.content.split('\n');

  for (const line of lines) {
    const sevMatch = line.match(/(critical|high|medium|low|info)/i);
    if (sevMatch) findings.push({ severity: sevMatch[1].toLowerCase() as any, message: line.trim() });
    if (line.toLowerCase().includes('block') || line.toLowerCase().includes('must')) {
      blockers.push(line.trim());
    }
  }

  const confMatch = aiResponse.content.match(/confidence[:\s]+(\d+)/i);
  return {
    findings,
    deployment_ready: blockers.length === 0,
    blockers: blockers.length ? blockers : [],
    summary: `${scannerName}: ${findings.length} findings, ${blockers.length} blockers`,
    confidence: confMatch ? parseInt(confMatch[1]) : 50,
    passed: findings.filter(f => f.severity === 'critical').length === 0,
  };
}

function countSeverity(findings: DeployFinding[]) {
  const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) c[f.severity] = (c[f.severity] || 0) + 1;
  return c;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: DeployRequest = await req.json();
    const { incident_id, pipeline_id, scan_ids, website_url } = body;
    if (!incident_id || !scan_ids?.length) {
      return new Response(JSON.stringify({ error: 'incident_id and scan_ids required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient();
    const { data: incident } = await supabase.from('incidents').select('*, customers(*)').eq('id', incident_id).single();
    if (!incident) return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });

    const { data: scanEntries } = await supabase.from('scan_results').select('*').in('id', scan_ids);
    if (!scanEntries?.length) return new Response(JSON.stringify({ error: 'No scan entries' }), { status: 404, headers: corsHeaders });

    let totalConfidence = 0;
    const allBlockers: string[] = [];

    for (const scan of scanEntries) {
      const scannerName = scan.scanner_name || 'Unknown';
      await supabase.from('scan_results').update({ status: 'running' }).eq('id', scan.id);

      try {
        const startMs = Date.now();
        const output = await analyzeDeploy(scannerName, incident, website_url);
        const elapsedMs = Date.now() - startMs;
        const severityCounts = countSeverity(output.findings);

        await supabase.from('scan_results').update({
          status: 'completed', findings: output.findings, parsed_output: output,
          severity_counts: severityCounts, confidence_score: output.confidence,
          execution_time_ms: elapsedMs,
        }).eq('id', scan.id);

        totalConfidence += output.confidence;
        if (!output.deployment_ready) allBlockers.push(...output.blockers);

      } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
        await supabase.from('scan_results').update({ status: 'failed' }).eq('id', scan.id);
        totalConfidence += 20;
      }
    }

    const avgConfidence = Math.round(totalConfidence / scanEntries.length);
    const uniqueBlockers = [...new Set(allBlockers)].slice(0, 10);
    const deploymentReady = uniqueBlockers.length === 0 && avgConfidence >= 85;

    // Store deployment check in deployment_snapshots
    await supabase.from('deployment_snapshots').upsert({
      incident_id,
      status: deploymentReady ? 'approved' : 'blocked',
      metadata: { pipeline_id, blockers: uniqueBlockers, ready: deploymentReady },
    }, { onConflict: 'incident_id' });

    logInfo(FUNCTION, 'Deploy validation complete', { incident_id, deployment_ready: deploymentReady, confidence: avgConfidence });
    return new Response(JSON.stringify({
      success: true, stage: 'deploy', confidence: avgConfidence,
      deployment_ready: deploymentReady, blockers: uniqueBlockers.length,
      scanners_run: scanEntries.length, pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    logError(FUNCTION, 'Deploy validation failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
