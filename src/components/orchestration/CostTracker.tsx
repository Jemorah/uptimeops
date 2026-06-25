import { DollarSign, TrendingUp } from 'lucide-react';
import type { PipelineIncident } from './types';
import { AGENT_CONFIGS, AGENT_ORDER } from './types';

interface CostTrackerProps {
  incident: PipelineIncident;
}

export function CostTracker({ incident }: CostTrackerProps) {
  const maxCost = Math.max(...AGENT_ORDER.map(name => incident.agents[name].cost), 0.01);

  return (
    <div className="bg-surface border border-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-lime" />
          Cost Breakdown
        </h3>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-white/30" />
          <span className="text-sm font-black font-mono text-lime">
            ${incident.totalCost.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {AGENT_ORDER.map(name => {
          const agent = incident.agents[name];
          const config = AGENT_CONFIGS[name];
          const barWidth = maxCost > 0 ? (agent.cost / maxCost) * 100 : 0;
          const isRunning = agent.status === 'running';

          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: config.color }}>
                    {name}
                  </span>
                  {isRunning && (
                    <span className="text-xs text-white/30 animate-pulse">running</span>
                  )}
                </div>
                <span className="text-xs font-mono text-white/60">
                  ${agent.cost.toFixed(3)}
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: config.color,
                    opacity: agent.cost > 0 ? 1 : 0.3,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-white/20">
                  ${config.costPerMinute}/min
                </span>
                <span className="text-xs text-white/20">
                  {Math.floor(agent.elapsedSeconds / 60)}m {agent.elapsedSeconds % 60}s
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white/40">
          Total Incident Cost
        </span>
        <span className="text-lg font-black font-mono text-lime">
          ${incident.totalCost.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
