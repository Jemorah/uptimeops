// UptimeOps — AI Repair Agent
// Diagnoses root cause and generates fix commands

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'ai-repair';

interface RepairCommand {
  command: string;
  description: string;
  expected_output: string;
  rollback_command: string;
  risk_level: 'low' | 'medium' | 'high';
}

function generateRepairPlan(title: string, description: string): { commands: RepairCommand[]; confidence: number; summary: string } {
  const text = (title + ' ' + description).toLowerCase();
  const commands: RepairCommand[] = [];
  let confidence = 70;

  if (/database|postgres|mysql|connection|pool/.test(text)) {
    commands.push(
      { command: 'psql -c "SELECT count(*) FROM pg_stat_activity;"', description: 'Check active connections', expected_output: 'count < max_connections', rollback_command: '', risk_level: 'low' },
      { command: 'psql -c "SHOW max_connections;"', description: 'Check max connections limit', expected_output: 'max_connections value', rollback_command: '', risk_level: 'low' },
      { command: 'psql -c "SELECT * FROM pg_stat_activity WHERE state = \'idle\' AND now() - query_start > interval \'10 min\';"', description: 'Find idle connections', expected_output: 'List of idle connections', rollback_command: '', risk_level: 'low' },
      { command: 'psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND now() - query_start > interval \'10 min\';"', description: 'Terminate idle connections', expected_output: ' backends terminated', rollback_command: 'Restart PostgreSQL to restore original state', risk_level: 'medium' },
    );
    confidence = 85;
  } else if (/nginx|502|503|upstream/.test(text)) {
    commands.push(
      { command: 'nginx -t', description: 'Test nginx configuration', expected_output: 'syntax is ok', rollback_command: 'cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf && nginx -s reload', risk_level: 'low' },
      { command: 'cat /var/log/nginx/error.log | tail -20', description: 'Check nginx errors', expected_output: 'Error details', rollback_command: '', risk_level: 'low' },
      { command: 'systemctl restart nginx', description: 'Restart nginx', expected_output: 'nginx restarted', rollback_command: 'systemctl stop nginx', risk_level: 'medium' },
    );
    confidence = 88;
  } else if (/ssl|certificate|expired/.test(text)) {
    commands.push(
      { command: 'openssl x509 -in /etc/ssl/cert.pem -noout -dates', description: 'Check cert expiry', expected_output: 'notAfter date', rollback_command: '', risk_level: 'low' },
      { command: 'certbot renew --dry-run', description: 'Test cert renewal', expected_output: 'success', rollback_command: '', risk_level: 'low' },
      { command: 'certbot renew && systemctl reload nginx', description: 'Renew certificate', expected_output: 'Congratulations', rollback_command: 'Restore from /etc/letsencrypt/backup', risk_level: 'medium' },
    );
    confidence = 92;
  } else if (/redis|memory|cache/.test(text)) {
    commands.push(
      { command: 'redis-cli INFO memory', description: 'Check Redis memory', expected_output: 'used_memory_human', rollback_command: '', risk_level: 'low' },
      { command: 'redis-cli --eval evict_old_keys.lua', description: 'Evict old cache keys', expected_output: 'Keys evicted', rollback_command: '', risk_level: 'medium' },
    );
    confidence = 80;
  } else {
    commands.push(
      { command: 'uptime && free -h && df -h', description: 'System health check', expected_output: 'System stats', rollback_command: '', risk_level: 'low' },
      { command: 'docker ps --format "table {{.Names}}\t{{.Status}}"', description: 'Check container status', expected_output: 'Container list', rollback_command: '', risk_level: 'low' },
    );
    confidence = 65;
  }

  return { commands, confidence, summary: `Generated ${commands.length} repair commands for ${text.slice(0, 50)}...` };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, vm_session_id } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);
    const { data: incident } = await supabase.from('incidents').select('title, description').eq('id', incident_id).single();
    if (!incident) return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });

    const plan = generateRepairPlan(incident.title || '', incident.description || '');

    // Queue commands in VM
    if (vm_session_id) {
      for (const cmd of plan.commands) {
        await supabase.from('vm_commands').insert({
          vm_session_id,
          command: cmd.command,
          status: 'queued',
        });
      }
    }

    // Update pipeline
    await supabase.from('pipeline_states').update({
      current_step: 'validate',
      confidence: plan.confidence,
    }).eq('incident_id', incident_id);

    await supabase.from('incidents').update({ status: 'validate', ai_confidence: plan.confidence }).eq('id', incident_id);

    logInfo(FUNCTION, 'Repair plan generated', { incident_id, commands: plan.commands.length, confidence: plan.confidence });

    return new Response(JSON.stringify(plan), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Repair failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
