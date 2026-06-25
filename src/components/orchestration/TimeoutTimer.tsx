import { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import type { AgentState, AgentName } from './types';
import { AGENT_CONFIGS } from './types';

interface TimeoutTimerProps {
  agents: Record<AgentName, AgentState>;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TimeoutTimer({ agents }: TimeoutTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const agentList = Object.values(agents).filter(a => a.status === 'running');

  if (agentList.length === 0) return null;

  return (
    <div className="bg-surface border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-lime" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
          Active Timeouts
        </h3>
      </div>

      {agentList.map(agent => {
        const config = AGENT_CONFIGS[agent.name];
        const remaining = Math.max(0, agent.timeoutSeconds - agent.elapsedSeconds);
        const percentUsed = (agent.elapsedSeconds / agent.timeoutSeconds) * 100;
        const isUrgent = percentUsed > 80;
        const isCritical = percentUsed > 95;

        return (
          <div key={agent.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: config.color }}>
                  {agent.name}
                </span>
                <span className="text-xs text-white/30 font-mono">
                  {formatTime(agent.elapsedSeconds)} / {formatTime(agent.timeoutSeconds)}
                </span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-mono ${
                isCritical ? 'text-red-500 animate-pulse' : isUrgent ? 'text-yellow-500' : 'text-white/40'
              }`}>
                {isUrgent && <AlertTriangle className="w-3 h-3" />}
                {formatTime(remaining)} remaining
              </div>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, percentUsed)}%`,
                  backgroundColor: isCritical ? '#ef4444' : isUrgent ? '#eab308' : config.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
