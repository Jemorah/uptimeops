// UptimeOps — Credential Decrypt
// Decrypts credentials for authorized engineers (requires coordinator approval)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'credential-decrypt';

serve(async (req) => {
  logInfo(FUNCTION, 'Request received');
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { credential_id, engineer_id, approval_token } = await req.json();
    if (!credential_id || !engineer_id) {
      return new Response(JSON.stringify({ error: 'credential_id and engineer_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient(req);
    const user = getAuthUser(req);

    // Verify engineer has permission
    const { data: eng } = await supabase.from('engineer_profiles')
      .select('*').eq('id', engineer_id).single();
    if (!eng) return new Response(JSON.stringify({ error: 'Engineer not found' }), { status: 404, headers: corsHeaders });

    // Check if engineer is assigned to the incident that owns this credential
    const { data: cred } = await supabase.from('credentials_vault')
      .select('*, customers(id)').eq('id', credential_id).single();
    if (!cred) return new Response(JSON.stringify({ error: 'Credential not found' }), { status: 404, headers: corsHeaders });

    // Verify approval token or coordinator status
    let approved = false;
    if (approval_token) {
      const { data: tempLink } = await supabase.from('temporary_links')
        .select('*').eq('token_hash', approval_token).eq('status', 'active').single();
      approved = !!tempLink && new Date(tempLink.expires_at) > new Date();
    }

    if (!approved) {
      // Check if user is coordinator or admin
      const { data: role } = await supabase.from('user_roles')
        .select('role').eq('user_id', user?.id || '00000000-0000-0000-0000-000000000000').single();
      approved = role?.role === 'coordinator' || role?.role === 'admin';
    }

    if (!approved) {
      return new Response(JSON.stringify({ error: 'Approval required. Request a temporary access link from your coordinator.' }), { status: 403, headers: corsHeaders });
    }

    // Return encrypted payload — decryption happens client-side with engineer's private key
    await supabase.from('credentials_vault').update({
      access_count: (cred.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    }).eq('id', credential_id);

    await supabase.from('audit_logs').insert({
      table_name: 'credentials_vault', entity_type: 'credential', entity_id: credential_id,
      action: 'credential_accessed', performed_by_type: 'engineer', performed_by_id: eng.user_id,
      new_values: { engineer_id, accessed_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({
      accessed: true,
      encrypted_payload: cred.encrypted_payload,
      iv: cred.iv,
      salt: cred.salt,
      expires_at: cred.expires_at,
    }), { headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, \'Request failed\', err);;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
