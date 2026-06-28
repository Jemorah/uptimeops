// ═══════════════════════════════════════════════════════════════
// ESCALATION BADGE
// Color-coded severity and status badges
// ═══════════════════════════════════════════════════════════════

import type { EscalationTrigger, EscalationStatus } from './types';
import { ESCALATION_TRIGGERS } from './types';

interface SeverityBadgeProps {
  severity: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    P1_CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/20',
    P2_HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    P3_MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    P4_LOW: 'bg-white/5 text-white/40 border-white/10',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono border ${colors[severity]}`}>
      {severity.replace('_', ' ')}
    </span>
  );
}

interface StatusBadgeProps {
  status: EscalationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<EscalationStatus, string> = {
    pending_assignment: 'bg-white/5 text-white/40 border-white/10',
    assigned: 'bg-cyan/10 text-cyan border-cyan/20',
    acknowledged: 'bg-blue/10 text-blue-400 border-blue/20',
    in_progress: 'bg-yellow/10 text-yellow-400 border-yellow/20',
    fix_submitted: 'bg-purple/10 text-purple-400 border-purple/20',
    coordinator_review: 'bg-orange/10 text-orange-400 border-orange/20',
    approved: 'bg-green/10 text-green-400 border-green/20',
    rejected: 'bg-red/10 text-red-400 border-red/20',
    deployed: 'bg-lime/10 text-lime border-lime/20',
    resolved: 'bg-lime/10 text-lime border-lime/20',
    closed: 'bg-white/5 text-white/30 border-white/10 line-through',
  };

  const label = status.replace(/_/g, ' ').toUpperCase();

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold border ${statusConfig[status]}`}>
      {label}
    </span>
  );
}

interface TriggerBadgeProps {
  trigger: EscalationTrigger;
}

export function TriggerBadge({ trigger }: TriggerBadgeProps) {
  const config = ESCALATION_TRIGGERS[trigger];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold border"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}
