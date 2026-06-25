import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ── Supabase Client ──
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ── Role Types ──
export type UserRole = 'public' | 'customer' | 'engineer' | 'coordinator' | 'admin';

// ── Enums ──
export type CustomerSubscriptionStatus = 'none' | 'active' | 'paused' | 'cancelled';
export type SubscriptionTier = 'none' | 'guardian' | 'sentinel' | 'fortress';
export type FixStatus = 'pending_payment' | 'paid' | 'triage' | 'isolating' | 'repairing' | 'validating' | 'coordinator_review' | 'deploying' | 'completed' | 'failed' | 'refunded';
export type FixTier = 'rapid' | 'critical' | 'catastrophic';
export type IssueCategory = 'malware' | 'plugin_conflict' | 'broken_code' | 'ddos' | 'firewall' | 'performance' | 'other';
export type SubStatus = 'active' | 'paused' | 'cancelled' | 'past_due';
export type IncidentStatus = 'open' | 'in_progress' | 'ai_repairing' | 'human_escalated' | 'coordinator_review' | 'deployed' | 'verified_closed' | 'auto_rolled_back' | 'failed';
export type IncidentSeverity = 'p1_critical' | 'p2_high' | 'p3_medium' | 'p4_low';
export type VmSessionStatus = 'spawning' | 'cloned' | 'diagnosing' | 'repairing' | 'testing' | 'approved' | 'deployed' | 'destroyed' | 'failed';
export type EngineerRole = 'l1_support' | 'l2_specialist' | 'l3_architect' | 'security_expert';
export type EngineerStatus = 'online' | 'on_call' | 'offline' | 'busy';
export type CoordinatorRole = 'super_admin' | 'coordinator' | 'billing_admin';
export type AuditEntityType = 'customer' | 'incident' | 'vm_session' | 'one_time_fix' | 'subscription' | 'engineer_action';
export type PerformerType = 'ai_agent' | 'engineer' | 'coordinator' | 'customer' | 'system';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ── Table Types ──
export interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  subscription_status: CustomerSubscriptionStatus;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  marketing_consent: boolean;
  lead_source: string;
}

export interface OneTimeFix {
  id: string;
  customer_id: string;
  status: FixStatus;
  tier: FixTier;
  website_url: string;
  issue_description: string | null;
  issue_category: IssueCategory;
  payment_intent_id: string | null;
  amount_paid: number | null;
  temporary_access_token: string | null;
  temporary_link_expires_at: string | null;
  vm_session_id: string | null;
  ai_confidence_score: number | null;
  escalated_to_engineer: boolean;
  engineer_id: string | null;
  coordinator_approved: boolean;
  coordinator_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Subscription {
  id: string;
  customer_id: string;
  tier: SubscriptionTier;
  status: SubStatus;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  monthly_incident_allowance: number;
  incidents_used_this_period: number;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  subscription_id: string | null;
  one_time_fix_id: string | null;
  customer_id: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  title: string;
  description: string | null;
  website_url: string;
  vm_session_id: string | null;
  ai_confidence_score: number | null;
  escalation_reason: string | null;
  engineer_id: string | null;
  coordinator_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface VmSession {
  id: string;
  incident_id: string | null;
  one_time_fix_id: string | null;
  session_status: VmSessionStatus;
  clone_url: string | null;
  isolated_environment_id: string | null;
  ai_agent_logs: any[] | null;
  test_results: Record<string, unknown> | null;
  confidence_score: number | null;
  rollback_snapshot_id: string | null;
  deployment_approved_by: string | null;
  deployment_approved_at: string | null;
  destroyed_at: string | null;
  created_at: string;
}

export interface Engineer {
  id: string;
  email: string;
  full_name: string;
  role: EngineerRole;
  status: EngineerStatus;
  specialties: string[];
  current_session_id: string | null;
  last_active_at: string | null;
  created_at: string;
}

export interface Coordinator {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: CoordinatorRole;
  permissions: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: string;
  performed_by: string | null;
  performed_by_type: PerformerType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CredentialsVault {
  id: string;
  customer_id: string;
  incident_id: string | null;
  one_time_fix_id: string | null;
  encrypted_payload: string;
  public_key_fingerprint: string;
  session_key_hash: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
}

export interface Communication {
  id: string;
  customer_id: string;
  incident_id: string | null;
  channel: 'email' | 'sms' | 'dashboard';
  template_id: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  content: string;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface DeploymentApproval {
  id: string;
  vm_session_id: string;
  coordinator_id: string;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
}
