import { AGENT_ORDER, AGENT_CONFIGS } from './types';
import type { PipelineIncident } from './types';
import {
  Brain, Server, Wrench, CheckCircle, Rocket, FileText,
  ChevronRight, Loader2, AlertTriangle, PauseCircle
} from 'lucide-react';

const AGENT_ICONS = {
  TRIAGE: Brain,
  ISOLATE: Server,
  REPAIR: Wrench,
  VALIDATE: CheckCircle,
  DEPLOY: Rocket,
  AUDIT: FileText,
};

interface AgentPipelineProps {
  incident: PipelineIncident;
  onSelectAgent: (agent: string) => void;
  selectedAgent: string | null;
}

export function AgentPipeline({ incident, onSelectAgent, selectedAgent }: AgentPipelineProps) {
  return (
    <div className="bg-surface border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          AI Agent Pipeline
        </h3>
        <span className="text-xs font-mono text-white/40">{incident.id}</span>
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-6 left-0 right-0 h-px bg-white/5" />

        {/* Agents */}
        <div className="grid grid-cols-6 gap-2 relative">
          {AGENT_ORDER.map((name, index) => {
            const agent = incident.agents[name];
            const config = AGENT_CONFIGS[name];
            const Icon = AGENT_ICONS[name];
            const isActive = agent.status === 'running';
            const isCompleted = agent.status === 'completed';
            const isFailed = agent.status === 'failed' || agent.status === 'timeout' || agent.status === 'escalated';
            const isPaused = agent.status === 'paused';
            const isSelected = selectedAgent === name;

            return (
              <button
                key={name}
                onClick={() => onSelectAgent(name)}
                className={`relative flex flex-col items-center gap-2 p-2 rounded-sm transition-all cursor-pointer group ${
                  isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Status dot */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'animate-pulse'
                      : isFailed
                      ? ''
                      : isPaused
                      ? ''
                      : isCompleted
                      ? ''
                      : ''
                  }`}
                  style={{
                    borderColor: isFailed
                      ? '#ef4444'
                      : isPaused
                      ? '#eab308'
                      : isActive || isCompleted
                      ? config.color
                      : 'rgba(255,255,255,0.1)',
                    backgroundColor: isFailed
                      ? 'rgba(239,68,68,0.1)'
                      : isPaused
                      ? 'rgba(234,179,8,0.1)'
                      : isActive || isCompleted
                      ? config.bgColor
                      : 'transparent',
                    boxShadow: isActive ? config.glowColor : 'none',
                  }}
                >
                  {isActive && (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: config.color }} />
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-5 h-5" style={{ color: config.color }} />
                  )}
                  {isFailed && (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  {isPaused && (
                    <PauseCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  {!isActive && !isCompleted && !isFailed && !isPaused && (
                    <Icon className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
                  )}

                  {/* Number badge */}
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{
                      backgroundColor: config.color,
                      color: '#050507',
                    }}
                  >
                    {config.number}
                  </span>
                </div>

                {/* Agent name */}
                <span
                  className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive || isCompleted
                      ? ''
                      : isFailed
                      ? 'text-red-500'
                      : isPaused
                      ? 'text-yellow-500'
                      : 'text-white/30'
                  }`}
                  style={isActive || isCompleted ? { color: config.color } : {}}
                >
                  {name}
                </span>

                {/* Progress bar */}
                {(isActive || isCompleted) && (
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${agent.progress}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                )}

                {/* Status label */}
                <span className={`text-xs ${isFailed ? 'text-red-400' : isPaused ? 'text-yellow-400' : 'text-white/30'}`}>
                  {isActive && `${Math.round(agent.progress)}%`}
                  {isCompleted && 'Done'}
                  {isFailed && 'Failed'}
                  {isPaused && 'Paused'}
                  {agent.status === 'queued' && 'Waiting'}
                </span>

                {/* Arrow connector */}
                {index < AGENT_ORDER.length - 1 && (
                  <ChevronRight className="absolute -right-1 top-5 w-3 h-3 text-white/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
        {[
          { label: 'Running', color: '#d1ff00', shape: 'pulse' },
          { label: 'Completed', color: '#22c55e', shape: 'dot' },
          { label: 'Failed', color: '#ef4444', shape: 'dot' },
          { label: 'Paused', color: '#eab308', shape: 'dot' },
          { label: 'Waiting', color: 'rgba(255,255,255,0.2)', shape: 'dot' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${item.shape === 'pulse' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-white/30">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
