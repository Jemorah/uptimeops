// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — Enhanced with Realtime
// Browser client: Auth + Database + Realtime subscriptions
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Main Supabase client with all features
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-application-name': 'uptimeops',
    },
  },
});

// ── Typed helpers ──

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Convenience type exports for common tables
export type CredentialsVault = Tables<'credentials_vault'>;

// ── User role type ──
export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

export interface Customer {
  id: string;
  email: string;
  full_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  phone?: string | null;
  plan?: string;
  status?: string;
  mrr?: number;
  subscription_status?: string;
  subscription_tier?: string;
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Realtime subscription helpers ──

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void;
}

/**
 * Subscribe to real-time database changes
 * Returns cleanup function to unsubscribe
 */
export function subscribeToTable(config: RealtimeConfig): () => void {
  const channel = supabase
    .channel(`db-changes-${config.table}-${Date.now()}`)
    .on(
      'postgres_changes' as never,
      {
        event: config.event || '*',
        schema: 'public',
        table: config.table,
        filter: config.filter,
      },
      (payload) => {
        config.callback({
          eventType: payload.eventType,
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // console.log(`[Realtime] Subscribed to ${config.table}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error on ${config.table}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to a specific incident's updates
 */
export function subscribeToIncident(
  incidentId: string,
  callback: (payload: { eventType: string; new: Record<string, unknown> }) => void
): () => void {
  return subscribeToTable({
    table: 'incidents',
    event: 'UPDATE',
    filter: `id=eq.${incidentId}`,
    callback,
  });
}

/**
 * Subscribe to the incidents queue (for engineer dashboard)
 */
export function subscribeToIncidentQueue(
  callback: (payload: { eventType: string; new: Record<string, unknown> }) => void
): () => void {
  return subscribeToTable({
    table: 'incidents',
    event: '*',
    callback,
  });
}

/**
 * Subscribe to audit logs
 */
export function subscribeToAuditLogs(
  callback: (payload: { eventType: string; new: Record<string, unknown> }) => void
): () => void {
  return subscribeToTable({
    table: 'audit_logs',
    event: 'INSERT',
    callback,
  });
}

// ── Auth helpers ──

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ── RLS-safe queries ──

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single() as { data: { role: string } | null; error: Error | null };

  if (error || !data) return null;
  return data.role as UserRole;
}
