// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Public project URL and anon key (safe to expose in frontend).
// Service role key must NEVER be exposed — server-side only.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// These are PUBLIC credentials — safe to expose in browser code.
// The anon key has restricted permissions (RLS policies control access).
const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

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
