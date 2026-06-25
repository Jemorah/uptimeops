// ═══════════════════════════════════════════════════════════════
// INCIDENT LIFECYCLE TYPES
// Complete Pre-Event → Post-Event state machine
// ═══════════════════════════════════════════════════════════════

// ── 11-Stage Lifecycle ──
export type LifecycleStage =
  | 'lead_capture'      // Stage 1: Landing page form
  | 'service_selection' // Stage 2: Pricing/Service choice
  | 'checkout'          // Stage 3: Stripe payment
  | 'credential_submit' // Stage 4: Zero-knowledge credential vault
  | 'triage_isolation'  // Stage 5: AI Agent 1 + 2
  | 'repair_validate'   // Stage 6: AI Agent 3 + 4
  | 'coordinator_gate'  // Stage 7: Pre-deployment approval
  | 'deployment'        // Stage 8: Agent 5 deploy with rollback
  | 'customer_verify'   // Stage 9: Human-in-the-loop
  | 'audit_report'      // Stage 10: Agent 6 audit
  | 'follow_up'         // Stage 11: Retention & monitoring
  | 'continuous_monitor'; // Subscription: ongoing monitoring

// ── Incident Status (unified across lifecycle) ──
export type UnifiedIncidentStatus =
  | 'new'                 // Just created
  | 'payment_pending'     // Waiting for checkout
  | 'credentials_needed'  // Waiting for credential submission
  | 'triaging'            // AI Agent 1 running
  | 'isolating'           // AI Agent 2 running
  | 'repairing'           // AI Agent 3 running
  | 'validating'          // AI Agent 4 running
  | 'pending_approval'    // Awaiting coordinator
  | 'approved'            // Coordinator approved
  | 'deploying'           // Agent 5 deploying
  | 'deployed'            // Live, pending customer verify
  | 'rollback'            // Deploy failed, rolled back
  | 'customer_verified'   // Customer confirmed fix
  | 'customer_rejected'   // Customer says still broken
  | 'auditing'            // Agent 6 compiling report
  | 'closed'              // Complete
  | 'reopened'            // Customer rejected, back to triage
  | 'escalated'           // Human engineer handling
  | 'on_hold'             // Paused
  | 'cancelled';          // Customer cancelled

// ── Service Tier ──
export type ServiceType = 'one_time' | 'subscription';

export type OneTimeTier = 'rapid' | 'critical' | 'catastrophic';
export type SubscriptionTier = 'guardian' | 'sentinel' | 'fortress';

export interface ServiceSelection {
  type: ServiceType;
  tier: OneTimeTier | SubscriptionTier;
  price: number;
  label: string;
  description: string;
  features: string[];
}

// ── Lead ──
export interface Lead {
  id: string;
  email: string;
  websiteUrl: string;
  painPoint: string;
  urgencyKeywords: string[];
  leadScore: number;       // 0-100
  source: 'landing_page' | 'emergency_page' | 'referral' | 'direct';
  status: 'new' | 'contacted' | 'converted' | 'dormant';
  createdAt: string;
  convertedAt: string | null;
  customerId: string | null;
}

// ── Credential Submission Result ──
export interface CredentialSubmission {
  id: string;
  customerId: string;
  credentialType: 'sftp' | 'ssh' | 'wordpress' | 'hosting' | 'api' | 'other';
  fingerprint: string;
  expiryHours: number;
  submittedAt: string;
  status: 'active' | 'expired' | 'revoked' | 'purged';
}

// ── Deployment State ──
export interface DeploymentState {
  status: 'pending' | 'backing_up' | 'deploying' | 'smoke_testing' | 'deployed' | 'rolled_back' | 'failed';
  backupSnapshotId: string | null;
  deployedAt: string | null;
  smokeTestResults: SmokeTestResult[];
  rollbackReason: string | null;
  deployDurationSeconds: number | null;
}

