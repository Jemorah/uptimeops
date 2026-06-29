// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — UptimeOps
// Cookie-based session storage for cross-subdomain auth.
// Cookie domain=.uptimeops.org shares session across ALL subdomains.
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://npcopjsqgjvirfjnjemt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8';

const STORAGE_KEY = 'sb-session';

// ── Cookie helpers ──
function getCookieDomain(): string {
  if (typeof window === 'undefined') return 'localhost';
  const host = window.location.hostname;
  // Custom domain: .uptimeops.org for cross-subdomain
  if (host.endsWith('uptimeops.org')) return '.uptimeops.org';
  // Everything else: exact hostname (Vercel, localhost)
  return host;
}

function isSecure(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:';
}

function setCookie(name: string, value: string, maxAge: number) {
  const domain = getCookieDomain();
  const secure = isSecure();
  let cookie = `${name}=${encodeURIComponent(value)};path=/;SameSite=Lax`;
  cookie += `;domain=${domain}`;
  if (secure) cookie += ';Secure';
  cookie += `;max-age=${maxAge}`;
  try {
    document.cookie = cookie;
  } catch (e) {
    console.error('[Cookie] Failed to set cookie:', e);
  }
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function deleteCookie(name: string) {
  const domain = getCookieDomain();
  try {
    document.cookie = `${name}=;path=/;domain=${domain};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch (e) {
    console.error('[Cookie] Failed to delete cookie:', e);
  }
}

// ── Cookie-based storage adapter ──
const cookieStorage: Storage = {
  get length() {
    try { return getCookie(STORAGE_KEY) ? 1 : 0; } catch { return 0; }
  },
  key() { return STORAGE_KEY; },
  getItem(key: string): string | null {
    if (key === STORAGE_KEY || key.includes('auth-token')) {
      return getCookie(STORAGE_KEY);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (key === STORAGE_KEY || key.includes('auth-token')) {
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
    if (key === STORAGE_KEY || key.includes('auth-token')) {
      deleteCookie(STORAGE_KEY);
    }
  },
  clear(): void {
    deleteCookie(STORAGE_KEY);
  },
};

// ── Supabase client ──
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
