// ═══════════════════════════════════════════════════════════════
// LIFECYCLE TIMELINE — Visual 12-stage horizontal progress
// Shows current stage, completed stages, and transitions
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  UserPlus, Package, CreditCard, Lock, Scan, Wrench,
  ShieldCheck, Rocket, CheckCircle, FileText, Mail, Activity,
  Clock, CheckCircle2, Circle
} from 'lucide-react';
import type { IncidentLifecycle, LifecycleStage } from './types';
import { LIFECYCLE_STAGE_CONFIG, STAGE_ORDER } from './types';

const STAGE_ICONS: Record<string, React.ElementType> = {
  UserPlus, Package, CreditCard, Lock, Scan, Wrench,
  ShieldCheck, Rocket, CheckCircle, FileText, Mail, Activity,
};

interface LifecycleTimelineProps {
  lifecycle: IncidentLifecycle;
}


export function LifecycleTimeline({ lifecycle }: LifecycleTimelineProps) {
  const [expandedStage, setExpandedStage] = useState<LifecycleStage | null>(null);

  const currentIndex = STAGE_ORDER.indexOf(lifecycle.currentStage);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-lime" />
              Incident Lifecycle
            </h3>
            <p className="text-xs text-white/30 mt-1 font-mono">
              {lifecycle.id} — Stage {Math.min(currentIndex + 1, 12)} of 12
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              lifecycle.status === 'closed' ? 'bg-lime' :
              lifecycle.status === 'escalated' ? 'bg-red-400' :
              lifecycle.status === 'rollback' ? 'bg-orange-400' :
              'bg-cyan animate-pulse'
            }`} />
            <span className="text-xs text-white/40 font-mono">{lifecycle.status}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="h-1.5 bg-white/5 overflow-hidden">
          <div
            className="h-full bg-lime transition-all duration-1000"
            style={{ width: `${Math.min(100, ((currentIndex + 1) / 12) * 100)}%` }}
          />
        </div>
      </div>

      {/* Stage Nodes */}
      <div className="p-4">
        <div className="flex items-start gap-1 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage, index) => {
            const config = LIFECYCLE_STAGE_CONFIG[stage];
            const Icon = STAGE_ICONS[config.icon] || Circle;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isExpanded = expandedStage === stage;

            return (
              <div key={stage} className="flex items-start flex-1 min-w-[80px]">
                {/* Connector line */}
                {index > 0 && (
                  <div className={`w-4 h-px mt-4 flex-shrink-0 ${
                    isCompleted || isCurrent ? 'bg-lime/30' : 'bg-white/5'
                  }`} />
                )}

                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage)}
                  className={`flex flex-col items-center text-center w-full px-1 py-2 rounded-sm transition-all ${
                    isCurrent ? 'bg-lime/[0.03]' : 'hover:bg-white/[0.01]'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 flex items-center justify-center border mb-2 transition-colors ${
                    isCompleted ? 'bg-lime/10 border-lime/30 text-lime' :
                    isCurrent ? 'bg-cyan/10 border-cyan/30 text-cyan' :
                    'bg-white/5 border-white/10 text-white/20'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${
                    isCompleted ? 'text-lime' :
                    isCurrent ? 'text-white' :
                    'text-white/20'
                  }`}>
                    {config.label.split(' ')[0]}
                  </span>
                  <span className={`text-[9px] ${
                    isCompleted ? 'text-lime/50' :
                    isCurrent ? 'text-white/40' :
                    'text-white/15'
                  }`}>
                    {isCompleted ? 'DONE' : isCurrent ? 'NOW' : `${config.estimatedTime}`}
                  </span>

                  {/* Status dot */}
                  {isCurrent && (
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Stage Detail */}
      {expandedStage && (
        <div className="border-t border-white/5 p-4 bg-black/20">
          <StageDetail
            stage={expandedStage}
            lifecycle={lifecycle}
            isCurrent={expandedStage === lifecycle.currentStage}
          />
        </div>
      )}
    </div>
  );
}

function StageDetail({ stage, lifecycle, isCurrent }: {
  stage: LifecycleStage;
  lifecycle: IncidentLifecycle;
  isCurrent: boolean;
}) {
  const config = LIFECYCLE_STAGE_CONFIG[stage];
  const history = lifecycle.history.filter(h => h.stage === stage);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold" style={{ color: config.color }}>
            {config.number}. {config.label}
          </h4>
          <p className="text-xs text-white/40 mt-0.5">{config.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {config.estimatedTime}
          </span>
          <span className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            {config.actor}
          </span>
        </div>
      </div>

      {/* History for this stage */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          {history.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3 h-3 text-lime flex-shrink-0 mt-0.5" />
              <span className="text-white/50">{entry.note}</span>
              <span className="text-white/20 font-mono text-[10px] ml-auto flex-shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {isCurrent && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
          <span className="text-xs text-cyan animate-pulse">In progress...</span>
        </div>
      )}

      {history.length === 0 && !isCurrent && (
        <p className="text-xs text-white/20 italic">Not yet reached this stage</p>
      )}
    </div>
  );
}
