// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Explicit localStorage config. No custom cookie storage.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.NEXT_SUPABASE_URL || 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.NEXT_SUPABASE_ANON_KEY || 'sb_publishable_paEHPh1k230D6ud1VMcTgQ_dMOT-9pL';

// Explicitly configure localStorage with the correct key.
// Supabase default key is: sb-<project-ref>-auth-token
const localStorageAdapter: Storage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); } catch (e) { console.error('[Storage] setItem failed:', e); }
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
  key: (index) => {
    try { return localStorage.key(index); } catch { return null; }
  },
  get length() {
    try { return localStorage.length; } catch { return 0; }
  },
  clear: () => {
    try { localStorage.clear(); } catch { /* ignore */ }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // CRITICAL: Must be FALSE with HashRouter. The hash fragment (/#/hq) is
    // used for routing, not OAuth tokens. When true, Supabase parses "#/hq"
    // as auth params, fails, and clears the session — causing instant redirect
    // to login after every successful sign-in.
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: localStorageAdapter,
    storageKey: 'sb-npcopjsqgjvirfjnjemt-auth-token',
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
