// UptimeOps — AI Repair Agent
// Diagnoses root cause and generates fix commands using real AI

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { callAI } from '../_shared/ai.ts';

const FUNCTION = 'ai-repair';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, vm_session_id } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);
    const { data: incident } = await supabase.from('incidents').select('title, description, website_url').eq('id', incident_id).single();
    if (!incident) return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });

    const prompt = `You are diagnosing an infrastructure incident. Generate repair commands.\n\nTitle: "${incident.title || ''}"\nDescription: "${incident.description || ''}"\nWebsite: ${incident.website_url || 'unknown'}\n\nProvide JSON with:\n- commands: array of objects { command, description, expected_output, rollback_command, risk_level: "low"|"medium"|"high" }\n- confidence: number (0-100)\n- summary: brief explanation of the fix plan\n- root_cause: likely cause of the issue`;

    const aiResponse = await callAI(prompt, 'You are a senior DevOps engineer. Generate precise Linux CLI commands to fix infrastructure issues. Always respond with valid JSON.');

    // Parse AI response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    let plan: Record<string, unknown> = {
      commands: [],
      confidence: 50,
      summary: 'AI-generated repair plan',
      root_cause: 'Unknown — see raw response',
      provider: aiResponse.provider,
      model: aiResponse.model,
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        plan = { ...plan, ...parsed };
      } catch {
        plan.raw_response = aiResponse.content;
      }
    } else {
      plan.raw_response = aiResponse.content;
    }

    const commands = Array.isArray(plan.commands) ? plan.commands : [];
    const confidence = Math.min(100, Math.max(0, Number(plan.confidence) || 50));

    // Queue commands in VM
    if (vm_session_id && commands.length > 0) {
      for (const cmd of commands) {
        const cmdStr = typeof cmd === 'string' ? cmd : cmd.command;
        if (cmdStr) {
          await supabase.from('vm_commands').insert({
            vm_session_id,
            command: cmdStr,
            status: 'queued',
          });
        }
      }
    }

    // Update pipeline
    await supabase.from('pipeline_states').update({
      current_step: 'validate',
      confidence,
    }).eq('incident_id', incident_id);

    await supabase.from('incidents').update({ status: 'validate', ai_confidence: confidence }).eq('id', incident_id);

    logInfo(FUNCTION, 'Repair plan generated', { incident_id, commands: commands.length, confidence, provider: aiResponse.provider });

    return new Response(JSON.stringify({ ...plan, commands_queued: commands.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Repair failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