export interface SmokeTestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'running';
  duration: number; // ms
  detail: string;
  timestamp: string;
}

// ── Customer Verification ──
export interface CustomerVerification {
  status: 'pending' | 'requested' | 'confirmed_fixed' | 'still_broken' | 'auto_closed' | 'expired';
  requestedAt: string;
  respondedAt: string | null;
  response: 'yes' | 'no' | null;
  feedback: string | null;
  autoCloseAt: string; // 24h from request
}

// ── Audit Report ──
export interface AuditReport {
  id: string;
  incidentId: string;
  generatedAt: string;
  totalDuration: string;
  totalCost: number;
  agentsInvolved: string[];
  filesModified: number;
  testsPassed: number;
  testsFailed: number;
  rootCause: string;
  fixDescription: string;
  complianceCertificateId: string | null;
  vmDestroyedAt: string | null;
  credentialsPurgedAt: string | null;
  accessLog: AccessLogEntry[];
}

export interface AccessLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  ip?: string;
}

// ── Follow-up Email Sequence ──
export interface FollowUpEmail {
  id: string;
  templateId: string;
  scheduledAt: string;
  sentAt: string | null;
  openedAt: string | null;
  subject: string;
  status: 'scheduled' | 'sent' | 'opened' | 'bounced';
}

// ── Monitoring State (Subscription) ──
export interface MonitoringState {
  isActive: boolean;
  uptimeChecks: UptimeCheck[];
  lastCheckAt: string;
  uptimePercentage: number;
  securityScans: SecurityScan[];
  performanceBenchmarks: PerformanceBenchmark[];
  autoFixesEnabled: boolean;
  autoFixesCount: number;
  alerts: MonitoringAlert[];
}

export interface UptimeCheck {
  timestamp: string;
  status: 'up' | 'down' | 'slow';
  responseTime: number; // ms
  statusCode: number;
}

export interface SecurityScan {
  id: string;
  scannedAt: string;
  findings: 'none' | 'low' | 'medium' | 'high' | 'critical';
  detail: string;
}

export interface PerformanceBenchmark {
  id: string;
  timestamp: string;
  ttfb: number;        // Time to first byte (ms)
  fcp: number;         // First contentful paint (ms)
  lcp: number;         // Largest contentful paint (ms)
  tti: number;         // Time to interactive (ms)
  score: number;       // 0-100
}

export interface MonitoringAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'uptime' | 'security' | 'performance' | 'ssl' | 'backup';
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
}

// ── Full Incident Lifecycle ──
export interface IncidentLifecycle {
  id: string;
  currentStage: LifecycleStage;
  status: UnifiedIncidentStatus;
  lead: Lead | null;
  serviceSelection: ServiceSelection | null;
  credentialSubmission: CredentialSubmission | null;
  deploymentState: DeploymentState | null;
  customerVerification: CustomerVerification | null;
  auditReport: AuditReport | null;
  followUpEmails: FollowUpEmail[];
  monitoringState: MonitoringState | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  history: LifecycleHistoryEntry[];
}

export interface LifecycleHistoryEntry {
  stage: LifecycleStage;
  status: UnifiedIncidentStatus;
  timestamp: string;
  note: string;
  actor: 'system' | 'ai' | 'customer' | 'coordinator' | 'engineer';
}

