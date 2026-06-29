// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Primary: localStorage (reliable, battle-tested)
// Mirror:   cookies with domain=.uptimeops.org (for cross-subdomain only)
// On Vercel: localStorage only (single domain — cookies scoped to hostname)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

// ── Cross-subdomain cookie mirror (only on uptimeops.org) ──
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  const host = window.location.hostname;
  if (!host.endsWith('uptimeops.org')) return; // Only set on custom domain
  let cookie = `${name}=${encodeURIComponent(value)};path=/;SameSite=Lax;Secure`;
  cookie += `;domain=.uptimeops.org`;
  cookie += `;max-age=${maxAge}`;
  document.cookie = cookie;
}

function deleteCookie(name: string) {
  const host = window.location.hostname;
  if (!host.endsWith('uptimeops.org')) return;
  document.cookie = `${name}=;path=/;domain=.uptimeops.org;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── localStorage + optional cookie mirror ──
const STORAGE_KEY = 'sb-session';

const hybridStorage: Storage = {
  get length() { return localStorage.getItem(STORAGE_KEY) ? 1 : 0; },
  key() { return STORAGE_KEY; },
  getItem(key: string): string | null {
    const val = localStorage.getItem(key);
    if (val) return val;
    // Fallback to cookie (cross-subdomain migration)
    return key.includes('auth-token') || key === STORAGE_KEY ? getCookie(STORAGE_KEY) : null;
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    // Mirror to cookie for cross-subdomain (uptimeops.org only)
    if (key.includes('auth-token') || key === STORAGE_KEY) {
      try {
        const parsed = JSON.parse(value);
        const expiresAt = parsed?.expires_at;
        const maxAge = expiresAt ? Math.floor(expiresAt - Date.now() / 1000) : 604800;
        setCookie(STORAGE_KEY, value, maxAge);
      } catch {
        setCookie(STORAGE_KEY, value, 604800);
      }
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
    if (key.includes('auth-token') || key === STORAGE_KEY) deleteCookie(STORAGE_KEY);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    deleteCookie(STORAGE_KEY);
  },
};

// ── Supabase client ──
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,  // ENABLED — handles OAuth callback auto-detection
    flowType: 'pkce',
    storage: hybridStorage,
    storageKey: STORAGE_KEY,
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
  const host = window.location.hostname;
  return host.endsWith('uptimeops.org') && !host.includes('vercel.app');
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

export function getCurrentPortal(): 'www' | 'app' | 'dashboard' | 'engineers' {
  if (typeof window === 'undefined') return 'www';
  const host = window.location.hostname;
  if (host.startsWith('app.')) return 'app';
  if (host.startsWith('dashboard.')) return 'dashboard';
  if (host.startsWith('engineers.')) return 'engineers';
  const hash = window.location.hash;
  if (hash.startsWith('#/customer')) return 'app';
  if (hash.startsWith('#/hq')) return 'dashboard';
  if (hash.startsWith('#/engineer')) return 'engineers';
  return 'www';
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  if (error || !data) return 'customer';
  return (data.role as UserRole) || 'customer';
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
