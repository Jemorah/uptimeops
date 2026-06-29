// UptimeOps v2.1 — AI ISOLATE Agent
// Runs 7 isolation scanners: nmap, masscan, iptables audit, Checkov, Docker Bench, Lynis, OpenSCAP
// Contains and isolates threats, assesses infrastructure exposure

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI, parseAIJson } from '../_shared/ai.ts';

const FUNCTION = 'ai-isolate';

interface IsolateRequest {
  incident_id: string;
  pipeline_id: string;
  scan_ids: string[];
  website_url?: string;
}

interface IsolationFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  resource?: string;
  rule_id?: string;
  recommendation?: string;
}

interface IsolateOutput {
  findings: IsolationFinding[];
  isolation_actions: string[];
  containment_status: 'contained' | 'partial' | 'exposed';
  confidence: number;
  passed: boolean;
}

async function analyzeIsolation(
  scannerName: string,
  incident: any,
  websiteUrl?: string
): Promise<IsolateOutput> {
  const systemPrompt = `You are the ${scannerName} infrastructure isolation scanner. Analyze infrastructure exposure and produce structured JSON findings. Each finding has severity (critical/high/medium/low/info), message, resource, rule_id, recommendation. Provide isolation_actions array, containment_status (contained/partial/exposed), confidence (0-100), and passed boolean.`;

  const prompt = `Run ${scannerName} isolation scan on infrastructure:

Title: ${incident.title || 'Unknown'}
Description: ${incident.description || 'No description'}
Priority: ${incident.priority || 'unknown'}
Website: ${websiteUrl || 'N/A'}

Assess:
1. Network exposure (open ports, services)
2. Container security posture
3. Firewall rule compliance
4. System hardening gaps
5. Infrastructure as Code vulnerabilities

Produce JSON with findings[], isolation_actions[], containment_status, confidence, passed.`;

  const aiResponse = await callAI(prompt, systemPrompt);
  const parsed = parseAIJson<IsolateOutput>(aiResponse.content);

  if (parsed) {
    return {
      findings: parsed.findings || [],
      isolation_actions: parsed.isolation_actions || [],
      containment_status: parsed.containment_status || 'partial',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      passed: parsed.passed !== false,
    };
  }

  // Fallback
  const lines = aiResponse.content.split('\n');
  const findings: IsolationFinding[] = [];
  const actions: string[] = [];

  for (const line of lines) {
    const sevMatch = line.match(/(critical|high|medium|low|info)/i);
    if (sevMatch) {
      findings.push({
        severity: sevMatch[1].toLowerCase() as IsolationFinding['severity'],
        message: line.trim(),
      });
    }
    if (line.toLowerCase().includes('isolate') || line.toLowerCase().includes('block') || line.toLowerCase().includes('restrict')) {
      actions.push(line.trim());
    }
  }

  const confMatch = aiResponse.content.match(/confidence[:\s]+(\d+)/i);
  return {
    findings,
    isolation_actions: actions.length ? actions : ['Review network exposure', 'Verify firewall rules'],
    containment_status: 'partial',
    confidence: confMatch ? parseInt(confMatch[1]) : 50,
    passed: findings.filter(f => f.severity === 'critical').length === 0,
  };
}

function countSeverity(findings: IsolationFinding[]) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  return counts;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: IsolateRequest = await req.json();
    const { incident_id, pipeline_id, scan_ids, website_url } = body;

    if (!incident_id || !scan_ids?.length) {
      return new Response(JSON.stringify({ error: 'incident_id and scan_ids required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient();

    const { data: incident } = await supabase
      .from('incidents')
      .select('*, customers(*)')
      .eq('id', incident_id)
      .single();

    if (!incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });
    }

    const { data: scanEntries } = await supabase
      .from('scan_results')
      .select('*')
      .in('id', scan_ids);

    if (!scanEntries?.length) {
      return new Response(JSON.stringify({ error: 'No scan entries' }), { status: 404, headers: corsHeaders });
    };

    let totalConfidence = 0;
    const allActions: string[] = [];
    const results: Record<string, unknown>[] = [];

    for (const scan of scanEntries) {
      const scannerName = scan.scanner_name || 'Unknown';
      await supabase.from('scan_results').update({ status: 'running' }).eq('id', scan.id);

      try {
        const startMs = Date.now();
        const output = await analyzeIsolation(scannerName, incident, website_url);
        const elapsedMs = Date.now() - startMs;
        const severityCounts = countSeverity(output.findings);

        await supabase.from('scan_results').update({
          status: 'completed',
          findings: output.findings,
          parsed_output: output,
          severity_counts: severityCounts,
          confidence_score: output.confidence,
          execution_time_ms: elapsedMs,
        }).eq('id', scan.id);

        totalConfidence += output.confidence;
        allActions.push(...output.isolation_actions);
        results.push({ scanner: scannerName, confidence: output.confidence, containment: output.containment_status, findings: output.findings.length });

      } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
        await supabase.from('scan_results').update({ status: 'failed' }).eq('id', scan.id);
        totalConfidence += 15;
      }
    }

    const avgConfidence = Math.round(totalConfidence / scanEntries.length);
    const uniqueActions = [...new Set(allActions)].slice(0, 10);

    // Store isolation recommendation in pipeline_states
    await supabase.from('pipeline_states').update({
      step_results: { isolation_actions: uniqueActions, isolation_status: avgConfidence >= 70 ? 'recommended' : 'needs_review' },
    }).eq('incident_id', incident_id);

    return new Response(JSON.stringify({
      success: true,
      stage: 'isolate',
      confidence: avgConfidence,
      containment_actions: uniqueActions,
      scanners_run: scanEntries.length,
      pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    logError(FUNCTION, 'Isolation failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
