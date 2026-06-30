// ═══════════════════════════════════════════════════════════════
// USE SUBDOMAIN — Detect which portal to serve based on hostname
// Returns portal type, subdomain label, and subdomain-aware paths
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';

export type PortalType = 'landing' | 'customer' | 'hq' | 'engineer';

interface SubdomainConfig {
  portal: PortalType;
  label: string;
  hostname: string;
  basePath: string; // The internal path prefix (e.g., '/hq', '/customer')
}

const SUBDOMAIN_MAP: Record<string, SubdomainConfig> = {
  'app.uptimeops.org':       { portal: 'customer', label: 'Customer Portal', hostname: 'app.uptimeops.org',       basePath: '/customer' },
  'dashboard.uptimeops.org': { portal: 'hq',       label: 'HQ Control Center', hostname: 'dashboard.uptimeops.org', basePath: '/hq' },
  'engineers.uptimeops.org': { portal: 'engineer', label: 'Engineer Portal', hostname: 'engineers.uptimeops.org', basePath: '/engineer' },
  'www.uptimeops.org':       { portal: 'landing',  label: 'UptimeOps', hostname: 'www.uptimeops.org',       basePath: '' },
  'uptimeops.org':           { portal: 'landing',  label: 'UptimeOps', hostname: 'uptimeops.org',           basePath: '' },
  'localhost':               { portal: 'landing',  label: 'Local Dev', hostname: 'localhost',               basePath: '' },
};

export function getCurrentPortal(): SubdomainConfig {
  if (typeof window === 'undefined') {
    return SUBDOMAIN_MAP['www.uptimeops.org'];
  }
  const host = window.location.hostname;
  return SUBDOMAIN_MAP[host] || SUBDOMAIN_MAP['www.uptimeops.org'];
}

export function useSubdomain() {
  const config = useMemo(() => getCurrentPortal(), []);

  const isSubdomainMode = config.portal !== 'landing';

  // Convert a public path to the subdomain-aware path
  // e.g., on dashboard subdomain: '/hq/incidents' → '/incidents'
  // e.g., on landing: '/hq/incidents' stays '/hq/incidents'
  const toSubdomainPath = (fullPath: string): string => {
    if (!isSubdomainMode) return fullPath;
    if (fullPath.startsWith(config.basePath + '/')) {
      return fullPath.slice(config.basePath.length);
    }
    if (fullPath === config.basePath) {
      return '/';
    }
    return fullPath;
  };

  // Convert a subdomain path to the full internal path
  // e.g., on dashboard subdomain: '/incidents' → '/hq/incidents'
  const fromSubdomainPath = (subPath: string): string => {
    if (!isSubdomainMode) return subPath;
    if (subPath === '/') return config.basePath || '/';
    return config.basePath + subPath;
  };

  return {
    ...config,
    isSubdomainMode,
    toSubdomainPath,
    fromSubdomainPath,
  };
}

export { SUBDOMAIN_MAP };
