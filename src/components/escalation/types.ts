// ═══════════════════════════════════════════════════════════════
// HUMAN ESCALATION SYSTEM TYPES
// Escalation triggers, sequence, and engineer assignment
// ═══════════════════════════════════════════════════════════════

export type EscalationTrigger =
  | 'low_confidence'         // AI confidence < 90%
  | 'agent_timeout'          // Agent exceeded timeout
  | 'security_finding'       // Critical security issue
  | 'customer_request'       // Customer explicitly asked
  | 'smoke_test_failure'     // Fix failed smoke tests twice
  | 'coordinator_flag'       // Manual coordinator flag
  | 'p1_critical';           // P1 severity auto-escalation

export type EscalationStatus =
  | 'pending_assignment'     // Waiting for engineer
  | 'assigned'               // Engineer assigned, notified
  | 'acknowledged'           // Engineer acknowledged
  | 'in_progress'            // Engineer working on fix
  | 'fix_submitted'          // Fix submitted for approval
  | 'coordinator_review'     // Coordinator reviewing
  | 'approved'               // Approved, ready to deploy
  | 'rejected'               // Rejected, back to engineer
  | 'deployed'               // Fix deployed
  | 'resolved'               // AI resolved before human took over
  | 'closed';                // Escalation resolved

export type EngineerLevel = 'L1' | 'L2' | 'L3';

export interface EscalationRecord {
  id: string;
  incidentId: string;
  trigger: EscalationTrigger;
  status: EscalationStatus;
  assignedEngineerId: string | null;
  assignedEngineerName: string | null;
  engineerLevel: EngineerLevel | null;
  specialty: string | null;
  aiConfidence: number | null;
  aiLogs: string[];
  customerVisible: boolean;
  handoffNotes: HandoffNote[];
  coordinatorId: string | null;
  coordinatorDecision: 'approved' | 'rejected' | null;
  coordinatorNotes: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface HandoffNote {
  id: string;
  author: string;
  authorRole: 'engineer' | 'coordinator' | 'ai';
  content: string;
  createdAt: string;
}

export interface EscalatedIncident {
  id: string;
  title: string;
  websiteUrl: string;
  severity: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
  category: string;
  customerEmail: string;
  escalationStatus: EscalationStatus;
  escalationTrigger: EscalationTrigger;
  assignedEngineer: string | null;
  aiConfidence: number | null;
  aiAttemptSummary: string;
  createdAt: string;
  lastUpdated: string;
  requiresSpecialty: string | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole: 'engineer' | 'coordinator' | 'system';
  content: string;
  timestamp: string;
}

export const ESCALATION_TRIGGERS: Record<EscalationTrigger, { label: string; color: string; priority: number }> = {
  p1_critical: { label: 'P1 Critical Auto-Escalation', color: '#ef4444', priority: 1 },
  smoke_test_failure: { label: 'Smoke Test Double Failure', color: '#f97316', priority: 2 },
  security_finding: { label: 'Critical Security Finding', color: '#ef4444', priority: 3 },
  customer_request: { label: 'Customer Requested Engineer', color: '#00f0ff', priority: 4 },
  agent_timeout: { label: 'Agent Timeout', color: '#eab308', priority: 5 },
  low_confidence: { label: 'AI Confidence < 90%', color: '#eab308', priority: 6 },
  coordinator_flag: { label: 'Coordinator Flagged', color: '#a855f7', priority: 7 },
};

export const ESCALATION_SEQUENCE = [
  { step: 1, label: 'Auto-Assign', desc: 'Round-robin + specialty match' },
  { step: 2, label: 'Notify', desc: 'SMS + Email + Portal alert' },
  { step: 3, label: 'Engineer Login', desc: 'Access Engineer Portal' },
  { step: 4, label: 'Review Context', desc: 'AI logs, triage, validation' },
  { step: 5, label: 'VM Access', desc: 'Secure VM with decrypted credentials' },
  { step: 6, label: 'Manual Repair', desc: 'Engineer performs fix, all logged' },
  { step: 7, label: 'Submit Fix', desc: 'For coordinator approval' },
  { step: 8, label: 'Coordinator Review', desc: 'Approve or reject' },
  { step: 9, label: 'Deploy/Iterate', desc: 'Deploy or return to step 6' },
] as const;
