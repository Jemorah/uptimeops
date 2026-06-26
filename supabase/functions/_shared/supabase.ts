// Shared Supabase client for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

export function getSupabaseClient(req?: Request) {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const options: Record<string, unknown> = {
    auth: { autoRefreshToken: false, persistSession: false },
  };

  if (req) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      options.global = { headers: { Authorization: authHeader } };
    }
  }

  return createClient(url, key, options);
}

export function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ? { id: payload.sub, ...payload } : null;
  } catch {
    return null;
  }
}
