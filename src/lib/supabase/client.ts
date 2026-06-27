// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Hardcoded project URL (public). Anon key from env var.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// Project URL is public — safe to hardcode
const DEFAULT_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';

// Vite only exposes VITE_ prefixed env vars to browser.
// Vercel Supabase integration sets SUPABASE_ANON_KEY (no prefix).
// We check both — set whichever you have in Vercel.
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || DEFAULT_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

if (!key) {
  console.error(
    '[UptimeOps] CRITICAL: Supabase anon key not found.\n' +
    'Add ONE of these to your Vercel environment variables:\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJhbGci...  (if you added manually)\n' +
    '  SUPABASE_ANON_KEY=eyJhbGci...        (if using Vercel-Supabase integration)\n' +
    'Get the key from: Supabase Dashboard → Project Settings → API → anon public'
  );
}

export const supabase = createClient(
  url,
  key || 'missing-key-placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  if (error || !data) return 'customer';
  return (data.role as UserRole) || 'customer';
}

export function subscribeToTable(
  table: string,
  callback: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`${table}-${Date.now()}`)
    .on('postgres_changes' as never, { event: '*', schema: 'public', table }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
