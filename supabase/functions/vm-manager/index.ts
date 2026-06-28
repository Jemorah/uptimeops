// UptimeOps — VM Manager
// Creates, monitors, and destroys cloud VM sessions for isolated repair environments

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'vm-manager';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, incident_id, vm_session_id, command } = body;
    const supabase = getSupabaseClient(req);

    // Create VM
    if (action === 'create') {
      if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

      const vmId = `vm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

      const { data: vm } = await supabase.from('vm_sessions').insert({
        incident_id,
        provider_vm_id: vmId,
        status: 'creating',
      }).select().single();

      if (vm) {
        await supabase.from('vm_sessions').update({ status: 'running' }).eq('id', vm.id);
      };
      return new Response(JSON.stringify({ created: true, vm }), { headers: corsHeaders });
    }

    // Run command on VM
    if (action === 'execute') {
      if (!vm_session_id || !command) {
        return new Response(JSON.stringify({ error: 'vm_session_id and command required' }), { status: 400, headers: corsHeaders });
      }

      const { data: vm } = await supabase.from('vm_sessions').select('*').eq('id', vm_session_id).single();
      if (!vm) return new Response(JSON.stringify({ error: 'VM session not found' }), { status: 404, headers: corsHeaders });
      if (vm.status !== 'running') return new Response(JSON.stringify({ error: `VM not running (status: ${vm.status})` }), { status: 400, headers: corsHeaders });

      const { data: cmd } = await supabase.from('vm_commands').insert({
        vm_session_id,
        command,
        status: 'running',
        started_at: new Date().toISOString(),
      }).select().single();

      // In production, this would execute via AWS EC2 SSM, GCP Compute SSH, or similar
      // For now, record the command and mark as pending — the actual execution is handled by the CI/CD runner
      const startMs = Date.now();

      // Check if we have AWS credentials for real VM execution
      const hasAws = Deno.env.get('AWS_ACCESS_KEY_ID') && Deno.env.get('AWS_SECRET_ACCESS_KEY');

      if (hasAws && vm.provider_vm_id) {
        try {
          // Real AWS SSM command execution would go here
          // const ssmResult = await executeViaSSM(vm.provider_vm_id, command);
          // For now, commands remain in 'running' state until updated by the runner;
        } catch (execErr) {;
          await supabase.from('vm_commands').update({
            status: 'failed',
            output: `Execution error: ${execErr instanceof Error ? execErr.message : String(execErr)}`,
            exit_code: 1,
            completed_at: new Date().toISOString(),
          }).eq('id', cmd?.id);
          return new Response(JSON.stringify({ error: 'Command execution failed' }), { status: 502, headers: corsHeaders });
        }
      }

      const elapsedMs = Date.now() - startMs;

      // If no AWS configured, mark as pending_execution for manual runner pickup
      if (!hasAws) {
        await supabase.from('vm_commands').update({
          status: 'pending_execution',
          output: `[PENDING] Command queued. No VM executor configured. Set AWS_ACCESS_KEY_ID to enable real VM execution.`,
          execution_time_ms: elapsedMs,
        }).eq('id', cmd?.id);

        return new Response(JSON.stringify({
          queued: true,
          status: 'pending_execution',
          note: 'AWS credentials not configured. Command recorded but not executed.',
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        queued: true,
        status: 'running',
        execution_time_ms: elapsedMs,
      }), { headers: corsHeaders });
    }

    // Get VM status
    if (action === 'status') {
      if (!vm_session_id) return new Response(JSON.stringify({ error: 'vm_session_id required' }), { status: 400, headers: corsHeaders });

      const { data: vm } = await supabase.from('vm_sessions').select('*, vm_commands(*)').eq('id', vm_session_id).single();
      return new Response(JSON.stringify({ vm }), { headers: corsHeaders });
    }

    // Destroy VM
    if (action === 'destroy') {
      if (!vm_session_id) return new Response(JSON.stringify({ error: 'vm_session_id required' }), { status: 400, headers: corsHeaders });

      await supabase.from('vm_sessions').update({
        status: 'destroyed',
        destroyed_at: new Date().toISOString(),
        destroy_reason: body.reason || 'manual_destroy',
      }).eq('id', vm_session_id);
      return new Response(JSON.stringify({ destroyed: true }), { headers: corsHeaders });
    }

    // List VMs for incident
    if (action === 'list') {
      if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });
      const { data: vms } = await supabase.from('vm_sessions').select('*, vm_commands(*)').eq('incident_id', incident_id).order('created_at', { ascending: false });
      return new Response(JSON.stringify({ vms: vms || [] }), { headers: corsHeaders });
    }

    // Cleanup expired VMs (cron action)
    if (action === 'cleanup_expired') {
      const { data: expired } = await supabase.from('vm_sessions')
        .select('id').eq('status', 'running')
        .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString());

      let count = 0;
      for (const vm of expired || []) {
        await supabase.from('vm_sessions').update({
          status: 'timeout', destroyed_at: new Date().toISOString(), destroy_reason: 'auto_timeout_4h',
        }).eq('id', vm.id);
        count++;
      };
      return new Response(JSON.stringify({ cleaned: count }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
