// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Single source of truth for all Supabase interactions
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// Read env vars — VITE_ prefix required for Vite to expose to browser
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '[UptimeOps] CRITICAL: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set.\n' +
    'The app cannot connect to Supabase. Set these in your Vercel environment variables.'
  );
}

export const supabase = createClient(
  url || '',
  key || '',
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
    global: {
      headers: { 'x-application-name': 'uptimeops' },
    },
  }
);

// ── Auth helpers ──
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) { console.error('[Auth] getSession error:', error.message); return null; }
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) { console.error('[Auth] getUser error:', error.message); return null; }
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[Auth] signOut error:', error.message);
  return { error };
}

// ── Role detection ──
export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) return 'customer'; // default for authenticated users
  return (data.role as UserRole) || 'customer';
}

// ── Realtime helpers ──
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: string
): () => void {
  const channel = supabase
    .channel(`${table}-changes-${Date.now()}`)
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table, filter },
      callback
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
