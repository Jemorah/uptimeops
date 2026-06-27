// UptimeOps — AI Triage Agent
// Analyzes incident severity using real AI (Anthropic/OpenAI)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI } from '../_shared/ai.ts';

const FUNCTION = 'ai-triage';

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

    const prompt = `Analyze this infrastructure incident and classify it:\n\nTitle: "${incidentTitle || 'Unknown'}"\nDescription: "${incidentDesc || 'No description'}"\n\nProvide JSON with:\n- priority: "P1_CRITICAL" | "P2_HIGH" | "P3_MEDIUM" | "P4_LOW"\n- category: "outage" | "performance" | "security" | "configuration" | "general"\n- estimated_fix_minutes: number\n- requires_human: boolean (true if needs engineer)\n- confidence: number (0-100)\n- analysis: brief explanation`;

    const aiResponse = await callAI(prompt, 'You are a DevOps triage specialist. Classify incidents by severity and root cause. Always respond with valid JSON.');

    // Parse AI response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    let result: Record<string, unknown> = {
      priority: 'P3_MEDIUM',
      category: 'general',
      estimated_fix_minutes: 60,
      requires_human: false,
      confidence: 50,
      analysis: 'Default classification — AI provider may be offline.',
      provider: aiResponse.provider,
      model: aiResponse.model,
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        result = { ...result, ...parsed };
      } catch {
        result.raw_response = aiResponse.content;
      }
    } else {
      result.raw_response = aiResponse.content;
    }

    const confidence = Math.min(100, Math.max(0, Number(result.confidence) || 50));
    const priority = String(result.priority || 'P3_MEDIUM');

    // Update incident
    await supabase.from('incidents').update({
      priority: priority as any,
      ai_confidence: confidence,
      status: 'isolate',
    }).eq('id', incident_id);

    // Log to audit
    await supabase.from('audit_logs').insert({
      table_name: 'incidents', entity_type: 'incident', entity_id: incident_id,
      action: 'ai_triage_complete', performed_by_type: 'ai',
      new_values: result,
    });

    logInfo(FUNCTION, 'Triage complete', { incident_id, priority, confidence, provider: aiResponse.provider });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Triage failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
