// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps Multi-Subdomain
// Cookie-based session storage for cross-domain auth sharing.
// Cookie domain: .uptimeops.org (readable by www, app, dashboard, engineers)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// PUBLIC credentials — safe to expose in browser code.
const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

// ── Subdomain detection ──
function getRootDomain(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  // Production: extract the root domain (e.g., uptimeops.org from app.uptimeops.org)
  if (host.endsWith('uptimeops.org')) return '.uptimeops.org';
  if (host.endsWith('uptimeops.com')) return '.uptimeops.com';
  // Vercel preview deployments or localhost
  if (host.includes('vercel.app') || host === 'localhost') return host;
  return host;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

// ── Cookie helpers ──
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
  // Delete by setting past expiry on all domain variants
  document.cookie = `${name}=;path=/;domain=${domain};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── Cookie-based storage adapter for Supabase auth ──
// Replaces localStorage so the session cookie is shared across subdomains.
const COOKIE_KEY = 'sb-session';

const cookieStorage: Storage = {
  get length() {
    return getCookie(COOKIE_KEY) ? 1 : 0;
  },
  key() {
    return COOKIE_KEY;
  },
  getItem(key: string): string | null {
    // Supabase stores session under sb-<project-ref>-auth-token
    if (key.includes('auth-token')) return getCookie(COOKIE_KEY);
    return getCookie(key) || null;
  },
  setItem(key: string, value: string): void {
    if (key.includes('auth-token')) {
      // Session expiry from JWT — parse and set cookie max-age
      try {
        const parsed = JSON.parse(value);
        const expiresAt = parsed?.expires_at;
        const maxAge = expiresAt ? Math.floor(expiresAt - Date.now() / 1000) : 604800; // default 7 days
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

// ── Export Supabase client ──
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: cookieStorage,
    storageKey: 'sb-session',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

// Subdomain → portal mapping
export const SUBDOMAINS = {
  www: 'www.uptimeops.org',
  app: 'app.uptimeops.org',
  dashboard: 'dashboard.uptimeops.org',
  engineers: 'engineers.uptimeops.org',
} as const;

// Role → subdomain mapping
export function getSubdomainForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return SUBDOMAINS.app;
    case 'coordinator':
    case 'admin': return SUBDOMAINS.dashboard;
    case 'engineer': return SUBDOMAINS.engineers;
    default: return SUBDOMAINS.www;
  }
}

// Get current hostname portal
export function getCurrentPortal(): 'www' | 'app' | 'dashboard' | 'engineers' {
  if (typeof window === 'undefined') return 'www';
  const host = window.location.hostname;
  if (host.startsWith('app.')) return 'app';
  if (host.startsWith('dashboard.')) return 'dashboard';
  if (host.startsWith('engineers.')) return 'engineers';
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
