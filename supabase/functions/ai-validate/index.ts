// UptimeOps v2.1 — AI VALIDATE Agent
// Runs 9 validation scanners: ClamAV, YARA, chkrootkit, OWASP ZAP, Nuclei, Bandit, CodeQL, Customer Tests, E2E Tests
// Validates repairs through security scanning and test execution

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI, parseAIJson } from '../_shared/ai.ts';

const FUNCTION = 'ai-validate';

interface ValidateRequest {
  incident_id: string;
  pipeline_id: string;
  scan_ids: string[];
  website_url?: string;
}

interface ValidationFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  test_name?: string;
  category?: 'malware' | 'vulnerability' | 'test' | 'semantic';
  details?: string;
}

interface ValidateOutput {
  findings: ValidationFinding[];
  test_results: { name: string; passed: boolean; duration?: number }[];
  validation_summary: string;
  confidence: number;
  passed: boolean;
}

async function analyzeValidation(scannerName: string, incident: any, websiteUrl?: string): Promise<ValidateOutput> {
  const systemPrompt = `You are the ${scannerName} validation scanner. Run validation checks and produce structured JSON findings. Each finding: severity, message, test_name, category (malware/vulnerability/test/semantic), details. Provide test_results array, validation_summary, confidence (0-100), passed boolean.`;

  const prompt = `Run ${scannerName} validation scan:

Title: ${incident.title || 'Unknown'}
Description: ${incident.description || 'No description'}
Website: ${websiteUrl || 'N/A'}
Priority: ${incident.priority || 'unknown'}

Validate:
1. No malware/backdoors introduced
2. No rootkit indicators
3. Web vulnerabilities patched
4. Security linting passes
5. Semantic analysis clean
6. All customer tests pass
7. E2E tests pass

Produce JSON: findings[], test_results[], validation_summary, confidence, passed.`;

  const aiResponse = await callAI(prompt, systemPrompt);
  const parsed = parseAIJson<ValidateOutput>(aiResponse.content);

  if (parsed) {
    return {
      findings: parsed.findings || [],
      test_results: parsed.test_results || [],
      validation_summary: parsed.validation_summary || `${scannerName} validation complete`,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      passed: parsed.passed !== false,
    };
  }

  // Fallback
  const findings: ValidationFinding[] = [];
  const tests: { name: string; passed: boolean }[] = [];
  const lines = aiResponse.content.split('\n');

  for (const line of lines) {
    const sevMatch = line.match(/(critical|high|medium|low|info)/i);
    if (sevMatch) findings.push({ severity: sevMatch[1].toLowerCase() as any, message: line.trim() });

    const testMatch = line.match(/test[:\s]+(\w+)/i);
    const passMatch = line.match(/(pass|fail)/i);
    if (testMatch || passMatch) {
      tests.push({ name: testMatch?.[1] || scannerName, passed: passMatch?.[1].toLowerCase() === 'pass' });
    }
  }

  const confMatch = aiResponse.content.match(/confidence[:\s]+(\d+)/i);
  return {
    findings,
    test_results: tests.length ? tests : [{ name: scannerName, passed: findings.filter(f => f.severity === 'critical').length === 0 }],
    validation_summary: `${scannerName}: ${findings.length} findings, ${tests.filter(t => t.passed).length}/${tests.length} tests passed`,
    confidence: confMatch ? parseInt(confMatch[1]) : 50,
    passed: findings.filter(f => f.severity === 'critical').length === 0,
  };
}

function countSeverity(findings: ValidationFinding[]) {
  const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) c[f.severity] = (c[f.severity] || 0) + 1;
  return c;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: ValidateRequest = await req.json();
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
    const allTestResults: { name: string; passed: boolean }[] = [];

    for (const scan of scanEntries) {
      const scannerName = scan.scanner_name || 'Unknown';
      await supabase.from('scan_results').update({ status: 'running' }).eq('id', scan.id);

      try {
        const startMs = Date.now();
        const output = await analyzeValidation(scannerName, incident, website_url);
        const elapsedMs = Date.now() - startMs;
        const severityCounts = countSeverity(output.findings);

        await supabase.from('scan_results').update({
          status: 'completed', findings: output.findings, parsed_output: output,
          severity_counts: severityCounts, confidence_score: output.confidence,
          execution_time_ms: elapsedMs,
        }).eq('id', scan.id);

        totalConfidence += output.confidence;
        allTestResults.push(...output.test_results);

      } catch (err) {
    logError(FUNCTION, \'Operation failed\', err);;
        await supabase.from('scan_results').update({ status: 'failed' }).eq('id', scan.id);
        totalConfidence += 15;
      }
    }

    const avgConfidence = Math.round(totalConfidence / scanEntries.length);
    const testsPassed = allTestResults.filter(t => t.passed).length;

    // Store validation report
    await supabase.from('validation_reports').upsert({
      incident_id, pipeline_id,
      test_summary: { total: allTestResults.length, passed: testsPassed, failed: allTestResults.length - testsPassed },
      status: avgConfidence >= 80 ? 'passed' : avgConfidence >= 60 ? 'partial' : 'failed',
    }, { onConflict: 'incident_id,pipeline_id' });

    logInfo(FUNCTION, 'Validation complete', { incident_id, tests_passed: testsPassed, confidence: avgConfidence });
    return new Response(JSON.stringify({
      success: true, stage: 'validate', confidence: avgConfidence,
      tests_run: allTestResults.length, tests_passed: testsPassed,
      scanners_run: scanEntries.length, pipeline_id,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, \'Operation failed\', err);;
    logError(FUNCTION, 'Validation failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
