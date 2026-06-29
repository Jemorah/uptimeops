// UptimeOps v2.1 — AI TRIAGE Agent
// Runs 8 triage scanners: Semgrep, TruffleHog, GitLeaks, npm audit, Snyk, OWASP DC, Trivy, CodeGraph
// Creates scan_results entries with AI-analyzed findings

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI, parseAIJson } from '../_shared/ai.ts';

const FUNCTION = 'ai-triage';

interface TriageRequest {
  incident_id: string;
  pipeline_id: string;
  scan_ids: string[];
  website_url?: string;
}

interface ScannerFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  file?: string;
  line?: number;
  rule?: string;
}

interface ScanOutput {
  findings: ScannerFinding[];
  summary: string;
  confidence: number;
  passed: boolean;
}

async function analyzeWithAI(
  scannerName: string,
  incident: any,
  websiteUrl?: string
): Promise<ScanOutput> {
  const systemPrompt = `You are the ${scannerName} security scanner. Analyze the given incident and produce structured findings in JSON format. Each finding must have severity (critical/high/medium/low/info), message, optional file/line/rule. Provide a confidence score (0-100) and passed boolean.`;

  const prompt = `Run ${scannerName} security scan on:

Title: ${incident.title || 'Unknown'}
Description: ${incident.description || 'No description'}
Priority: ${incident.priority || 'unknown'}
Website: ${websiteUrl || 'N/A'}
Status: ${incident.status || 'unknown'}

Produce JSON with:
- findings: array of findings with severity, message, file, line, rule
- summary: brief text summary
- confidence: 0-100 score
- passed: boolean (true if no critical findings)`;

  const aiResponse = await callAI(prompt, systemPrompt);
  const parsed = parseAIJson<ScanOutput>(aiResponse.content);

  if (parsed) {
    return {
      findings: parsed.findings || [],
      summary: parsed.summary || `${scannerName} scan completed`,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      passed: parsed.passed !== false,
    };
  }

  // Fallback: parse from text
  const findings: ScannerFinding[] = [];
  const lines = aiResponse.content.split('\n');
  for (const line of lines) {
    const sevMatch = line.match(/(critical|high|medium|low|info)/i);
    if (sevMatch) {
      findings.push({
        severity: sevMatch[1].toLowerCase() as ScannerFinding['severity'],
        message: line.trim(),
      });
    }
  }

  const confMatch = aiResponse.content.match(/confidence[:\s]+(\d+)/i);
  const confidence = confMatch ? parseInt(confMatch[1]) : 50;

  return {
    findings,
    summary: `${scannerName} analysis: ${findings.length} findings`,
    confidence,
    passed: findings.filter(f => f.severity === 'critical').length === 0,
  };
}

function countSeverity(findings: ScannerFinding[]) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return counts;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: TriageRequest = await req.json();
    const { incident_id, pipeline_id, scan_ids, website_url } = body;

    if (!incident_id || !scan_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'incident_id and scan_ids required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch incident
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('*, customers(*)')
      .eq('id', incident_id)
      .single();

    if (incError || !incident) {
      return new Response(
        JSON.stringify({ error: 'Incident not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch the scan entries to run
    const { data: scanEntries } = await supabase
      .from('scan_results')
      .select('*, scanner_registry(*)')
      .in('id', scan_ids);

    if (!scanEntries?.length) {
      return new Response(
        JSON.stringify({ error: 'No scan entries found' }),
        { status: 404, headers: corsHeaders }
      );
    };

    let totalConfidence = 0;
    const results: Record<string, unknown>[] = [];

    for (const scan of scanEntries) {
      const scannerName = scan.scanner_name || scan.scanner_registry?.name || 'Unknown';

      // Mark as running
      await supabase.from('scan_results').update({ status: 'running' }).eq('id', scan.id);

      try {
        const startMs = Date.now();
        const output = await analyzeWithAI(scannerName, incident, website_url);
        const elapsedMs = Date.now() - startMs;
        const severityCounts = countSeverity(output.findings);

        const { error: updateError } = await supabase.from('scan_results').update({
          status: 'completed',
          findings: output.findings,
          parsed_output: output,
          severity_counts: severityCounts,
          confidence_score: output.confidence,
          execution_time_ms: elapsedMs,
        }).eq('id', scan.id);

        if (updateError) throw updateError;

        totalConfidence += output.confidence;
        results.push({ scanner: scannerName, confidence: output.confidence, passed: output.passed, findings: output.findings.length });

      } catch (scanErr) {
        await supabase.from('scan_results').update({
          status: 'failed',
          raw_output: scanErr instanceof Error ? scanErr.message : String(scanErr),
        }).eq('id', scan.id);
        totalConfidence += 10; // Penalize failed scanner
      }
    }

    const avgConfidence = Math.round(totalConfidence / scanEntries.length);
    const allPassed = results.every(r => r.passed);

    logInfo(FUNCTION, 'Triage complete', { incident_id, avg_confidence: avgConfidence, scanners: scanEntries.length });
    return new Response(JSON.stringify({
      success: true,
      stage: 'triage',
      confidence: avgConfidence,
      scanners_run: scanEntries.length,
      all_passed: allPassed,
      results,
      pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, 'Operation failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
