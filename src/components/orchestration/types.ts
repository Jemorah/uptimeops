// ═══════════════════════════════════════════════════════════════
// AI MULTI-AGENT ORCHESTRATION TYPES
// 6-Agent Pipeline: TRIAGE → ISOLATE → REPAIR → VALIDATE → DEPLOY → AUDIT
// ═══════════════════════════════════════════════════════════════

export type AgentName = 'TRIAGE' | 'ISOLATE' | 'REPAIR' | 'VALIDATE' | 'DEPLOY' | 'AUDIT';

export type AgentStatus =
  | 'queued'      // Waiting for previous agent
  | 'running'     // Currently executing
  | 'completed'   // Finished successfully
  | 'failed'      // Failed, needs escalation
  | 'escalated'   // Handed to human engineer
  | 'paused'      // Manually paused by coordinator
  | 'skipped'     // Skipped (e.g., AUDIT on critical failure)
  | 'timeout'     // Exceeded time limit
  | 'rollback';   // Deployment rolled back

export interface AgentConfig {
  name: AgentName;
  number: number;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: string;
  description: string;
  model: string;
  timeoutSeconds: number;
  costPerMinute: number;
}

export interface AgentLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'system';
  message: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  startedAt: string | null;
  completedAt: string | null;
  progress: number;        // 0-100
  confidence: number | null;
  logs: AgentLogEntry[];
  output: Record<string, unknown> | null;
  cost: number;            // Accumulated cost in USD
  elapsedSeconds: number;
  timeoutSeconds: number;
  errorMessage: string | null;
  escalatedTo: string | null;
}

export interface PipelineIncident {
  id: string;
  title: string;
  customerId: string;
  customerEmail: string;
  websiteUrl: string;
  severity: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
  category: string;
  currentAgent: AgentName | null;
  agents: Record<AgentName, AgentState>;
  overallStatus: 'running' | 'completed' | 'failed' | 'escalated' | 'paused' | 'rolled_back';
  totalCost: number;
  startedAt: string;
  completedAt: string | null;
  vmSessionId: string | null;
  coordinatorApproved: boolean;
  rollbackSnapshotId: string | null;
}

export const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  TRIAGE: {
    name: 'TRIAGE',
    number: 1,
    color: '#00f0ff',
    bgColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.25)',
    glowColor: '0 0 20px rgba(0, 240, 255, 0.3)',
    icon: 'Brain',
    description: 'Fast classification & severity scoring',
    model: 'Claude',
    timeoutSeconds: 120,
    costPerMinute: 0.05,
  },
  ISOLATE: {
    name: 'ISOLATE',
    number: 2,
    color: '#f0c000',
    bgColor: 'rgba(240, 192, 0, 0.08)',
    borderColor: 'rgba(240, 192, 0, 0.25)',
    glowColor: '0 0 20px rgba(240, 192, 0, 0.3)',
    icon: 'Server',
    description: 'Infrastructure automation & VM spawn',
    model: 'Jules',
    timeoutSeconds: 300,
    costPerMinute: 0.15,
  },
  REPAIR: {
    name: 'REPAIR',
    number: 3,
    color: '#d1ff00',
    bgColor: 'rgba(209, 255, 0, 0.08)',
    borderColor: 'rgba(209, 255, 0, 0.25)',
    glowColor: '0 0 20px rgba(209, 255, 0, 0.3)',
    icon: 'Wrench',
    description: 'Collaborative coding & fix execution',
    model: 'Claude + Jules',
    timeoutSeconds: 1800,
    costPerMinute: 0.25,
  },
  VALIDATE: {
    name: 'VALIDATE',
    number: 4,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    glowColor: '0 0 20px rgba(34, 197, 94, 0.3)',
    icon: 'CheckCircle',
    description: 'Testing & confidence scoring',
    model: 'Claude',
    timeoutSeconds: 600,
    costPerMinute: 0.10,
  },
  DEPLOY: {
    name: 'DEPLOY',
    number: 5,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
    glowColor: '0 0 20px rgba(249, 115, 22, 0.3)',
    icon: 'Rocket',
    description: 'Coordinator-gated deployment',
    model: 'Jules',
    timeoutSeconds: 900,
    costPerMinute: 0.20,
  },
  AUDIT: {
    name: 'AUDIT',
    number: 6,
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    glowColor: '0 0 20px rgba(168, 85, 247, 0.3)',
    icon: 'FileText',
    description: 'Compliance & reporting',
    model: 'Claude',
    timeoutSeconds: 300,
    costPerMinute: 0.03,
  },
};

export const AGENT_ORDER: AgentName[] = ['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'];
