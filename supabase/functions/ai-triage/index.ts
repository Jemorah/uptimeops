// ═══════════════════════════════════════════════════════════════
// AI AGENT 1: TRIAGE
// Classifies incoming emergency incidents
// Runs on: New incident insert, new one-time fix paid
// Output: incident.status = 'in_progress', severity confirmed
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface TriagePayload {
  incident_id?: string;
  fix_id?: string;
  type: 'incident' | 'one_time_fix';
}

export default async (req: Request) => {
  const payload: TriagePayload = await req.json();
  const startTime = Date.now();

  try {
    // ── TRIAGE LOGIC ──
    // 1. Analyze website URL (check if reachable)
    // 2. Parse issue description for keyword classification
    // 3. Determine severity based on impact signals
    // 4. Set initial AI confidence
    // 5. Write audit log
    // 6. Trigger ISOLATE agent

    let entity: any;
    let updateTable: string;
    let entityId: string;

    if (payload.type === 'incident' && payload.incident_id) {
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', payload.incident_id)
        .single();
      entity = data;
      updateTable = 'incidents';
      entityId = payload.incident_id;
    } else if (payload.type === 'one_time_fix' && payload.fix_id) {
      const { data } = await supabase
        .from('one_time_fixes')
        .select('*')
        .eq('id', payload.fix_id)
        .single();
      entity = data;
      updateTable = 'one_time_fixes';
      entityId = payload.fix_id;
    } else {
      throw new Error('Invalid payload: need incident_id or fix_id');
    }

    if (!entity) throw new Error('Entity not found');

    // Keyword-based classification
    const description = (entity.description || entity.issue_description || '').toLowerCase();
    const url = entity.website_url || '';

    const categoryKeywords: Record<string, string[]> = {
      malware: ['malware', 'virus', 'hacked', 'infected', 'backdoor', 'shell'],
      plugin_conflict: ['plugin', 'conflict', 'compatibility', 'update broke', 'after update'],
      broken_code: ['error', 'fatal', 'syntax', 'exception', 'crash', 'bug'],
      ddos: ['ddos', 'traffic spike', 'overwhelmed', 'attack', 'flood'],
      firewall: ['firewall', 'blocked', 'waf', '403', ' Forbidden', 'ip blocked'],
      performance: ['slow', 'timeout', 'memory', 'cpu', 'performance', 'lag'],
    };

    let detectedCategory = 'other';
    let maxMatches = 0;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(kw => description.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = cat;
      }
    }

    // Severity boosters
    const isCriticalKeywords = ['down', 'offline', 'unavailable', '500', '502', '503', 'error establishing'];
    const isHighKeywords = ['slow', 'broken', 'not working', 'failed'];

    let severity = entity.severity || 'p3_medium';
    if (isCriticalKeywords.some(kw => description.includes(kw))) {
      severity = 'p1_critical';
    } else if (isHighKeywords.some(kw => description.includes(kw))) {
      severity = 'p2_high';
    }

    // Calculate initial confidence based on signal clarity
    const signalClarity = Math.min(95, 50 + maxMatches * 15 + (description.length > 50 ? 10 : 0));

    // Update entity
    if (updateTable === 'incidents') {
      await supabase.from('incidents').update({
        status: 'in_progress',
        severity,
        ai_confidence_score: signalClarity,
        updated_at: new Date().toISOString(),
      }).eq('id', entityId);
    } else {
      await supabase.from('one_time_fixes').update({
        status: 'triage',
        issue_category: detectedCategory,
        ai_confidence_score: signalClarity,
        updated_at: new Date().toISOString(),
      }).eq('id', entityId);
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      entity_type: payload.type === 'incident' ? 'incident' : 'one_time_fix',
      entity_id: entityId,
      action: 'triage_complete',
      performed_by_type: 'ai_agent',
      metadata: {
        detected_category: detectedCategory,
        severity_assigned: severity,
        confidence_score: signalClarity,
        triage_duration_ms: Date.now() - startTime,
        keyword_matches: maxMatches,
      },
    });

    // Trigger ISOLATE agent via queue or direct call
    await supabase.from('audit_logs').insert({
      entity_type: payload.type === 'incident' ? 'incident' : 'one_time_fix',
      entity_id: entityId,
      action: 'trigger_isolate',
      performed_by_type: 'system',
      metadata: { trigger_reason: 'triage_complete' },
    });

    return new Response(
      JSON.stringify({
        success: true,
        agent: 'TRIAGE',
        duration_ms: Date.now() - startTime,
        result: {
          category: detectedCategory,
          severity,
          confidence: signalClarity,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('audit_logs').insert({
      entity_type: payload.type === 'incident' ? 'incident' : 'one_time_fix',
      entity_id: payload.incident_id || payload.fix_id,
      action: 'triage_failed',
      performed_by_type: 'system',
      metadata: { error: errorMessage },
    });

    return new Response(
      JSON.stringify({ success: false, agent: 'TRIAGE', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
