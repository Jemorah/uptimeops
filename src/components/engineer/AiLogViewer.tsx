// ═══════════════════════════════════════════════════════════════
// AI LOG VIEWER
// Read-only view of what the AI system attempted before escalation
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Activity, Filter, ChevronDown, ChevronRight, Clock, Bot, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'system';

interface AiLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  level: LogLevel;
  message: string;
  details?: string;
}

const MOCK_AI_LOGS: AiLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '14:30:00',
    agent: 'TRIAGE',
    level: 'system',
    message: 'Pipeline initiated for incident INC-8492',
    details: 'Severity: P1_CRITICAL | Website: acme-corp.com | Category: database',
  },
  {
    id: 'log-2',
    timestamp: '14:30:02',
    agent: 'TRIAGE',
    level: 'info',
    message: 'Analyzed error pattern: PostgreSQL connection pool exhaustion',
    details: 'Detected 100/100 active connections, 0 idle. Query queue: 23 pending.',
  },
  {
    id: 'log-3',
    timestamp: '14:30:05',
    agent: 'TRIAGE',
    level: 'info',
    message: 'Confidence assessment: 72% — below 90% threshold',
    details: 'Primary uncertainty: Root cause of connection leak unclear. Could be app-level or connection string misconfiguration.',
  },
  {
    id: 'log-4',
    timestamp: '14:30:08',
    agent: 'ISOLATE',
    level: 'system',
    message: 'Isolation VM provisioned: sandbox-7f3a9e2d',
    details: 'Clone of production environment created. Credentials decrypted from vault. Database connection string validated.',
  },
  {
    id: 'log-5',
    timestamp: '14:30:15',
    agent: 'ISOLATE',
    level: 'info',
    message: 'Health check on isolated environment: PASS',
    details: 'All services running. Connection pool at 2/100 (baseline). Ready for repair attempts.',
  },
  {
    id: 'log-6',
    timestamp: '14:30:30',
    agent: 'REPAIR',
    level: 'info',
    message: 'Attempt 1: Increase pool max from 100 to 200',
    details: 'Modified pool.js: max: 200. Restarted Node.js process. Pool size increased but exhaustion reoccurred in 28s.',
  },
  {
    id: 'log-7',
    timestamp: '14:31:00',
    agent: 'REPAIR',
    level: 'warn',
    message: 'Attempt 1 FAILED — pool still exhausting',
    details: 'Root cause not addressed. Connection leak persists. Increasing pool size only delays failure.',
  },
  {
    id: 'log-8',
    timestamp: '14:31:15',
    agent: 'REPAIR',
    level: 'info',
    message: 'Attempt 2: Restart connection pool with idle timeout',
    details: 'Added idleTimeoutMillis: 30000. Pool recycles idle connections. Active connections dropping but still climbing.',
  },
  {
    id: 'log-9',
    timestamp: '14:31:45',
    agent: 'REPAIR',
    level: 'warn',
    message: 'Attempt 2 PARTIAL — improvement but not resolved',
    details: 'Connection exhaustion rate reduced by 40% but still occurring. Leak source not identified.',
  },
  {
    id: 'log-10',
    timestamp: '14:32:00',
    agent: 'REPAIR',
    level: 'error',
    message: 'Repair confidence dropped to 45%',
    details: 'Two repair attempts made. Cannot identify connection leak source without application code review.',
  },
  {
    id: 'log-11',
    timestamp: '14:32:05',
    agent: 'VALIDATE',
    level: 'system',
    message: 'Validation started for attempted fixes',
    details: 'Running smoke test suite: test-db-connect, test-api-health, test-checkout-flow',
  },
  {
    id: 'log-12',
    timestamp: '14:32:10',
    agent: 'VALIDATE',
    level: 'error',
    message: 'Smoke test FAILED: test-db-connect timeout',
    details: 'Connection pool still exhausting. Database queries timing out. First smoke test failure.',
  },
  {
    id: 'log-13',
    timestamp: '14:32:12',
    agent: 'SYSTEM',
    level: 'error',
    message: 'ESCALATION TRIGGERED: low_confidence + smoke_test_failure',
    details: 'AI confidence 45% (below 90%). Smoke test failed. Auto-escalating to human engineer.',
  },
  {
    id: 'log-14',
    timestamp: '14:32:15',
    agent: 'SYSTEM',
    level: 'system',
    message: 'Assigned to engineer queue. Specialty: Database.',
    details: 'Awaiting engineer acceptance. VM session preserved. All logs captured for handoff.',
  },
];

interface AiLogViewerProps {
  incidentId: string;
}

export function AiLogViewer({ incidentId }: AiLogViewerProps) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const filteredLogs = MOCK_AI_LOGS.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (agentFilter !== 'all' && log.agent !== agentFilter) return false;
    return true;
  });

  const agents = [...new Set(MOCK_AI_LOGS.map(l => l.agent))];

  const levelColors: Record<LogLevel, string> = {
    info: 'text-cyan',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    success: 'text-lime',
    system: 'text-white/40',
  };

  const levelIcons: Record<LogLevel, React.ReactNode> = {
    info: <Activity className="w-3 h-3" />,
    warn: <AlertTriangle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
    success: <CheckCircle className="w-3 h-3" />,
    system: <Bot className="w-3 h-3" />,
  };

  return (
    <div className="bg-surface border border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan" />
          <span className="text-xs font-bold">AI Log Viewer</span>
          <span className="text-[10px] text-white/30 font-mono">READ-ONLY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{filteredLogs.length} entries</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-black/10">
        <Filter className="w-3 h-3 text-white/30" />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
          className="bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-1 outline-none focus:border-cyan/30"
        >
          <option value="all">All Levels</option>
          <option value="system">System</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-1 outline-none focus:border-cyan/30"
        >
          <option value="all">All Agents</option>
          {agents.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px]">
        <div className="divide-y divide-white/5">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLog === log.id;
            return (
              <div
                key={log.id}
                className={`transition-colors ${log.level === 'error' ? 'bg-red-500/[0.02]' : ''}`}
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`flex-shrink-0 mt-0.5 ${levelColors[log.level]}`}>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                  <div className={`flex-shrink-0 ${levelColors[log.level]}`}>
                    {levelIcons[log.level]}
                  </div>
                  <div className="flex-shrink-0 text-white/20 font-mono text-[10px] pt-0.5 w-16">
                    {log.timestamp}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold text-white/30 bg-white/5 px-1.5 py-0.5">
                      {log.agent}
                    </span>
                  </div>
                  <div className={`flex-1 text-xs ${levelColors[log.level]} min-w-0`}>
                    <span className="truncate block">{log.message}</span>
                  </div>
                </button>

                {isExpanded && log.details && (
                  <div className="px-3 pb-3 pl-16">
                    <div className="bg-black/30 border border-white/5 p-3 text-xs text-white/50 font-mono leading-relaxed">
                      {log.details}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/5 bg-black/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Clock className="w-3 h-3" />
          <span>Pipeline duration: 2m 15s</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Bot className="w-3 h-3" />
          <span className="font-mono">{incidentId}</span>
        </div>
      </div>
    </div>
  );
}
