// ═══════════════════════════════════════════════════════════════
// FUNCTION 3: vm-manager
// Spawn Docker VM, clone site, run commands, destroy VM
// Integration: Cloud provider API (AWS/DigitalOcean/Linode)
// Cleanup: Auto-destroy after 4 hours or on session end
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VM_PROVIDER = Deno.env.get('VM_PROVIDER') || 'digitalocean'; // digitalocean | aws | linode
const VM_SIZE = Deno.env.get('VM_SIZE') || 's-1vcpu-1gb'; // DigitalOcean smallest
const VM_IMAGE = Deno.env.get('VM_IMAGE') || 'ubuntu-22-04-x64';
const VM_REGION = Deno.env.get('VM_REGION') || 'nyc1';
const VM_MAX_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours

interface VMSession {
  id: string;
  incident_id?: string;
  provider_vm_id?: string;
  ip_address?: string;
  ssh_key?: string;
  status: 'creating' | 'running' | 'destroyed' | 'failed' | 'timeout';
  created_at: string;
  destroyed_at?: string;
  destroy_reason?: string;
}

// ── Cloud Provider API ──

async function createDigitalOceanVM(name: string): Promise<{ id: string; ip?: string }> {
  const token = Deno.env.get('DIGITALOCEAN_TOKEN')!;
  const sshKeyId = Deno.env.get('DIGITALOCEAN_SSH_KEY_ID')!;

  const response = await fetch('https://api.digitalocean.com/v2/droplets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      region: VM_REGION,
      size: VM_SIZE,
      image: VM_IMAGE,
      ssh_keys: [parseInt(sshKeyId)],
      backups: false,
      ipv6: false,
      monitoring: true,
      tags: ['uptimeops', 'auto-destroy'],
      user_data: `#!/bin/bash
# UptimeOps isolation setup
apt-get update && apt-get install -y docker.io nginx fail2ban
systemctl enable docker
usermod -aG docker root
# Lock down: no egress
iptables -P OUTPUT DROP
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -d api.digitalocean.com -j ACCEPT
iptables-save > /etc/iptables/rules.v4
`,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DigitalOcean create failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  return { id: data.droplet.id.toString() };
}

async function getDigitalOceanIP(dropletId: string): Promise<string> {
  const token = Deno.env.get('DIGITALOCEAN_TOKEN')!;
  // Poll for IP assignment (up to 2 minutes)
  for (let i = 0; i < 24; i++) {
    const resp = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await resp.json();
    const ip = data.droplet?.networks?.v4?.find((n: Record<string, unknown>) => n.type === 'public')?.ip_address;
    if (ip) return ip;
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for VM IP assignment');
}

async function destroyDigitalOceanVM(dropletId: string) {
  const token = Deno.env.get('DIGITALOCEAN_TOKEN')!;
  const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.ok;
}

// ── Actions ──

async function spawnVM(payload: { incident_id?: string; fix_id?: string; website_url?: string }): Promise<VMSession> {
  const sessionId = crypto.randomUUID();
  const vmName = `uptimeops-${payload.incident_id || payload.fix_id || 'test'}-${Date.now()}`;

  // Insert pending session
  await supabase.from('vm_sessions').insert({
    id: sessionId,
    incident_id: payload.incident_id,
    status: 'creating',
    created_at: new Date().toISOString(),
  });

  try {
    // Create VM via cloud provider
    let providerVmId: string;
    let ipAddress: string | undefined;

    switch (VM_PROVIDER) {
      case 'digitalocean': {
        const vm = await createDigitalOceanVM(vmName);
        providerVmId = vm.id;
        ipAddress = await getDigitalOceanIP(providerVmId);
        break;
      }
      default:
        throw new Error(`Unsupported VM provider: ${VM_PROVIDER}`);
    }

    // Update session with VM details
    await supabase.from('vm_sessions').update({
      provider_vm_id: providerVmId,
      ip_address: ipAddress,
      status: 'running',
    }).eq('id', sessionId);

    // Clone website into VM (if URL provided)
    if (payload.website_url) {
      // In production: SSH into VM and clone
      // For demo: log the intent
      await supabase.from('vm_commands').insert({
        vm_session_id: sessionId,
        command: `clone_site --url ${payload.website_url}`,
        status: 'queued',
      });
    }

    // Schedule auto-destroy
    setTimeout(() => destroyVM(sessionId, 'auto_timeout'), VM_MAX_LIFETIME_MS);

    return {
      id: sessionId,
      incident_id: payload.incident_id,
      provider_vm_id: providerVmId,
      ip_address: ipAddress,
      status: 'running',
      created_at: new Date().toISOString(),
    };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from('vm_sessions').update({
      status: 'failed',
      error_message: msg,
    }).eq('id', sessionId);

    throw error;
  }
}

async function destroyVM(sessionId: string, reason: string) {
  const { data: session } = await supabase
    .from('vm_sessions')
    .select('id, provider_vm_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'destroyed') {
    return { destroyed: false, reason: 'already_destroyed_or_not_found' };
  }

  // Destroy via cloud provider
  if (session.provider_vm_id) {
    switch (VM_PROVIDER) {
      case 'digitalocean':
        await destroyDigitalOceanVM(session.provider_vm_id);
        break;
    }
  }

  // Update session
  await supabase.from('vm_sessions').update({
    status: 'destroyed',
    destroyed_at: new Date().toISOString(),
    destroy_reason: reason,
  }).eq('id', sessionId);

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: 'vm_session',
    entity_id: sessionId,
    action: 'vm_destroyed',
    performed_by_type: 'system',
    new_values: { reason },
    metadata: { provider_vm_id: session.provider_vm_id },
  });

  return { destroyed: true, session_id: sessionId, reason };
}

async function runCommand(sessionId: string, command: string): Promise<{ output?: string; error?: string; exit_code: number }> {
  const { data: session } = await supabase
    .from('vm_sessions')
    .select('id, ip_address, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.status !== 'running') {
    return { error: 'VM not running', exit_code: 1 };
  }

  // Insert command record
  const { data: cmdRecord } = await supabase.from('vm_commands').insert({
    vm_session_id: sessionId,
    command,
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single();

  try {
    // In production: SSH into VM and execute
    // For demo: simulate
    await new Promise(r => setTimeout(r, 500));
    const simulatedOutput = `Executed: ${command}\nExit code: 0`;

    await supabase.from('vm_commands').update({
      status: 'completed',
      output: simulatedOutput,
      exit_code: 0,
      completed_at: new Date().toISOString(),
    }).eq('id', cmdRecord?.id);

    return { output: simulatedOutput, exit_code: 0 };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await supabase.from('vm_commands').update({
      status: 'failed',
      output: msg,
      exit_code: 1,
      completed_at: new Date().toISOString(),
    }).eq('id', cmdRecord?.id);

    return { error: msg, exit_code: 1 };
  }
}

// ── Main Handler ──

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = await req.json();

  try {
    switch (payload.action) {
      case 'spawn': {
        const session = await spawnVM({
          incident_id: payload.incident_id,
          fix_id: payload.fix_id,
          website_url: payload.website_url,
        });
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'destroy': {
        const result = await destroyVM(payload.vm_session_id, payload.reason || 'manual');
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'run': {
        const result = await runCommand(payload.vm_session_id, payload.command);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        const { data: session } = await supabase
          .from('vm_sessions')
          .select('*')
          .eq('id', payload.vm_session_id)
          .single();
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action. Use: spawn, destroy, run, status' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
