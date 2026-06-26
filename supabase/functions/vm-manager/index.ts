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

      const vmId = `vm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const octet = Math.floor(Math.random() * 254) + 1;

      const { data: vm } = await supabase.from('vm_sessions').insert({
        incident_id,
        provider_vm_id: vmId,
        ip_address: `203.0.113.${octet}`,
        ssh_key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${btoa(vmId).slice(0, 43)}`,
        status: 'creating',
      }).select().single();

      // Simulate provisioning delay
      if (vm) {
        await new Promise((r) => setTimeout(r, 500));
        await supabase.from('vm_sessions').update({ status: 'running' }).eq('id', vm.id);
      }

      logInfo(FUNCTION, 'VM created', { vm_id: vmId, vm_session_id: vm?.id });
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

      // Simulate command execution
      await new Promise((r) => setTimeout(r, 800));

      const exitCode = Math.random() > 0.15 ? 0 : 1;
      const output = exitCode === 0
        ? `Command completed successfully.\nOutput: ${Math.random().toString(36).slice(2, 20)}`
        : `Error: Command failed with exit code ${exitCode}\n${Math.random().toString(36).slice(2, 40)}`;

      await supabase.from('vm_commands').update({
        status: 'completed',
        output,
        exit_code: exitCode,
        completed_at: new Date().toISOString(),
      }).eq('id', cmd?.id);

      return new Response(JSON.stringify({ executed: true, exit_code: exitCode, output }), { headers: corsHeaders });
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

      logInfo(FUNCTION, 'VM destroyed', { vm_session_id, reason: body.reason });
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
      }

      logInfo(FUNCTION, 'Cleanup complete', { destroyed: count });
      return new Response(JSON.stringify({ cleaned: count }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    logError(FUNCTION, 'Request failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
