// ═══════════════════════════════════════════════════════════════
// TAB 1: CONTEXT
// Customer website, issue description, screenshots
// AI Triage Report, AI Repair Log, AI Validation Results
// Escalation reason (why AI failed / confidence <90%)
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Globe, AlertTriangle, Bot, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronRight, Shield, FileText, Activity,
  Zap, Eye, Camera, ArrowRight
} from 'lucide-react';

interface ContextPanelProps {
  incidentId: string;
  websiteUrl: string;
  customerEmail?: string;
}

interface AIReportSection {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
  content: string[];
  details?: string;
}

const AI_REPORTS: AIReportSection[] = [
  {
    title: 'AI TRIAGE REPORT',
    icon: Activity,
    iconColor: 'text-cyan',
    status: 'success',
    timestamp: '14:30:00 UTC',
    content: [
      'Incident classified: P1_CRITICAL — Database connection pool exhaustion',
      'Affected service: PostgreSQL on acme-corp.com',
      'Root cause hypothesis: max_connections limit reached, no connection timeout configured',
      'No backup detected for current DB state',
      'Estimated repair time: 8-15 minutes',
    ],
    details: 'Triage agent analyzed error logs, nginx access patterns, and database metrics. Determined this is a recurring issue (3rd occurrence this week).',
  },
  {
    title: 'AI REPAIR LOG',
    icon: Zap,
    iconColor: 'text-lime',
    status: 'warning',
    timestamp: '14:35:00 UTC',
    content: [
      'Spawned isolated VM: sandbox-7f3a9e2d',
      'Cloned repository: acme-corp/api@main',
      'Located configuration file: config/database.js',
      'Attempted fix: Added pool configuration (max: 20, idleTimeoutMillis: 30000)',
      'Attempted fix: Added connection timeout (connectTimeoutMillis: 5000)',
      '⚠️ REPAIR PARTIAL: Fix applied but could not verify in production-like environment',
    ],
    details: 'Repair agent successfully modified configuration files but validation testing failed due to missing test database snapshot. Confidence: 72%.',
  },
  {
    title: 'AI VALIDATION RESULTS',
    icon: Shield,
    iconColor: 'text-purple-400',
    status: 'error',
    timestamp: '14:42:00 UTC',
    content: [
      'Test suite: db-connection-stress (Level 2)',
      'Result: 3/5 tests passed (60%)',
      'Connection pool: ✓ PASS (handles 100 concurrent)',
      'Timeout behavior: ✓ PASS (drops stale connections)',
      'Error recovery: ✗ FAIL (does not retry on transient failure)',
      'Memory leak: ✗ FAIL (RSS grows 12MB over 5min)',
      'Failover: ✗ FAIL (no secondary pool configured)',
    ],
    details: 'Validation agent ran 5 integration tests. 3 passed, 2 failed. Memory leak detected in connection retry loop. Requires human engineering review.',
  },
];

const SCREENSHOTS = [
  { id: 'ss-1', label: 'Error Screenshot', desc: 'Customer-facing 500 error page at 14:28 UTC' },
  { id: 'ss-2', label: 'Monitoring Alert', desc: 'Datadog alert: DB pool exhaustion >95%' },
  { id: 'ss-3', label: 'Log Excerpt', desc: 'PostgreSQL logs showing connection failures' },
];

