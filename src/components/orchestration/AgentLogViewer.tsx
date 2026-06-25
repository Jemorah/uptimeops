import { useState } from 'react';
import {
  Brain, Server, Wrench, CheckCircle, Rocket, FileText,
  Info, AlertTriangle, XCircle, CheckCircle2, ChevronDown, ChevronRight,
  Terminal
} from 'lucide-react';
import type { AgentState, AgentName } from './types';
import { AGENT_CONFIGS } from './types';

const AGENT_ICONS: Record<AgentName, typeof Brain> = {
  TRIAGE: Brain,
  ISOLATE: Server,
  REPAIR: Wrench,
  VALIDATE: CheckCircle,
  DEPLOY: Rocket,
  AUDIT: FileText,
};

const LEVEL_ICONS = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
  system: Terminal,
};

const LEVEL_COLORS = {
  info: 'text-cyan',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500',
  system: 'text-white/50',
};

interface AgentLogViewerProps {
  agents: Record<AgentName, AgentState>;
  selectedAgent: AgentName | null;
}

export function AgentLogViewer({ agents, selectedAgent }: AgentLogViewerProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<AgentName>>(
    selectedAgent ? new Set([selectedAgent]) : new Set()
  );
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleAgent = (name: AgentName) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleLog = (index: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // If a specific agent is selected, show only that one
  const agentNames = (selectedAgent ? [selectedAgent] : Object.keys(agents) as AgentName[]);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-lime" />
          Agent Logs
        </h3>
        <span className="text-xs text-white/40 font-mono">
          {Object.values(agents).reduce((sum, a) => sum + a.logs.length, 0)} entries
        </span>
      </div>

      <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
        {agentNames.map(name => {
          const agent = agents[name];
          const config = AGENT_CONFIGS[name];
          const Icon = AGENT_ICONS[name];
          const isExpanded = expandedAgents.has(name);
          const logCount = agent.logs.length;

          return (
            <div key={name}>
              {/* Agent Header */}
              <button
                onClick={() => toggleAgent(name)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
                <span className="text-sm font-bold" style={{ color: config.color }}>
                  {name}
                </span>
                <span className="text-xs text-white/40 font-mono">{config.model}</span>
                {logCount > 0 && (
                  <span className="text-xs text-white/30 ml-auto">{logCount} entries</span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                )}
              </button>

              {/* Log Entries */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-0.5">
                  {agent.logs.length === 0 ? (
                    <p className="text-xs text-white/20 py-2 pl-7">No logs yet</p>
                  ) : (
                    agent.logs.map((log, i) => {
                      const globalIndex = agent.logs.length * Object.keys(agents).indexOf(name) + i;
                      const LevelIcon = LEVEL_ICONS[log.level];
                      const isLogExpanded = expandedLogs.has(globalIndex);
                      const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <div key={i} className="pl-7">
                          <button
                            onClick={() => toggleLog(globalIndex)}
                            className="w-full flex items-start gap-2 py-1 hover:bg-white/[0.02] transition-colors text-left group"
                          >
                            <LevelIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${LEVEL_COLORS[log.level]}`} />
                            <span className="text-xs text-white/30 font-mono flex-shrink-0">{time}</span>
                            <span className={`text-xs ${LEVEL_COLORS[log.level]} flex-1`}>
                              {log.message}
                            </span>
                            {log.detail && (
                              <ChevronRight
                                className={`w-3 h-3 text-white/20 flex-shrink-0 transition-transform ${
                                  isLogExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            )}
                          </button>
                          {isLogExpanded && log.detail && (
                            <div className="pl-8 py-1 text-xs text-white/40 font-mono bg-white/[0.02] rounded-sm">
                              {log.detail}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