// ── Stage Configs (for UI rendering) ──
export const LIFECYCLE_STAGE_CONFIG: Record<LifecycleStage, {
  label: string;
  number: number;
  description: string;
  icon: string;
  color: string;
  actor: string;
  estimatedTime: string;
}> = {
  lead_capture:       { label: 'Lead Capture',       number: 1,  description: 'Visitor submits contact info',              icon: 'UserPlus',     color: '#00f0ff', actor: 'Customer',       estimatedTime: '< 1 min' },
  service_selection:  { label: 'Service Selection',  number: 2,  description: 'Choose One-Time or Subscription tier',       icon: 'Package',      color: '#d1ff00', actor: 'Customer',       estimatedTime: '2 min' },
  checkout:           { label: 'Checkout',           number: 3,  description: 'Stripe payment processing',                  icon: 'CreditCard',   color: '#22c55e', actor: 'System',         estimatedTime: '1 min' },
  credential_submit:  { label: 'Credential Submit',  number: 4,  description: 'Zero-knowledge credential encryption',       icon: 'Lock',         color: '#a855f7', actor: 'Customer',       estimatedTime: '3 min' },
  triage_isolation:   { label: 'Triage & Isolate',   number: 5,  description: 'AI classifies issue, spawns VM',             icon: 'Scan',         color: '#00f0ff', actor: 'AI: TRIAGE+ISOLATE', estimatedTime: '5 min' },
  repair_validate:    { label: 'Repair & Validate',  number: 6,  description: 'AI executes fix and runs tests',              icon: 'Wrench',       color: '#d1ff00', actor: 'AI: REPAIR+VALIDATE', estimatedTime: '10-30 min' },
  coordinator_gate:   { label: 'Coordinator Gate',   number: 7,  description: 'Human approval before deployment',           icon: 'ShieldCheck',  color: '#f97316', actor: 'Coordinator',    estimatedTime: '5-15 min' },
  deployment:         { label: 'Deployment',         number: 8,  description: 'Live deploy with automatic rollback',        icon: 'Rocket',       color: '#f97316', actor: 'AI: DEPLOY',     estimatedTime: '3 min' },
  customer_verify:    { label: 'Customer Verify',    number: 9,  description: 'Human confirms fix is working',              icon: 'CheckCircle',  color: '#22c55e', actor: 'Customer',       estimatedTime: '5 min' },
  audit_report:       { label: 'Audit & Report',     number: 10, description: 'Compliance audit and report generation',     icon: 'FileText',     color: '#a855f7', actor: 'AI: AUDIT',      estimatedTime: '2 min' },
  follow_up:          { label: 'Follow-up',          number: 11, description: 'Email sequences and retention',              icon: 'Mail',         color: '#00f0ff', actor: 'System',         estimatedTime: '7 days' },
  continuous_monitor: { label: 'Monitoring',         number: 12, description: 'Continuous uptime & security monitoring',    icon: 'Activity',     color: '#d1ff00', actor: 'System',         estimatedTime: 'Ongoing' },
};

// ── State Machine Transitions ──
export const LIFECYCLE_TRANSITIONS: Record<UnifiedIncidentStatus, UnifiedIncidentStatus[]> = {
  new: ['payment_pending', 'cancelled'],
  payment_pending: ['credentials_needed', 'cancelled'],
  credentials_needed: ['triaging', 'on_hold'],
  triaging: ['isolating', 'escalated'],
  isolating: ['repairing', 'escalated'],
  repairing: ['validating', 'escalated'],
  validating: ['pending_approval', 'escalated', 'repairing'], // loop back on fail
  pending_approval: ['approved', 'escalated'],
  approved: ['deploying'],
  deploying: ['deployed', 'rollback'],
  deployed: ['customer_verified', 'customer_rejected'],
  rollback: ['repairing', 'escalated'],
  customer_verified: ['auditing'],
  customer_rejected: ['triaging', 'escalated'], // reopen
  auditing: ['closed'],
  closed: ['reopened'],
  reopened: ['triaging', 'escalated'],
  escalated: ['repairing', 'pending_approval', 'closed'],
  on_hold: ['triaging', 'cancelled'],
  cancelled: ['new'],
};

export const STAGE_ORDER: LifecycleStage[] = [
  'lead_capture',
  'service_selection',
  'checkout',
  'credential_submit',
  'triage_isolation',
  'repair_validate',
  'coordinator_gate',
  'deployment',
  'customer_verify',
  'audit_report',
  'follow_up',
  'continuous_monitor',
];
