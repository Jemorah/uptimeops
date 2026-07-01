// ═══════════════════════════════════════════════════════════════
// USE SUBDOMAIN — Detect which portal to serve based on hostname
// Supports: hostname matching, query param override (?portal=x),
// localStorage override, Vercel preview fallback
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';

export type PortalType = 'landing' | 'customer' | 'hq' | 'engineer';

interface SubdomainConfig {
  portal: PortalType;
  label: string;
  hostname: string;
  basePath: string;
}

const SUBDOMAIN_MAP: Record<string, SubdomainConfig> = {
  'app.uptimeops.org':       { portal: 'customer', label: 'Customer Portal', hostname: 'app.uptimeops.org',       basePath: '/customer' },
  'dashboard.uptimeops.org': { portal: 'hq',       label: 'HQ Control Center', hostname: 'dashboard.uptimeops.org', basePath: '/hq' },
  'engineers.uptimeops.org': { portal: 'engineer', label: 'Engineer Portal', hostname: 'engineers.uptimeops.org', basePath: '/engineer' },
  'www.uptimeops.org':       { portal: 'landing',  label: 'UptimeOps', hostname: 'www.uptimeops.org',       basePath: '' },
  'uptimeops.org':           { portal: 'landing',  label: 'UptimeOps', hostname: 'uptimeops.org',           basePath: '' },
  'localhost':               { portal: 'landing',  label: 'Local Dev', hostname: 'localhost',               basePath: '' },
  '127.0.0.1':               { portal: 'landing',  label: 'Local Dev', hostname: '127.0.0.1',               basePath: '' },
};

/**
 * Detect which portal to render based on:
 * 1. Query param override (?portal=customer|hq|engineer) — highest priority
 * 2. localStorage override (portal_override key)
 * 3. Hostname matching (exact + subdomain pattern)
 * 4. Default to landing
 */
export function getCurrentPortal(): SubdomainConfig {
  if (typeof window === 'undefined') {
    return SUBDOMAIN_MAP['www.uptimeops.org'];
  }

  // 1. Check query param override (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const portalParam = urlParams.get('portal');
  if (portalParam === 'customer') return { ...SUBDOMAIN_MAP['app.uptimeops.org'] };
  if (portalParam === 'hq') return { ...SUBDOMAIN_MAP['dashboard.uptimeops.org'] };
  if (portalParam === 'engineer') return { ...SUBDOMAIN_MAP['engineers.uptimeops.org'] };

  // 2. Check localStorage override
  const lsOverride = localStorage.getItem('portal_override');
  if (lsOverride === 'customer') return { ...SUBDOMAIN_MAP['app.uptimeops.org'] };
  if (lsOverride === 'hq') return { ...SUBDOMAIN_MAP['dashboard.uptimeops.org'] };
  if (lsOverride === 'engineer') return { ...SUBDOMAIN_MAP['engineers.uptimeops.org'] };

  // 3. Check hostname
  const host = window.location.hostname;

  // Exact match
  if (SUBDOMAIN_MAP[host]) return { ...SUBDOMAIN_MAP[host] };

  // Subdomain pattern match (works for *.vercel.app previews too)
  if (host.startsWith('app.')) return { ...SUBDOMAIN_MAP['app.uptimeops.org'] };
  if (host.startsWith('dashboard.')) return { ...SUBDOMAIN_MAP['dashboard.uptimeops.org'] };
  if (host.startsWith('engineers.')) return { ...SUBDOMAIN_MAP['engineers.uptimeops.org'] };

  // Vercel preview: check if the project slug contains a hint
  if (host.includes('vercel.app')) {
    // On Vercel preview, all domains point to same deployment
    // Default to landing but allow override via query param or localStorage
    return { ...SUBDOMAIN_MAP['www.uptimeops.org'] };
  }

  // Default
  return { ...SUBDOMAIN_MAP['www.uptimeops.org'] };
}

/**
 * React hook wrapper around getCurrentPortal
 */
export function useSubdomain() {
  const config = useMemo(() => getCurrentPortal(), []);

  const setPortalOverride = (portal: PortalType | null) => {
    if (portal === null || portal === 'landing') {
      localStorage.removeItem('portal_override');
    } else {
      localStorage.setItem('portal_override', portal);
    }
    window.location.reload();
  };

  return {
    ...config,
    setPortalOverride,
  };
}

export { SUBDOMAIN_MAP };
