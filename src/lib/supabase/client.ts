// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps Multi-Subdomain
// Cookie-based session storage for cross-domain auth sharing.
//
// CRITICAL: detectSessionInUrl is DISABLED because it conflicts
// with HashRouter. OAuth params are in the hash fragment, not
// the URL query string, so Supabase can't auto-detect them.
// Instead, AuthCallbackPage manually handles the OAuth callback.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

function getRootDomain(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host.endsWith('uptimeops.org')) return '.uptimeops.org';
  if (host.endsWith('uptimeops.com')) return '.uptimeops.com';
  if (host.includes('vercel.app') || host === 'localhost') return host;
  return host;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

function setCookie(name: string, value: string, options?: { maxAge?: number; expires?: Date }) {
  const domain = getRootDomain();
  const secure = !isLocalhost();
  let cookie = `${name}=${encodeURIComponent(value)};path=/;SameSite=Lax`;
  cookie += `;domain=${domain}`;
  if (secure) cookie += ';Secure';
  if (options?.maxAge) cookie += `;max-age=${options.maxAge}`;
  if (options?.expires) cookie += `;expires=${options.expires.toUTCString()}`;
  document.cookie = cookie;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  const domain = getRootDomain();
  document.cookie = `${name}=;path=/;domain=${domain};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

const COOKIE_KEY = 'sb-session';

const cookieStorage: Storage = {
  get length() { return getCookie(COOKIE_KEY) ? 1 : 0; },
  key() { return COOKIE_KEY; },
  getItem(key: string): string | null {
    if (key.includes('auth-token')) return getCookie(COOKIE_KEY);
    return getCookie(key) || null;
  },
  setItem(key: string, value: string): void {
    if (key.includes('auth-token')) {
      try {
        const parsed = JSON.parse(value);
        const expiresAt = parsed?.expires_at;
        const maxAge = expiresAt ? Math.floor(expiresAt - Date.now() / 1000) : 604800;
        setCookie(COOKIE_KEY, value, { maxAge });
      } catch {
        setCookie(COOKIE_KEY, value, { maxAge: 604800 });
      }
    }
  },
  removeItem(key: string): void {
    if (key.includes('auth-token')) deleteCookie(COOKIE_KEY);
  },
  clear(): void {
    deleteCookie(COOKIE_KEY);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // DISABLED — HashRouter puts params in hash, not search
    flowType: 'pkce',
    storage: cookieStorage,
    storageKey: 'sb-session',
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

export function isWwwDomain(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === 'www.uptimeops.org'
    || host === 'uptimeops.org'
    || host.includes('vercel.app');
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
