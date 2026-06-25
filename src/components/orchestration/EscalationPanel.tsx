import { AlertTriangle, UserX, Clock, ArrowRight } from 'lucide-react';
import type { PipelineIncident } from './types';
import { AGENT_CONFIGS } from './types';

interface EscalationPanelProps {
  incident: PipelineIncident;
}

export function EscalationPanel({ incident }: EscalationPanelProps) {
  const escalatedAgents = Object.values(incident.agents).filter(
    a => a.status === 'escalated' || a.status === 'timeout' || a.status === 'failed'
  );

  const warnings = Object.values(incident.agents).filter(a => {
    if (a.status !== 'running') return false;
    const percentUsed = (a.elapsedSeconds / a.timeoutSeconds) * 100;
    return percentUsed > 70;
  });

  if (escalatedAgents.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Active Escalations */}
      {escalatedAgents.length > 0 && (
        <div className="bg-magenta/5 border border-magenta/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-magenta" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-magenta">
              {escalatedAgents.length} Active Escalation{escalatedAgents.length > 1 ? 's' : ''}
            </h3>
          </div>
          {escalatedAgents.map(agent => {
            const config = AGENT_CONFIGS[agent.name];
            return (
              <div key={agent.name} className="flex items-center gap-3 text-sm">
                <span className="font-bold" style={{ color: config.color }}>
                  {agent.name}
                </span>
                <span className="text-white/40 capitalize">{agent.status}</span>
                <ArrowRight className="w-3 h-3 text-white/20" />
                <span className="text-magenta font-medium">
                  {agent.escalatedTo || 'Engineer pool'}
                </span>
                {agent.errorMessage && (
                  <span className="text-xs text-white/30 ml-auto">{agent.errorMessage}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeout Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-500">
              Timeout Warnings
            </h3>
          </div>
          {warnings.map(agent => {
            const config = AGENT_CONFIGS[agent.name];
            const remaining = agent.timeoutSeconds - agent.elapsedSeconds;
            const isCritical = remaining < 60;

            return (
              <div key={agent.name} className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: config.color }}>
                  {agent.name}
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className={`w-3 h-3 ${isCritical ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                  <span className={isCritical ? 'text-red-500 font-bold' : 'text-yellow-500'}>
                    {Math.floor(remaining / 60)}m {remaining % 60}s remaining
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
