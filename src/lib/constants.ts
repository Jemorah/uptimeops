// ═══════════════════════════════════════════════════════════════
// CONSTANTS — UptimeOps Multi-Subdomain
// Centralized configuration. All subdomain URLs derived from here.
// ═══════════════════════════════════════════════════════════════

// ── App ──
export const APP_NAME = 'UptimeOps' as const;
export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = __BUILD_TIME__;
export const SUPPORT_EMAIL = 'support@uptimeops.com' as const;

// ── Subdomain Configuration ──
// All four portals share one Vercel deployment. DNS CNAME → cname.vercel-dns.com
export const DOMAINS = {
  www:         'https://www.uptimeops.org',
  app:         'https://app.uptimeops.org',
  dashboard:   'https://dashboard.uptimeops.org',
  engineers:   'https://engineers.uptimeops.org',
} as const;

// Get domain for current environment (localhost support)
function currentDomain(key: keyof typeof DOMAINS): string {
  if (typeof window === 'undefined') return DOMAINS[key];
  const host = window.location.hostname;
  // Localhost: all subdomains run on same host with port/hash routing
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:5173`; // Vite dev server
  }
  return DOMAINS[key];
}

// ── URLs ──
export const URLS = {
  app: currentDomain('app'),
  dashboard: currentDomain('dashboard'),
  engineers: currentDomain('engineers'),
  www: currentDomain('www'),
  emergency: '/emergency',
  pricing: '/pricing',
  login: '/login',
} as const;

// ── Timeouts ──
export const TIMEOUTS = {
  api: 30000,
  credential: 4 * 3600000,
  credentialApproval: 5 * 60000,
  engineerResponse: 30 * 60000,
  autoDestroy: 4 * 3600000,
  tempLink: 72 * 3600000,
  archiveAfter: 30 * 86400000,
  auditLogRetention: 90 * 86400000,
} as const;

// ── AI Pipeline ──
export const AI = {
  autoDeployThreshold: 90,
  maxRetries: 3,
  stepTimeoutMs: 60000,
  agents: ['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'] as const,
  models: {
    primary: 'claude-3-5-sonnet-20241022',
    secondary: 'gpt-4o',
    infrastructure: 'jules',
  },
} as const;

// ── Stripe Product IDs ──
export const STRIPE_PRODUCTS = {
  rapidFix: import.meta.env.VITE_STRIPE_PRODUCT_RAPID_FIX || 'prod_Um718W8HxLu5q0',
  criticalFix: import.meta.env.VITE_STRIPE_PRODUCT_CRITICAL_FIX || 'prod_Um74N2ScOrpsh0',
  catastrophicFix: import.meta.env.VITE_STRIPE_PRODUCT_CATASTROPHIC_FIX || 'prod_Um75fvmmmJ9tTN',
  guardianMonthly: import.meta.env.VITE_STRIPE_PRODUCT_GUARDIAN_MONTHLY || 'prod_Um79wEliQGos8X',
  sentinelMonthly: import.meta.env.VITE_STRIPE_PRODUCT_SENTINEL_MONTHLY || 'prod_Um7AYtqRId4owu',
  fortressMonthly: import.meta.env.VITE_STRIPE_PRODUCT_FORTRESS_MONTHLY || 'prod_Um7Bx7cqfF4MvC',
  guardianYearly: import.meta.env.VITE_STRIPE_PRODUCT_GUARDIAN_YEARLY || 'prod_Um9dAynxxwolzX',
  sentinelYearly: import.meta.env.VITE_STRIPE_PRODUCT_SENTINEL_YEARLY || 'prod_Um9gZlxDs7fk4l',
  fortressYearly: import.meta.env.VITE_STRIPE_PRODUCT_FORTRESS_YEARLY || 'prod_Um9huwzGFCJaBa',
} as const;

// ── Stripe Publishable Key ──
export const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.STRIPE_PUBLISHABLE_KEY ||
  '';

// ── Stripe Return URLs (subdomain-aware) ──
// Customer billing redirects back to app.uptimeops.org
export function getStripeReturnUrl(success: boolean): string {
  const base = currentDomain('app');
  return `${base}/#/customer/billing?${success ? 'success=true' : 'canceled=true'}`;
}

// ── Pricing ──
export const PLANS = {
  guardian: {
    name: 'Guardian',
    price: 99,
    incidents: 3,
    responseTime: '< 2h',
    productMonthly: STRIPE_PRODUCTS.guardianMonthly,
    productYearly: STRIPE_PRODUCTS.guardianYearly,
  },
  sentinel: {
    name: 'Sentinel',
    price: 249,
    incidents: 10,
    responseTime: '5 min',
    productMonthly: STRIPE_PRODUCTS.sentinelMonthly,
    productYearly: STRIPE_PRODUCTS.sentinelYearly,
  },
  fortress: {
    name: 'Fortress',
    price: 599,
    incidents: 999,
    responseTime: '2 min',
    productMonthly: STRIPE_PRODUCTS.fortressMonthly,
    productYearly: STRIPE_PRODUCTS.fortressYearly,
  },
} as const;

// ── One-Time Fix Pricing ──
export const FIX_PRICING = {
  rapid: { price: 99, productId: STRIPE_PRODUCTS.rapidFix },
  critical: { price: 249, productId: STRIPE_PRODUCTS.criticalFix },
  catastrophic: { price: 599, productId: STRIPE_PRODUCTS.catastrophicFix },
} as const;

// ── Severity Levels ──
export const SEVERITY = {
  P1: { label: 'P1', name: 'P1_CRITICAL', color: '#ef4444', responseSla: 5 },
  P2: { label: 'P2', name: 'P2_HIGH', color: '#f97316', responseSla: 15 },
  P3: { label: 'P3', name: 'P3_MEDIUM', color: '#eab308', responseSla: 60 },
  P4: { label: 'P4', name: 'P4_LOW', color: '#22c55e', responseSla: 240 },
} as const;

// ── Colors ──
export const CHART_COLORS = {
  lime: '#d1ff00',
  cyan: '#00f0ff',
  magenta: '#ff0055',
  purple: '#a855f7',
  orange: '#f97316',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
} as const;

// ── CSP ──
export const CSP = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'font-src': "'self'",
  'connect-src': "'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io https://api.opsgenie.com",
  'frame-src': "https://*.stripe.com",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
} as const;
