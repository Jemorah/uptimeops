// ═══════════════════════════════════════════════════════════════
// ESCALATION SEQUENCE TIMELINE
// Visual 9-step escalation workflow
// ═══════════════════════════════════════════════════════════════

import { ESCALATION_SEQUENCE } from './types';
import type { EscalationStatus } from './types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface EscalationSequenceTimelineProps {
  currentStatus: EscalationStatus;
}

const statusToStep: Record<EscalationStatus, number> = {
  pending_assignment: 1,
  assigned: 2,
  acknowledged: 3,
  in_progress: 4,
  fix_submitted: 7,
  coordinator_review: 8,
  approved: 9,
  rejected: 6,
  deployed: 9,
  closed: 9,
};

export function EscalationSequenceTimeline({ currentStatus }: EscalationSequenceTimelineProps) {
  const currentStep = statusToStep[currentStatus] || 1;

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider">Escalation Sequence</h3>
      </div>
      <div className="p-4">
        <div className="space-y-1">
          {ESCALATION_SEQUENCE.map((seq) => {
            const isCompleted = seq.step < currentStep;
            const isCurrent = seq.step === currentStep;

            return (
              <div
                key={seq.step}
                className={`flex items-start gap-3 p-2 rounded-sm transition-all ${
                  isCurrent ? 'bg-lime/5 border border-lime/20' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-lime" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-lime animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${
                      isCompleted ? 'text-lime' : isCurrent ? 'text-lime' : 'text-white/20'
                    }`}>
                      {String(seq.step).padStart(2, '0')}
                    </span>
                    <span className={`text-sm font-medium ${
                      isCompleted ? 'text-white/60' : isCurrent ? 'text-white' : 'text-white/20'
                    }`}>
                      {seq.label}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ml-6 ${
                    isCompleted ? 'text-white/30' : isCurrent ? 'text-white/40' : 'text-white/15'
                  }`}>
                    {seq.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
