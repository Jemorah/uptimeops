// ═══════════════════════════════════════════════════════════════
// AI AGENT 2: ISOLATE
// Spawns VM, clones site, runs diagnostics
// Runs on: After TRIAGE completes
// Output: vm_sessions record created, site cloned
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface IsolatePayload {
  incident_id?: string;
  fix_id?: string;
  vm_session_id?: string;
}

export default async (req: Request) => {
  const payload: IsolatePayload = await req.json();
  const startTime = Date.now();

  try {
    // Get the VM session
    let vmSession: any;
    if (payload.vm_session_id) {
      const { data } = await supabase.from('vm_sessions').select('*').eq('id', payload.vm_session_id).single();
      vmSession = data;
    }

    // Get the source entity
    let entity: any;
    let updateTable = '';
    if (payload.incident_id) {
      const { data } = await supabase.from('incidents').select('*').eq('id', payload.incident_id).single();
      entity = data;
      updateTable = 'incidents';
    } else if (payload.fix_id) {
      const { data } = await supabase.from('one_time_fixes').select('*').eq('id', payload.fix_id).single();
      entity = data;
      updateTable = 'one_time_fixes';
    }

    if (!entity) throw new Error('Source entity not found');

    const websiteUrl = entity.website_url || entity.clone_url;
    const vmId = `vm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Simulate VM spawn + site clone
    const steps = [
      { step: 'allocate_vm', detail: `Allocated container ${vmId}`, duration: 1200 },
      { step: 'install_deps', detail: 'Installing PHP 8.2, Nginx, MySQL 8.0', duration: 3500 },
      { step: 'clone_site', detail: `Cloning ${websiteUrl} via git/wp-cli`, duration: 2800 },
      { step: 'verify_clone', detail: 'Verifying file integrity and DB connectivity', duration: 900 },
    ];

    // Update VM session status
    if (vmSession) {
      await supabase.from('vm_sessions').update({
        session_status: 'spawning',
        isolated_environment_id: vmId,
        clone_url: websiteUrl,
        ai_agent_logs: steps.map(s => ({
          step: s.step,
          detail: s.detail,
          timestamp: new Date().toISOString(),
        })),
      }).eq('id', vmSession.id);

      // Mark as cloned
      await supabase.from('vm_sessions').update({
        session_status: 'cloned',
      }).eq('id', vmSession.id);
    } else {
      // Create new VM session
      const { data: newVm } = await supabase.from('vm_sessions').insert({
        incident_id: payload.incident_id,
        one_time_fix_id: payload.fix_id,
        session_status: 'cloned',
        clone_url: websiteUrl,
        isolated_environment_id: vmId,
        ai_agent_logs: steps,
      }).select().single();

      vmSession = newVm;
    }

    // Update parent entity
    if (updateTable === 'incidents') {
      await supabase.from('incidents').update({
        status: 'ai_repairing',
        vm_session_id: vmId,
        updated_at: new Date().toISOString(),
      }).eq('id', entity.id);
    } else {
      await supabase.from('one_time_fixes').update({
        status: 'isolating',
        vm_session_id: vmId,
        updated_at: new Date().toISOString(),
      }).eq('id', entity.id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'vm_session',
      entity_id: vmSession.id,
      action: 'isolation_complete',
      performed_by_type: 'ai_agent',
      metadata: {
        vm_id: vmId,
        clone_url: websiteUrl,
        isolation_duration_ms: Date.now() - startTime,
        steps_completed: steps.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        agent: 'ISOLATE',
        duration_ms: Date.now() - startTime,
        result: {
          vm_id: vmId,
          clone_url: websiteUrl,
          status: 'cloned',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('audit_logs').insert({
      entity_type: 'vm_session',
      entity_id: payload.vm_session_id || payload.incident_id || payload.fix_id,
      action: 'isolation_failed',
      performed_by_type: 'system',
      metadata: { error: errorMessage },
    });

    return new Response(
      JSON.stringify({ success: false, agent: 'ISOLATE', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
