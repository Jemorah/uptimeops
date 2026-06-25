// ═══════════════════════════════════════════════════════════════
// AUDIT REPORT — Stage 10: Full compliance audit trail
// ═══════════════════════════════════════════════════════════════

import { FileText, CheckCircle, XCircle, Shield, Server, Lock, Clock, Download, User, Bot } from 'lucide-react';
import type { AuditReport } from './types';

interface AuditReportProps {
  report: AuditReport | null;
}

export function AuditReportPanel({ report }: AuditReportProps) {
  if (!report) {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Audit Report</h3>
        </div>
        <p className="text-xs text-white/40">Audit report will be generated after customer verification</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Audit Report
          </h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 text-xs hover:border-white/20 transition-colors">
            <Download className="w-3 h-3" />
            EXPORT
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-white/5 grid grid-cols-2 gap-4">
        <div className="bg-black/20 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Duration</div>
          <div className="text-lg font-black font-mono text-white">{report.totalDuration}</div>
        </div>
        <div className="bg-black/20 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Cost</div>
          <div className="text-lg font-black font-mono text-lime">${report.totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-black/20 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Files Modified</div>
          <div className="text-lg font-black font-mono text-cyan">{report.filesModified}</div>
        </div>
        <div className="bg-black/20 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Tests</div>
          <div className="text-lg font-black font-mono text-green-400">
            {report.testsPassed}/{report.testsPassed + report.testsFailed}
          </div>
        </div>
      </div>

      {/* Root Cause & Fix */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Root Cause</span>
          </div>
          <p className="text-xs text-white/60">{report.rootCause}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3 h-3 text-lime" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Fix Applied</span>
          </div>
          <p className="text-xs text-white/60">{report.fixDescription}</p>
        </div>
      </div>

      {/* Agents Involved */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-3 h-3 text-lime" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Agents Involved</span>
        </div>
        <div className="flex gap-2">
          {report.agentsInvolved.map(agent => (
            <span key={agent} className="text-[10px] font-mono font-bold text-lime bg-lime/10 border border-lime/20 px-2 py-1">
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* Compliance Certificate */}
      {report.complianceCertificateId && (
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Compliance Certificate</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="font-mono">ID: {report.complianceCertificateId}</span>
          </div>
        </div>
      )}

      {/* Cleanup Status */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-3 h-3 text-cyan" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Cleanup</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            {report.vmDestroyedAt ? <CheckCircle className="w-3 h-3 text-lime" /> : <XCircle className="w-3 h-3 text-white/20" />}
            <span className={report.vmDestroyedAt ? 'text-white/60' : 'text-white/20'}>VM destroyed</span>
            {report.vmDestroyedAt && <span className="text-[10px] text-white/20 font-mono ml-auto">{new Date(report.vmDestroyedAt).toLocaleTimeString()}</span>}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {report.credentialsPurgedAt ? <CheckCircle className="w-3 h-3 text-lime" /> : <XCircle className="w-3 h-3 text-white/20" />}
            <span className={report.credentialsPurgedAt ? 'text-white/60' : 'text-white/20'}>Credentials purged</span>
            {report.credentialsPurgedAt && <span className="text-[10px] text-white/20 font-mono ml-auto">{new Date(report.credentialsPurgedAt).toLocaleTimeString()}</span>}
          </div>
        </div>
      </div>

      {/* Access Log */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-3 h-3 text-white/30" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Access Log</span>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {report.accessLog.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-xs p-1.5 hover:bg-white/[0.02]">
              <Clock className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
              <span className="text-[10px] text-white/20 font-mono w-12 flex-shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </span>
              {entry.actor.startsWith('AI') ? <Bot className="w-3 h-3 text-lime flex-shrink-0" /> : <User className="w-3 h-3 text-cyan flex-shrink-0" />}
              <span className="text-white/30 w-20 truncate flex-shrink-0">{entry.actor}</span>
              <span className="text-white/50 flex-1">{entry.action}</span>
              <span className="text-white/20 font-mono text-[10px]">{entry.resource}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
