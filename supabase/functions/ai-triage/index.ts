// UptimeOps — AI Triage Agent
// Analyzes incident severity, categorizes root cause, assigns priority

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'ai-triage';

interface TriageResult {
  priority: string;
  category: string;
  estimated_fix_minutes: number;
  requires_human: boolean;
  confidence: number;
  analysis: string;
}

function analyzeIncident(title: string, description: string): TriageResult {
  const text = (title + ' ' + description).toLowerCase();
  let priority = 'P3_MEDIUM';
  let category = 'general';
  let requires_human = false;
  let fixMinutes = 60;

  // Priority heuristics
  if (/down|offline|unreachable|502|503|crash|corrupt/.test(text)) {
    priority = 'P1_CRITICAL';
    category = 'outage';
    fixMinutes = 30;
    requires_human = true;
  } else if (/slow|timeout|performance|memory|cpu|leak/.test(text)) {
    priority = 'P2_HIGH';
    category = 'performance';
    fixMinutes = 45;
  } else if (/ssl|certificate|expired/.test(text)) {
    priority = 'P2_HIGH';
    category = 'security';
    fixMinutes = 15;
  } else if (/config|nginx|docker|restart/.test(text)) {
    priority = 'P3_MEDIUM';
    category = 'configuration';
    fixMinutes = 30;
  }

  // Data-driven confidence
  const signals = [
    /database|postgres|mysql|redis/.test(text),
    /nginx|apache|load.?balancer/.test(text),
    /docker|kubernetes|container/.test(text),
    /ssl|cert|https/.test(text),
    /memory|cpu|disk|resource/.test(text),
  ].filter(Boolean).length;

  const confidence = Math.min(95, 60 + signals * 7);

  return {
    priority,
    category,
    estimated_fix_minutes: fixMinutes,
    requires_human: requires_human || confidence < 75,
    confidence,
    analysis: `Detected ${category} issue with ${signals} confidence signals. Estimated resolution: ${fixMinutes} minutes.`,
  };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, title, description } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);

    // Get incident if not provided
    let incidentTitle = title;
    let incidentDesc = description;
    if (!incidentTitle) {
      const { data: incident } = await supabase.from('incidents').select('title, description').eq('id', incident_id).single();
      if (incident) { incidentTitle = incident.title; incidentDesc = incident.description; }
    }

    const result = analyzeIncident(incidentTitle || '', incidentDesc || '');

    // Update incident
    await supabase.from('incidents').update({
      priority: result.priority as any,
      ai_confidence: result.confidence,
      status: 'isolate',
    }).eq('id', incident_id);

    // Log to audit
    await supabase.from('audit_logs').insert({
      table_name: 'incidents', entity_type: 'incident', entity_id: incident_id,
      action: 'ai_triage_complete', performed_by_type: 'ai',
      new_values: result,
    });

    logInfo(FUNCTION, 'Triage complete', { incident_id, priority: result.priority, confidence: result.confidence });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Triage failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