export function ContextPanel({ incidentId, websiteUrl, customerEmail }: ContextPanelProps) {
  const [expandedReport, setExpandedReport] = useState<string | null>('AI TRIAGE REPORT');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* ── Customer & Issue Header ── */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan" />
              <a href={`https://${websiteUrl}`} target="_blank" rel="noopener noreferrer"
                className="text-sm font-mono text-cyan hover:underline">
                {websiteUrl}
              </a>
              <span className="px-1.5 py-0.5 text-[9px] bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase">
                LIVE
              </span>
            </div>
            <p className="text-xs text-white/40">{customerEmail || 'ops@acme-corp.com'}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30 uppercase tracking-wider">Incident</div>
            <div className="text-sm font-mono font-bold text-lime">{incidentId}</div>
          </div>
        </div>

        {/* Issue Description */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Issue Description</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            Database connection pool exhaustion causing 500 errors on all API endpoints.
            PostgreSQL rejecting connections with "too many clients already." Started at 14:28 UTC.
            Affects checkout flow, user authentication, and order processing. No fallback database configured.
          </p>
        </div>
      </div>

      {/* ── Screenshots ── */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Screenshots & Evidence</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SCREENSHOTS.map((ss) => (
            <button
              key={ss.id}
              onClick={() => setSelectedScreenshot(selectedScreenshot === ss.id ? null : ss.id)}
              className={`relative aspect-video bg-black border transition-colors group ${
                selectedScreenshot === ss.id
                  ? 'border-lime/50'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/80 border-t border-white/10">
                <p className="text-[9px] font-bold text-white/60 truncate">{ss.label}</p>
              </div>
              {selectedScreenshot === ss.id && (
                <div className="absolute inset-0 bg-lime/5 border border-lime/30 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-6 h-6 text-lime mx-auto mb-1" />
                    <p className="text-[9px] text-lime font-bold">VIEWING</p>
                    <p className="text-[8px] text-white/40 mt-1 max-w-[120px]">{ss.desc}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Reports (Collapsible) ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Bot className="w-3.5 h-3.5 text-lime" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">AI Pipeline Reports</span>
          <span className="text-[9px] text-white/30 ml-auto font-mono">Read-only</span>
        </div>

        {AI_REPORTS.map((report) => {
          const isExpanded = expandedReport === report.title;
          const StatusIcon = report.status === 'success' ? CheckCircle
            : report.status === 'warning' ? AlertTriangle
            : report.status === 'error' ? XCircle
            : Clock;
          const statusColor = report.status === 'success' ? 'text-green-400'
            : report.status === 'warning' ? 'text-yellow-400'
            : report.status === 'error' ? 'text-red-400'
            : 'text-cyan';

          return (
            <div key={report.title} className="bg-surface border border-white/5 overflow-hidden">
              <button
                onClick={() => setExpandedReport(isExpanded ? null : report.title)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                )}
                <report.icon className={`w-4 h-4 ${report.iconColor}`} />
                <span className="text-xs font-bold uppercase tracking-wider flex-1 text-left">
                  {report.title}
                </span>
                <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                <span className={`text-[10px] font-mono ${statusColor}`}>
                  {report.status.toUpperCase()}
                </span>
                <span className="text-[10px] text-white/30 font-mono ml-2">{report.timestamp}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-white/5 px-3 pb-3">
                  <ul className="space-y-1.5 mt-3">
                    {report.content.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                        <ArrowRight className="w-3 h-3 text-white/20 mt-0.5 shrink-0" />
                        <span className={line.startsWith('⚠') ? 'text-yellow-400' : ''}>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {report.details && (
                    <div className="mt-3 p-2.5 bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-white/40 leading-relaxed">{report.details}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Escalation Reason ── */}
      <div className="bg-red-500/[0.03] border border-red-500/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">Escalation Reason</span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          AI pipeline achieved 72% confidence — below the 90% auto-deploy threshold.
          Validation failed on 2/5 integration tests (memory leak + failover).
          Repair was partial: config changes applied but could not be fully verified.
          Human engineer required for: (1) memory leak root cause analysis,
          (2) failover configuration, (3) production deployment approval.
        </p>
        <div className="mt-2 flex items-center gap-4 text-[10px] text-white/30 font-mono">
          <span>AI Confidence: <span className="text-yellow-400">72%</span></span>
          <span>Tests: <span className="text-red-400">3/5</span></span>
          <span>Threshold: <span className="text-green-400">90%</span></span>
        </div>
      </div>
    </div>
  );
}
