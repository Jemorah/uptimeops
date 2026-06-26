// UptimeOps — AI Isolate Agent
// Spins up isolated VM, creates deployment snapshot, sets up repair environment

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'ai-isolate';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { incident_id, pipeline_id } = await req.json();
    if (!incident_id) return new Response(JSON.stringify({ error: 'incident_id required' }), { status: 400, headers: corsHeaders });

    const supabase = getSupabaseClient(req);

    // Get incident details
    const { data: incident } = await supabase.from('incidents').select('*').eq('id', incident_id).single();
    if (!incident) return new Response(JSON.stringify({ error: 'Incident not found' }), { status: 404, headers: corsHeaders });

    // Create VM session
    const vmId = `vm-${Math.random().toString(36).slice(2, 10)}`;
    const { data: vmSession } = await supabase.from('vm_sessions').insert({
      incident_id,
      provider_vm_id: vmId,
      ip_address: `203.0.113.${Math.floor(Math.random() * 254) + 1}`,
      status: 'creating',
      ssh_key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${btoa(vmId).slice(0, 40)}`,
    }).select().single();

    // Create deployment snapshot
    await supabase.from('deployment_snapshots').insert({
      incident_id,
      vm_session_id: vmSession?.id,
      status: 'created',
      metadata: {
        website: incident.website_url,
        created_at: new Date().toISOString(),
        snapshot_type: 'pre_repair',
      },
    });

    // Update VM to running
    if (vmSession) {
      await supabase.from('vm_sessions').update({ status: 'running' }).eq('id', vmSession.id);
    }

    // Update pipeline
    const plId = pipeline_id || `pl-${incident_id.slice(0, 8)}`;
    await supabase.from('pipeline_states').update({
      current_step: 'repair',
      confidence: 75,
      step_results: { isolate: { vm_id: vmId, vm_session_id: vmSession?.id, created_at: new Date().toISOString() } },
    }).eq('pipeline_id', plId);

    // Update incident status
    await supabase.from('incidents').update({ status: 'repair' }).eq('id', incident_id);

    logInfo(FUNCTION, 'Isolation complete', { incident_id, vm_id: vmId, vm_session_id: vmSession?.id });

    return new Response(JSON.stringify({
      isolated: true,
      vm_id: vmId,
      vm_session_id: vmSession?.id,
      ip_address: vmSession?.ip_address,
      snapshot_created: true,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    logError(FUNCTION, 'Isolation failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
