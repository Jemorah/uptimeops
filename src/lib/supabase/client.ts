// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Uses localStorage for session persistence (reliable, no size limit).
// When subdomains (uptimeops.org) are configured, add cookie mirror.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// Read from Supabase-Vercel synced env vars (NEXT_SUPABASE_*) with hardcoded fallback
const SUPABASE_URL = import.meta.env.NEXT_SUPABASE_URL || 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.NEXT_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

// ── Supabase client with localStorage (default, reliable) ──
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Use default localStorage — NO custom cookie storage.
    // The Supabase session (~5KB encoded) exceeds the 4KB browser cookie limit.
    // localStorage has no size limit and is reliable on Vercel / single-domain.
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

export const SUBDOMAINS = {
  www: 'www.uptimeops.org',
  app: 'app.uptimeops.org',
  dashboard: 'dashboard.uptimeops.org',
  engineers: 'engineers.uptimeops.org',
} as const;

export function isSubdomainMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('uptimeops.org');
}

export function getSubdomainForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return SUBDOMAINS.app;
    case 'coordinator':
    case 'admin': return SUBDOMAINS.dashboard;
    case 'engineer': return SUBDOMAINS.engineers;
    default: return SUBDOMAINS.www;
  }
}

export function getPortalPathForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return '/customer';
    case 'coordinator': return '/hq';
    case 'admin': return '/hq';
    case 'engineer': return '/engineer';
    default: return '/';
  }
}

export const ADMIN_EMAIL = 'cumouat@gmail.com';
export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function subscribeToTable(table: string, callback: (payload: any) => void): () => void {
  const channel = supabase
    .channel(`${table}-${Date.now()}`)
    .on('postgres_changes' as never, { event: '*', schema: 'public', table }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
