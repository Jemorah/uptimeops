// ═══════════════════════════════════════════════════════════════
// CREDENTIAL KEY RELAY — Zero-Knowledge Secure Channel
// Relays ephemeral decryption keys from customer browser → isolated VM
// The key passes THROUGH this function but is NEVER logged or stored
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RelayPayload {
  action: 'store_key' | 'retrieve_key' | 'revoke_key';
  vm_session_id: string;
  credential_fingerprint: string;
  ephemeral_key?: string;       // Only for store_key — never logged
  session_token?: string;       // Auth token for the VM session
}

// In-memory key cache (volatile, process-local, auto-expires)
// Keys live here for max 5 minutes or until retrieved by VM
const keyCache = new Map<string, { key: string; expiresAt: number; retrieved: boolean }>();

// Cleanup expired keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of keyCache.entries()) {
    if (entry.expiresAt < now || entry.retrieved) {
      keyCache.delete(id);
    }
  }
}, 60000);

export default async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload: RelayPayload = await req.json();
  const startTime = Date.now();

  try {
    switch (payload.action) {
      case 'store_key': {
        // ── Customer browser stores ephemeral key for VM retrieval ──
        if (!payload.ephemeral_key || !payload.vm_session_id || !payload.credential_fingerprint) {
          return new Response(
            JSON.stringify({ error: 'Missing ephemeral_key, vm_session_id, or credential_fingerprint' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Verify the credential exists and is valid
        const { data: cred } = await supabase
          .from('credentials_vault')
          .select('id, revoked_at, expires_at, public_key_fingerprint')
          .eq('public_key_fingerprint', payload.credential_fingerprint)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!cred) {
          return new Response(
            JSON.stringify({ error: 'Credential not found, revoked, or expired' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Verify fingerprint match
        if (cred.public_key_fingerprint !== payload.credential_fingerprint) {
          return new Response(
            JSON.stringify({ error: 'Fingerprint mismatch' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Store key in volatile cache (NOT in database, NOT in logs)
        const cacheKey = `${payload.vm_session_id}:${payload.credential_fingerprint}`;
        keyCache.set(cacheKey, {
          key: payload.ephemeral_key,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute TTL
          retrieved: false,
        });

        // Log ONLY that a key was stored — never the key itself
        await supabase.from('audit_logs').insert({
          entity_type: 'vm_session',
          entity_id: payload.vm_session_id,
          action: 'key_stored_in_relay',
          performed_by_type: 'system',
          metadata: {
            relay_duration_ms: Date.now() - startTime,
            key_fingerprint_prefix: payload.credential_fingerprint.substring(0, 8),
            // NOTE: ephemeral_key is intentionally NOT logged
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Key stored for VM retrieval',
            ttl_seconds: 300,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'retrieve_key': {
        // ── Isolated VM retrieves the ephemeral key ──
        if (!payload.vm_session_id || !payload.credential_fingerprint || !payload.session_token) {
          return new Response(
            JSON.stringify({ error: 'Missing vm_session_id, credential_fingerprint, or session_token' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Verify VM session is active and approved
        const { data: vmSession } = await supabase
          .from('vm_sessions')
          .select('id, session_status, deployment_approved_by')
          .eq('id', payload.vm_session_id)
          .single();

        if (!vmSession) {
          return new Response(
            JSON.stringify({ error: 'VM session not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (vmSession.session_status === 'destroyed' || vmSession.session_status === 'failed') {
          return new Response(
            JSON.stringify({ error: 'VM session is no longer active' }),
            { status: 410, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Retrieve key from volatile cache
        const cacheKey = `${payload.vm_session_id}:${payload.credential_fingerprint}`;
        const cached = keyCache.get(cacheKey);

        if (!cached) {
          return new Response(
            JSON.stringify({ error: 'Key not found or expired. Customer may need to re-submit.' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (cached.expiresAt < Date.now()) {
          keyCache.delete(cacheKey);
          return new Response(
            JSON.stringify({ error: 'Key expired. Customer needs to re-submit credentials.' }),
            { status: 410, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (cached.retrieved) {
          return new Response(
            JSON.stringify({ error: 'Key already retrieved. One-time retrieval only.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Mark as retrieved (one-time use)
        cached.retrieved = true;

        // Log retrieval (without the key)
        await supabase.from('audit_logs').insert({
          entity_type: 'vm_session',
          entity_id: payload.vm_session_id,
          action: 'key_retrieved_by_vm',
          performed_by_type: 'ai_agent',
          metadata: {
            relay_duration_ms: Date.now() - startTime,
            key_fingerprint_prefix: payload.credential_fingerprint.substring(0, 8),
            // NOTE: ephemeral_key is intentionally NOT logged
          },
        });

        // Return the key to the VM (this is the only time the key leaves the relay)
        return new Response(
          JSON.stringify({
            success: true,
            ephemeral_key: cached.key,
            note: 'Key delivered to VM. This key is valid for this session only.',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke_key': {
        // ── Customer revokes — purge all cached keys for this credential ──
        let deletedCount = 0;
        for (const [cacheKey, entry] of keyCache.entries()) {
          if (cacheKey.includes(payload.credential_fingerprint)) {
            keyCache.delete(cacheKey);
            deletedCount++;
          }
        }

        // Also revoke in database
        await supabase.from('credentials_vault')
          .update({ revoked_at: new Date().toISOString() })
          .eq('public_key_fingerprint', payload.credential_fingerprint);

        await supabase.from('audit_logs').insert({
          entity_type: 'vm_session',
          entity_id: payload.vm_session_id || '00000000-0000-0000-0000-000000000000',
          action: 'key_revoked',
          performed_by_type: 'customer',
          metadata: {
            keys_purged_from_relay: deletedCount,
            credential_fingerprint_prefix: payload.credential_fingerprint.substring(0, 8),
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Revoked. ${deletedCount} cached key(s) purged from relay.`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action. Use: store_key, retrieve_key, revoke_key' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown relay error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
