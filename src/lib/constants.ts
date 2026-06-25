// ═══════════════════════════════════════════════════════════════
// CONSTANTS — UptimeOps
// Centralized configuration values
// ═══════════════════════════════════════════════════════════════

// ── App ──
export const APP_NAME = 'UptimeOps' as const;
export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = __BUILD_TIME__;
export const SUPPORT_EMAIL = 'support@uptimeops.com' as const;

// ── URLs ──
export const URLS = {
  app: import.meta.env.VITE_APP_URL || 'https://uptimeops.com',
  api: import.meta.env.VITE_API_URL || '',
  emergency: '/emergency',
  pricing: '/pricing',
  login: '/login',
  customerPortal: '/customer',
  engineerPortal: '/engineer',
  hqPortal: '/hq',
} as const;

// ── Timeouts ──
export const TIMEOUTS = {
  api: 30000,           // 30s API timeout
  credential: 4 * 3600000,  // 4h credential session
  credentialApproval: 5 * 60000,  // 5m approval window
  engineerResponse: 30 * 60000,   // 30m engineer assignment timeout
  autoDestroy: 4 * 3600000,       // 4h VM auto-destroy
  tempLink: 72 * 3600000,         // 72h temporary link expiry
  archiveAfter: 30 * 86400000,    // 30d archive old data
  auditLogRetention: 90 * 86400000, // 90d log retention
} as const;

// ── AI Pipeline ──
export const AI = {
  autoDeployThreshold: 90,     // Confidence % for auto-deploy
  maxRetries: 3,               // Per-agent retry count
  stepTimeoutMs: 60000,        // 60s per step
  agents: ['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'] as const,
  models: {
    primary: 'claude-3-5-sonnet-20241022',
    secondary: 'gpt-4o',
    infrastructure: 'jules',
  },
} as const;

// ── Pricing ──
export const PLANS = {
  guardian: {
    name: 'Guardian',
    price: 99,
    incidents: 3,
    responseTime: '15 min',
  },
  sentinel: {
    name: 'Sentinel',
    price: 249,
    incidents: 10,
    responseTime: '5 min',
  },
  fortress: {
    name: 'Fortress',
    price: 599,
    incidents: 999,
    responseTime: '2 min',
  },
} as const;

// ── Severity Levels ──
export const SEVERITY = {
  P1: { label: 'P1', name: 'P1_CRITICAL', color: '#ef4444', responseSla: 5 },
  P2: { label: 'P2', name: 'P2_HIGH', color: '#f97316', responseSla: 15 },
  P3: { label: 'P3', name: 'P3_MEDIUM', color: '#eab308', responseSla: 60 },
  P4: { label: 'P4', name: 'P4_LOW', color: '#22c55e', responseSla: 240 },
} as const;

// ── Incident Status ──
export const INCIDENT_STATUS = [
  'lead_capture',
  'payment_pending',
  'credential_submission',
  'triage',
  'isolate',
  'repair',
  'validate',
  'coordinator_approval',
  'deploy',
  'smoke_test',
  'verify_fix',
  'continuous_monitor',
] as const;

// ── Rate Limits ──
export const RATE_LIMITS = {
  public: { requests: 100, window: 60 },      // 100 req/min per IP
  authenticated: { requests: 500, window: 60 }, // 500 req/min per user
  strict: { requests: 10, window: 60 },         // 10 req/min for sensitive ops
} as const;

// ── Colors (for charts/gradient) ──
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

// ── Communication Channels ──
export const CHANNELS = ['email', 'sms', 'push', 'dashboard'] as const;

// ── Security ──
export const CSP = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'font-src': "'self'",
  'connect-src': "'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io",
  'frame-src': "https://*.stripe.com",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
} as const;

// ── LocalStorage Keys ──
export const STORAGE_KEYS = {
  authSession: 'uptimeops-auth-session',
  store: 'uptimeops-store',
  theme: 'uptimeops-theme',
  sidebarCollapsed: 'uptimeops-sidebar-collapsed',
} as const;
