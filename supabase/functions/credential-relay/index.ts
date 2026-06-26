// UptimeOps — Credential Relay
// Stores zero-knowledge encrypted credentials (never sees plaintext)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'credential-relay';

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const { action, customer_id, encrypted_payload, public_key_fingerprint, iv, salt, credential_id } = body;
    const supabase = getSupabaseClient(req);

    if (action === 'store') {
      if (!customer_id || !encrypted_payload || !public_key_fingerprint || !iv || !salt) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
      }

      const { data: cred, error } = await supabase.from('credentials_vault').insert({
        customer_id,
        encrypted_payload,
        public_key_fingerprint,
        iv,
        salt,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        table_name: 'credentials_vault', entity_type: 'credential', entity_id: cred.id,
        action: 'credential_stored', performed_by_type: 'customer',
        new_values: { fingerprint: public_key_fingerprint },
      });

      logInfo(FUNCTION, 'Credential stored', { credential_id: cred.id, customer_id });
      return new Response(JSON.stringify({ stored: true, credential_id: cred.id, expires_at: cred.expires_at }), { headers: corsHeaders });
    }

    if (action === 'retrieve') {
      if (!credential_id) return new Response(JSON.stringify({ error: 'credential_id required' }), { status: 400, headers: corsHeaders });

      const { data: cred } = await supabase.from('credentials_vault')
        .select('*').eq('id', credential_id).single();

      if (!cred) return new Response(JSON.stringify({ error: 'Credential not found' }), { status: 404, headers: corsHeaders });
      if (cred.revoked_at) return new Response(JSON.stringify({ error: 'Credential has been revoked' }), { status: 403, headers: corsHeaders });
      if (new Date(cred.expires_at) < new Date()) return new Response(JSON.stringify({ error: 'Credential expired' }), { status: 403, headers: corsHeaders });

      // Increment access count
      await supabase.from('credentials_vault').update({
        access_count: (cred.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      }).eq('id', credential_id);

      return new Response(JSON.stringify({
        credential_id: cred.id,
        encrypted_payload: cred.encrypted_payload,
        iv: cred.iv,
        salt: cred.salt,
        access_count: (cred.access_count || 0) + 1,
      }), { headers: corsHeaders });
    }

    if (action === 'revoke') {
      if (!credential_id) return new Response(JSON.stringify({ error: 'credential_id required' }), { status: 400, headers: corsHeaders });

      await supabase.from('credentials_vault')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', credential_id);

      logInfo(FUNCTION, 'Credential revoked', { credential_id });
      return new Response(JSON.stringify({ revoked: true }), { headers: corsHeaders });
    }

    if (action === 'list') {
      if (!customer_id) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });
      const { data: creds } = await supabase.from('credentials_vault')
        .select('id, public_key_fingerprint, expires_at, revoked_at, access_count, created_at')
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false });
      return new Response(JSON.stringify({ credentials: creds || [] }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    logError(FUNCTION, 'Request failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
