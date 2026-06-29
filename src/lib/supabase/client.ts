// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Cross-subdomain cookie-based session storage.
// Cookie domain=.uptimeops.org shares session across ALL subdomains.
// On Vercel (vercel.app): localStorage fallback since cookie domain won't match.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

const STORAGE_KEY = 'sb-session';

// ── Determine the correct cookie domain for the current host ──
function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  // Custom domain: use .uptimeops.org for cross-subdomain sharing
  if (host.endsWith('uptimeops.org')) {
    return '.uptimeops.org';
  }
  // Vercel deployment: scope cookie to the exact hostname
  // (localStorage is the primary store on Vercel, cookie is fallback)
  if (host.includes('vercel.app') || host === 'localhost' || host === '127.0.0.1') {
    return host;
  }
  // Other domains: use exact hostname
  return host;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

// ── Cookie helpers ──
function setCookie(name: string, value: string, maxAge: number) {
  const domain = getCookieDomain();
  if (!domain) return;
  const secure = !isLocalhost();
  let cookie = `${name}=${encodeURIComponent(value)};path=/;SameSite=Lax`;
  cookie += `;domain=${domain}`;
  if (secure) cookie += ';Secure';
  cookie += `;max-age=${maxAge}`;
  document.cookie = cookie;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  const domain = getCookieDomain();
  if (!domain) return;
  // Delete on the configured domain
  document.cookie = `${name}=;path=/;domain=${domain};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  // Also delete without domain (localhost fallback)
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── Cookie-based storage adapter for Supabase auth ──
// This replaces localStorage so the session is shared across subdomains.
const cookieStorage: Storage = {
  get length() {
    return getCookie(STORAGE_KEY) ? 1 : 0;
  },
  key() {
    return STORAGE_KEY;
  },
  getItem(key: string): string | null {
    if (key.includes('auth-token') || key === STORAGE_KEY) {
      return getCookie(STORAGE_KEY);
    }
    return null;
  },
  setItem(key: string, value: string): void {
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
    if (key.includes('auth-token') || key === STORAGE_KEY) {
      deleteCookie(STORAGE_KEY);
    }
  },
  clear(): void {
    deleteCookie(STORAGE_KEY);
  },
};

// ── Supabase client — cookie-based auth ──
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: cookieStorage,
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

// ── Is this running on the custom domain (uptimeops.org)? ──
export function isSubdomainMode(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('uptimeops.org');
}

// ── Role → subdomain mapping ──
export function getSubdomainForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return SUBDOMAINS.app;
    case 'coordinator':
    case 'admin': return SUBDOMAINS.dashboard;
    case 'engineer': return SUBDOMAINS.engineers;
    default: return SUBDOMAINS.www;
  }
}

// ── Role → path mapping (for single-domain / Vercel mode) ──
export function getPortalPathForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return '/customer';
    case 'coordinator': return '/hq';
    case 'admin': return '/hq';
    case 'engineer': return '/engineer';
    default: return '/';
  }
}

// ── Get user role from database ──
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
