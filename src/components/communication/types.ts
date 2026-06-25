// ═══════════════════════════════════════════════════════════════
// CUSTOMER COMMUNICATION TYPES
// Complete communication matrix, logs, templates, notifications
// ═══════════════════════════════════════════════════════════════

export type CommChannel = 'email' | 'sms' | 'dashboard' | 'push';
export type CommStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'suppressed' | 'opened' | 'clicked' | 'replied';
export type TemplateCategory = 'transactional' | 'marketing' | 'alert' | 'internal' | 'follow_up' | 'security';

// ── Communication Matrix Row (12 stages) ──
export interface CommMatrixRow {
  stage: string;
  stageKey: string;
  channels: CommChannel[];
  trigger: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

// ── Communication Log Entry ──
export interface CommLogEntry {
  id: string;
  incidentId: string | null;
  stage: string;
  channel: CommChannel;
  status: CommStatus;
  recipient: string;
  subject: string;
  body: string;
  templateId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  retryCount: number;
  maxRetries: number;
}

// ── Message Template ──
export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
  channels: CommChannel[];
  variables: string[];
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

// ── Delivery Status ──
export interface DeliveryStatus {
  logId: string;
  channel: CommChannel;
  status: CommStatus;
  progress: number;
  attempts: { at: string; status: CommStatus; detail: string }[];
  nextRetryAt: string | null;
}

// ── Notification (in-app) ──
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  read: boolean;
  incidentId: string | null;
  createdAt: string;
  actionUrl: string | null;
  actionLabel: string | null;
}

// ── Communication Preferences ──
export interface CommPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  dashboardEnabled: boolean;
  emailAddress: string;
  phoneNumber: string | null;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  alertCategories: Record<string, boolean>;
}

// ── One-Time Fix Dashboard ──
export interface OneTimeDashboard {
  token: string;
  expiresAt: string;
  incidentId: string;
  websiteUrl: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'archived';
  fixSummary: string;
  filesChanged: { path: string; action: 'modified' | 'added' | 'deleted' }[];
  beforeAfterNotes: string;
  auditReportUrl: string;
  actions: {
    confirmFixed: boolean;
    stillBroken: boolean;
    revokeCredentials: boolean;
  };
}

// ── Subscription Dashboard ──
export interface SubscriptionDashboard {
  customerId: string;
  plan: string;
  securityScore: number;
  uptime30d: number;
  uptime90d: number;
  uptime365d: number;
  activeIncidents: number;
  totalIncidents: number;
  monthlyReports: { month: string; url: string }[];
  billingHistory: { date: string; amount: number; status: string; invoiceUrl: string }[];
  credentialsManaged: number;
  lastSecurityScan: string;
  recommendations: string[];
}

// ── 12-Stage Communication Matrix ──
export const COMM_MATRIX: CommMatrixRow[] = [
  { stage: 'Payment Confirmed',     stageKey: 'payment_confirmed',       channels: ['email', 'sms'],           trigger: 'Instant',               priority: 'high',   description: 'Thank you — payment received, ticket created' },
  { stage: 'Ticket Received',       stageKey: 'ticket_received',         channels: ['email'],                  trigger: 'Within 60 seconds',     priority: 'high',   description: 'We got your request — here is your ticket ID' },
  { stage: 'Fix In Progress',       stageKey: 'fix_in_progress',         channels: ['sms', 'dashboard'],       trigger: 'When work starts',      priority: 'medium', description: 'Engineer assigned — repair is underway' },
  { stage: 'Critical Blocker',      stageKey: 'critical_blocker',        channels: ['sms', 'email'],           trigger: 'If fix stalls >15min',  priority: 'critical', description: 'We hit an issue — more time needed' },
  { stage: 'Fix Completed',         stageKey: 'fix_completed',           channels: ['sms', 'email', 'dashboard'], trigger: 'Immediate',           priority: 'high',   description: 'Your fix is ready — please verify' },
  { stage: 'Verification Request',  stageKey: 'verification_request',    channels: ['email'],                  trigger: '5 min after fix',       priority: 'high',   description: 'Please confirm your site is working' },
  { stage: 'Link Expiry Warning',   stageKey: 'link_expiry_warning',     channels: ['email'],                  trigger: '48h after completion',  priority: 'medium', description: 'Your access link expires in 24 hours' },
  { stage: 'Link Expired',          stageKey: 'link_expired',            channels: ['email'],                  trigger: '72h after completion',  priority: 'medium', description: 'Your access link has expired' },
  { stage: 'Monthly Report',        stageKey: 'monthly_report',          channels: ['email', 'dashboard'],     trigger: '1st of month',          priority: 'low',    description: 'Your monthly health report is ready' },
  { stage: 'Security Alert',        stageKey: 'security_alert',          channels: ['sms', 'email', 'dashboard'], trigger: 'Threat detected',    priority: 'critical', description: 'Security issue detected — action required' },
  { stage: 'Subscription Renewal',  stageKey: 'subscription_renewal',    channels: ['email'],                  trigger: '7 days before billing', priority: 'medium', description: 'Your subscription renews soon' },
  { stage: 'Credential Revoked',    stageKey: 'credential_revoked',      channels: ['email', 'sms'],           trigger: 'Instant',               priority: 'high',   description: 'Your credentials have been revoked' },
];

export const CHANNEL_COLORS: Record<CommChannel, string> = {
  email: '#00f0ff',
  sms: '#d1ff00',
  dashboard: '#a855f7',
  push: '#f97316',
};

export const STATUS_COLORS: Record<CommStatus, { bg: string; text: string }> = {
  pending:   { bg: 'bg-white/5',    text: 'text-white/30' },
  queued:    { bg: 'bg-yellow/10',   text: 'text-yellow-400' },
  sending:   { bg: 'bg-cyan/10',     text: 'text-cyan' },
  sent:      { bg: 'bg-cyan/10',     text: 'text-cyan' },
  delivered: { bg: 'bg-green/10',    text: 'text-green-400' },
  failed:    { bg: 'bg-red/10',      text: 'text-red-400' },
  bounced:   { bg: 'bg-orange/10',   text: 'text-orange-400' },
  suppressed:{ bg: 'bg-white/5',     text: 'text-white/20' },
  opened:    { bg: 'bg-purple/10',   text: 'text-purple-400' },
  clicked:   { bg: 'bg-lime/10',     text: 'text-lime' },
  replied:   { bg: 'bg-lime/10',     text: 'text-lime' },
};
