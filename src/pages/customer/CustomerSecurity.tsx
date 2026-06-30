// ═══════════════════════════════════════════════════════════════
// CUSTOMER SECURITY v2.5 — Security Posture Panel
// Vulnerability breakdown, 30-day score trend, downloadable reports
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Bug,
  FileCode,
  Database,
  Lock,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Server,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const VULN_CATEGORIES = [
  { name: 'Code Quality', icon: FileCode, count: 12, severity: 'medium', score: 78, color: '#fbbf24', issues: ['Deprecated API usage in 4 files', 'Missing error handling in auth module', 'TypeScript strict mode violations: 8'] },
  { name: 'SQL Injection', icon: Database, count: 0, severity: 'low', score: 100, color: '#a3e635', issues: ['No SQL injection vectors detected'] },
  { name: 'Dependency Health', icon: Server, count: 3, severity: 'high', score: 65, color: '#fb923c', issues: ['lodash < 4.17.21 CVE-2021-23337', 'axios < 1.6.0 CVE-2023-45857', 'express < 4.19.0 CVE-2024-29041'] },
  { name: 'Secret Exposure', icon: Lock, count: 1, severity: 'critical', score: 45, color: '#f43f5e', issues: ['Hardcoded API key detected in config.dev.ts'] },
  { name: 'Malware/Backdoors', icon: ShieldAlert, count: 0, severity: 'low', score: 100, color: '#a3e635', issues: ['No malware signatures detected across 42 scanners'] },
];

const SCORE_HISTORY = [72, 68, 71, 75, 73, 78, 80, 79, 82, 85, 83, 87, 88, 87, 89, 91, 90, 92, 94, 93, 95, 94, 96, 95, 97, 96, 98, 97, 99, 98];

export function CustomerSecurity() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState('monthly');
  const overallScore = Math.round(SCORE_HISTORY[SCORE_HISTORY.length - 1]);

  const handleDownloadReport = () => {
    const csv = `Security Posture Report\nGenerated,${new Date().toISOString()}\nOverall Score,${overallScore}\n\nCategory,Score,Issues\n${VULN_CATEGORIES.map(c => `${c.name},${c.score},${c.count}`).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `security-posture-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Security posture report downloaded');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-lime" /> Security Posture
        </h1>
        <button onClick={handleDownloadReport} className="flex items-center gap-1.5 px-3 py-2 bg-lime/10 text-lime rounded-lg text-[11px] font-bold hover:bg-lime/20 transition-all">
          <Download className="w-3.5 h-3.5" /> Export Report
        </button>
      </div>

      {/* Overall Score */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={overallScore >= 90 ? '#a3e635' : overallScore >= 70 ? '#fbbf24' : '#f43f5e'} strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={(2 * Math.PI * 42) - (overallScore / 100) * (2 * Math.PI * 42)} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${overallScore >= 90 ? '#a3e635' : overallScore >= 70 ? '#fbbf24' : '#f43f5e'}40)` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black" style={{ color: overallScore >= 90 ? '#a3e635' : overallScore >= 70 ? '#fbbf24' : '#f43f5e' }}>{overallScore}</span>
              <span className="text-[8px] text-white/30 uppercase">Score</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-white mb-1">Overall Security Score: {overallScore}/100</h2>
            <p className="text-xs text-white/40 mb-2">
              {overallScore >= 90 ? 'Excellent posture. All critical vectors secured.' :
               overallScore >= 70 ? 'Good posture with minor improvements needed.' :
               'Critical issues detected. Immediate attention required.'}
            </p>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1 text-white/30"><CheckCircle2 className="w-3 h-3 text-lime" /> 2 Categories Clean</span>
              <span className="flex items-center gap-1 text-white/30"><AlertTriangle className="w-3 h-3 text-amber" /> 3 Categories Need Attention</span>
              <span className="flex items-center gap-1 text-white/30"><ShieldAlert className="w-3 h-3 text-rose" /> 1 Critical Finding</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vulnerability Categories */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
            <Bug className="w-3.5 h-3.5 text-rose" /> Vulnerability Categories
          </h3>
          {VULN_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isExpanded = expanded === cat.name;
            return (
              <div key={cat.name} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div onClick={() => setExpanded(isExpanded ? null : cat.name)} className="p-4 cursor-pointer hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/70">{cat.name}</p>
                        <p className="text-[10px] text-white/30">{cat.count} {cat.count === 1 ? 'issue' : 'issues'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${cat.score}%`, backgroundColor: cat.color }} />
                      </div>
                      <span className="text-sm font-black" style={{ color: cat.color }}>{cat.score}</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-white/20 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <div className="space-y-1.5">
                      {cat.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-white/40">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: cat.color }} />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 30-Day Score Trend */}
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan" /> 30-Day Score Trend
            </h3>
            <div className="h-40 flex items-end gap-0.5">
              {SCORE_HISTORY.map((score, i) => {
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="absolute bottom-full mb-1 text-[8px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 px-1 rounded">{score}</div>
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${score}%`,
                        backgroundColor: score >= 90 ? '#a3e635' : score >= 70 ? '#fbbf24' : '#f43f5e',
                        opacity: 0.4 + (i / SCORE_HISTORY.length) * 0.6,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[8px] text-white/20 mt-2">
              <span>30 days ago</span>
              <span className="flex items-center gap-1 text-lime"><TrendingUp className="w-2.5 h-2.5" /> +{SCORE_HISTORY[SCORE_HISTORY.length - 1] - SCORE_HISTORY[0]} pts</span>
              <span>Today</span>
            </div>
          </div>

          {/* Report Generator */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-magenta" style={{ color: '#e879f9' }} /> Compliance Reports
            </h3>
            <div className="space-y-2">
              {[
                { id: 'monthly', label: 'Monthly Security Posture', desc: 'Full vulnerability assessment + trend analysis', date: '2024-07-01' },
                { id: 'quarterly', label: 'Quarterly Compliance Pack', desc: 'SOC 2 / ISO 27001 aligned audit documents', date: '2024-06-30' },
                { id: 'incident', label: 'Incident Resolution Audit', desc: 'Forensic trail for INC-2024-001847', date: '2024-07-01' },
              ].map(r => (
                <div key={r.id} onClick={() => setSelectedReport(r.id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedReport === r.id ? 'border-lime/30 bg-lime/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div>
                    <p className="text-xs font-bold text-white/70">{r.label}</p>
                    <p className="text-[10px] text-white/30">{r.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/20">{r.date}</span>
                    <button onClick={handleDownloadReport} className="p-1.5 bg-lime/10 text-lime rounded hover:bg-lime/20 transition-all">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
