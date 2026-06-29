// UptimeOps — Temporary Link Generator
// Creates time-limited, single-use access tokens for credential decryption

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createHash } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

const FUNCTION = 'temporary-link-generator';

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token + (Deno.env.get('TOKEN_SALT') || 'uptimeops-default-salt'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

serve(async (req) => {
  logInfo(FUNCTION, 'Request received');
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, customer_id, entity_type, entity_id, credential_id, max_uses, token_hash } = body;
    const supabase = getSupabaseClient(req);

    // Generate new temporary link
    if (action === 'generate') {
      if (!customer_id || !entity_type || !entity_id) {
        return new Response(JSON.stringify({ error: 'customer_id, entity_type, entity_id required' }), { status: 400, headers: corsHeaders });
      }

      const token = generateToken();
      const hash = await hashToken(token);

      const { data: link } = await supabase.from('temporary_links').insert({
        token_hash: hash,
        entity_type,
        entity_id,
        customer_id,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        access_count: 0,
        status: 'active',
      }).select().single();

      return new Response(JSON.stringify({
        generated: true,
        token, // Return once — client must store securely
        token_hash: hash,
        link_id: link?.id,
        expires_at: link?.expires_at,
        url: `/verify?token=${token}&type=${entity_type}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate and consume a token
    if (action === 'validate') {
      if (!token_hash) return new Response(JSON.stringify({ error: 'token_hash required' }), { status: 400, headers: corsHeaders });

      const { data: link } = await supabase.from('temporary_links')
        .select('*').eq('token_hash', token_hash).eq('status', 'active').single();

      if (!link) return new Response(JSON.stringify({ valid: false, reason: 'token_not_found' }), { status: 200, headers: corsHeaders });
      if (new Date(link.expires_at) < new Date()) {
        await supabase.from('temporary_links').update({ status: 'expired' }).eq('id', link.id);
        return new Response(JSON.stringify({ valid: false, reason: 'expired' }), { headers: corsHeaders });
      }
      if (max_uses && link.access_count >= max_uses) {
        await supabase.from('temporary_links').update({ status: 'consumed' }).eq('id', link.id);
        return new Response(JSON.stringify({ valid: false, reason: 'max_uses_reached' }), { headers: corsHeaders });
      }

      // Update access count
      await supabase.from('temporary_links').update({
        access_count: link.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      }).eq('id', link.id);

      return new Response(JSON.stringify({
        valid: true,
        link_id: link.id,
        entity_type: link.entity_type,
        entity_id: link.entity_id,
        customer_id: link.customer_id,
        access_count: link.access_count + 1,
      }), { headers: corsHeaders });
    }

    // Revoke a token
    if (action === 'revoke') {
      if (!token_hash) return new Response(JSON.stringify({ error: 'token_hash required' }), { status: 400, headers: corsHeaders });
      await supabase.from('temporary_links').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('token_hash', token_hash);
      return new Response(JSON.stringify({ revoked: true }), { headers: corsHeaders });
    }

    // List active links for customer
    if (action === 'list') {
      if (!customer_id) return new Response(JSON.stringify({ error: 'customer_id required' }), { status: 400, headers: corsHeaders });
      const { data: links } = await supabase.from('temporary_links')
        .select('id, entity_type, entity_id, status, access_count, expires_at, created_at')
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false });
      return new Response(JSON.stringify({ links: links || [] }), { headers: corsHeaders });
    }

    // Cleanup expired links (cron action)
    if (action === 'cleanup_expired') {
      const { data: expired } = await supabase.from('temporary_links')
        .select('id').eq('status', 'active').lt('expires_at', new Date().toISOString());

      let count = 0;
      for (const link of expired || []) {
        await supabase.from('temporary_links').update({ status: 'expired' }).eq('id', link.id);
        count++;
      }
      return new Response(JSON.stringify({ cleaned: count }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    logError(FUNCTION, 'Request failed', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }), { status: 500, headers: corsHeaders });
  }
});
