// ═══════════════════════════════════════════════════════════════
// STATUS TRACKER — Real-time status badge with transition log
// ═══════════════════════════════════════════════════════════════

import { Activity, ArrowRight, Clock, User, Bot, Shield } from 'lucide-react';
import type { IncidentLifecycle, LifecycleHistoryEntry } from './types';

interface StatusTrackerProps {
  lifecycle: IncidentLifecycle;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new:                 { bg: 'bg-white/5',       text: 'text-white/40',    border: 'border-white/10' },
  payment_pending:     { bg: 'bg-yellow/10',     text: 'text-yellow-400',  border: 'border-yellow/20' },
  credentials_needed:  { bg: 'bg-purple/10',     text: 'text-purple-400',  border: 'border-purple/20' },
  triaging:            { bg: 'bg-cyan/10',       text: 'text-cyan',        border: 'border-cyan/20' },
  isolating:           { bg: 'bg-cyan/10',       text: 'text-cyan',        border: 'border-cyan/20' },
  repairing:           { bg: 'bg-lime/10',       text: 'text-lime',        border: 'border-lime/20' },
  validating:          { bg: 'bg-green/10',      text: 'text-green-400',   border: 'border-green/20' },
  pending_approval:    { bg: 'bg-orange/10',     text: 'text-orange-400',  border: 'border-orange/20' },
  approved:            { bg: 'bg-green/10',      text: 'text-green-400',   border: 'border-green/20' },
  deploying:           { bg: 'bg-orange/10',     text: 'text-orange-400',  border: 'border-orange/20' },
  deployed:            { bg: 'bg-cyan/10',       text: 'text-cyan',        border: 'border-cyan/20' },
  rollback:            { bg: 'bg-red/10',        text: 'text-red-400',     border: 'border-red/20' },
  customer_verified:   { bg: 'bg-lime/10',       text: 'text-lime',        border: 'border-lime/20' },
  customer_rejected:   { bg: 'bg-red/10',        text: 'text-red-400',     border: 'border-red/20' },
  auditing:            { bg: 'bg-purple/10',     text: 'text-purple-400',  border: 'border-purple/20' },
  closed:              { bg: 'bg-lime/10',       text: 'text-lime',        border: 'border-lime/20' },
  reopened:            { bg: 'bg-yellow/10',     text: 'text-yellow-400',  border: 'border-yellow/20' },
  escalated:           { bg: 'bg-red/10',        text: 'text-red-400',     border: 'border-red/20' },
  on_hold:             { bg: 'bg-white/5',       text: 'text-white/40',    border: 'border-white/10' },
  cancelled:           { bg: 'bg-white/5',       text: 'text-white/30',    border: 'border-white/10' },
};

function getActorIcon(actor: LifecycleHistoryEntry['actor']) {
  switch (actor) {
    case 'customer':    return <User className="w-3 h-3" />;
    case 'ai':          return <Bot className="w-3 h-3" />;
    case 'coordinator': return <Shield className="w-3 h-3" />;
    case 'engineer':    return <User className="w-3 h-3" />;
    default:            return <Activity className="w-3 h-3" />;
  }
}

function getActorColor(actor: LifecycleHistoryEntry['actor']) {
  switch (actor) {
    case 'customer':    return 'text-cyan';
    case 'ai':          return 'text-lime';
    case 'coordinator': return 'text-purple-400';
    case 'engineer':    return 'text-orange-400';
    default:            return 'text-white/30';
  }
}

export function StatusTracker({ lifecycle }: StatusTrackerProps) {
  const colors = STATUS_COLORS[lifecycle.status] || STATUS_COLORS.new;

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan" />
          Status Tracker
        </h3>
      </div>

      {/* Current Status Badge */}
      <div className="p-4 border-b border-white/5">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 border ${colors.bg} ${colors.text} ${colors.border}`}>
          <div className={`w-2 h-2 rounded-full ${
            lifecycle.status === 'closed' ? 'bg-lime' :
            lifecycle.status === 'escalated' || lifecycle.status === 'rollback' ? 'bg-red-400 animate-pulse' :
            'bg-cyan animate-pulse'
          }`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {lifecycle.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-xs text-white/30 mt-2 font-mono">
          {lifecycle.id} — Updated {new Date(lifecycle.updatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* Transition History */}
      <div className="max-h-[300px] overflow-y-auto">
        {lifecycle.history.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-white/20">No transitions yet. Start the lifecycle.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {lifecycle.history.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 p-3 hover:bg-white/[0.01] transition-colors">
                <div className={`flex-shrink-0 mt-0.5 ${getActorColor(entry.actor)}`}>
                  {getActorIcon(entry.actor)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase ${getActorColor(entry.actor)}`}>
                      {entry.actor}
                    </span>
                    <ArrowRight className="w-2 h-2 text-white/10" />
                    <span className="text-[10px] text-white/20 uppercase">
                      {entry.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">{entry.note}</p>
                </div>
                <div className="flex-shrink-0 text-[10px] text-white/15 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
