// ═══════════════════════════════════════════════════════════════
// FUNCTION 9: temporary-link-generator
// Trigger: Incident status = 'completed'
// Actions: Generate 64-char token, 72h expiry, store hash
// Send email with link, log to communications table
// Cron: Delete token after 72h, archive after 30 days
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours
const ARCHIVE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface LinkPayload {
  action: 'generate' | 'validate' | 'revoke' | 'cleanup_expired' | 'archive_old';
  incident_id?: string;
  fix_id?: string;
  customer_id?: string;
  token?: string;
  dashboard_url?: string;
}

async function generateToken(payload: LinkPayload) {
  if (!payload.incident_id && !payload.fix_id) {
    return { success: false, error: 'Missing incident_id or fix_id' };
  }
  if (!payload.customer_id) {
    return { success: false, error: 'Missing customer_id' };
  }

  const entityId = payload.incident_id || payload.fix_id!;
  const entityType = payload.incident_id ? 'incident' : 'one_time_fix';

  // Generate 64-char random token
  const randomBytes = new Uint8Array(48);
  crypto.getRandomValues(randomBytes);
  const token = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64);

  // Store hash (never store raw token)
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  const { data: linkRecord } = await supabase.from('temporary_links').insert({
    token_hash: tokenHash,
    entity_type: entityType,
    entity_id: entityId,
    customer_id: payload.customer_id,
    expires_at: expiresAt.toISOString(),
    access_count: 0,
    status: 'active',
  }).select().single();

  if (!linkRecord) {
    return { success: false, error: 'Failed to create temporary link' };
  }

  // Build URL (token is in the URL, hash is in DB)
  const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://uptimeops.com';
  const linkUrl = `${baseUrl}/fix/${token}`;
  const dashboardUrl = payload.dashboard_url || `${baseUrl}/customer`;

  // Send email to customer
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/communication-sender`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'temporary_access_granted',
      entity_type: entityType,
      entity_id: entityId,
      channel: 'email',
      customer_id: payload.customer_id,
      metadata: {
        link_url: linkUrl,
        dashboard_url: dashboardUrl,
        expires_at: expiresAt.toISOString(),
      },
    }),
  });

  // Audit log
  await supabase.from('audit_logs').insert({
    entity_type: entityType,
    entity_id: entityId,
    action: 'temporary_link_created',
    performed_by_type: 'system',
    metadata: {
      link_id: linkRecord.id,
      token_hash_prefix: tokenHash.substring(0, 16),
      expires_at: expiresAt.toISOString(),
    },
  });

  return {
    success: true,
    link_id: linkRecord.id,
    token, // Only returned once — must be sent to customer immediately
    link_url: linkUrl,
    expires_at: expiresAt.toISOString(),
  };
}

async function validateToken(token: string) {
  const tokenHash = await sha256(token);

  const { data: link } = await supabase
    .from('temporary_links')
    .select('id, entity_type, entity_id, customer_id, expires_at, access_count, status, token_hash')
    .eq('token_hash', tokenHash)
    .single();

  if (!link) return { success: false, error: 'Invalid token' };
  if (link.status !== 'active') return { success: false, error: `Link is ${link.status}` };
  if (new Date(link.expires_at) < new Date()) {
    await supabase.from('temporary_links').update({ status: 'expired' }).eq('id', link.id);
    return { success: false, error: 'Link has expired' };
  }

  // Increment access count
  await supabase.from('temporary_links').update({
    access_count: (link.access_count || 0) + 1,
    last_accessed_at: new Date().toISOString(),
  }).eq('id', link.id);

  // Log access
  await supabase.from('audit_logs').insert({
    entity_type: link.entity_type,
    entity_id: link.entity_id,
    action: 'temporary_link_accessed',
    performed_by_type: 'customer',
    metadata: { link_id: link.id, access_count: (link.access_count || 0) + 1 },
  });

  return {
    success: true,
    link_id: link.id,
    entity_type: link.entity_type,
    entity_id: link.entity_id,
    customer_id: link.customer_id,
    expires_at: link.expires_at,
  };
}

async function revokeToken(token: string) {
  const tokenHash = await sha256(token);

  const { data: link } = await supabase
    .from('temporary_links')
    .select('id, entity_type, entity_id')
    .eq('token_hash', tokenHash)
    .single();

  if (!link) return { success: false, error: 'Token not found' };

  await supabase.from('temporary_links').update({
    status: 'revoked',
    revoked_at: new Date().toISOString(),
  }).eq('id', link.id);

  await supabase.from('audit_logs').insert({
    entity_type: link.entity_type,
    entity_id: link.entity_id,
    action: 'temporary_link_revoked',
    performed_by_type: 'system',
  });

  return { success: true, message: 'Link revoked' };
}

async function cleanupExpired() {
  const now = new Date().toISOString();

  // Mark expired tokens
  const { data: expired } = await supabase
    .from('temporary_links')
    .update({ status: 'expired' })
    .lt('expires_at', now)
    .eq('status', 'active')
    .select('id');

  return { success: true, expired_count: expired?.length || 0 };
}

async function archiveOld() {
  const archiveBefore = new Date(Date.now() - ARCHIVE_AFTER_MS).toISOString();

  // Move old tokens to archive table
  const { data: old } = await supabase
    .from('temporary_links')
    .select('*')
    .lt('created_at', archiveBefore)
    .in('status', ['expired', 'revoked', 'used']);

  if (old && old.length > 0) {
    // Insert into archive
    await supabase.from('temporary_links_archive').insert(
      old.map(o => ({ ...o, archived_at: new Date().toISOString() }))
    );

    // Delete from main table
    await supabase.from('temporary_links').delete().in('id', old.map(o => o.id));
  }

  return { success: true, archived_count: old?.length || 0 };
}

// SHA-256 hash helper
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: LinkPayload = await req.json();

  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'generate':
        result = await generateToken(payload);
        break;
      case 'validate':
        if (!payload.token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await validateToken(payload.token);
        break;
      case 'revoke':
        if (!payload.token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await revokeToken(payload.token);
        break;
      case 'cleanup_expired':
        result = await cleanupExpired();
        break;
      case 'archive_old':
        result = await archiveOld();
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
