// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER SECURITY v2.5 — Security Posture Panel
// Overall score, vulnerability breakdown, 30-day trend, scan findings
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ShieldAlert,
  Bug,
  FileCode,
  Database,
  Lock,
  TrendingUp,
  Download,
  AlertTriangle,
  Activity
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Code Quality', icon: FileCode, count: 12, score: 78, color: '#fbbf24', issues: ['Deprecated API in 4 files', 'Missing error handling: auth module', 'TS strict mode violations: 8'] },
  { name: 'SQL Injection', icon: Database, count: 0, score: 100, color: '#a3e635', issues: ['No SQLi vectors detected'] },
  { name: 'Dependencies', icon: Lock, count: 3, score: 65, color: '#fb923c', issues: ['lodash CVE-2021-23337', 'axios CVE-2023-45857', 'express CVE-2024-29041'] },
  { name: 'Secret Exposure', icon: ShieldAlert, count: 1, score: 45, color: '#f43f5e', issues: ['Hardcoded API key: config.dev.ts'] },
  { name: 'Malware Scan', icon: Bug, count: 0, score: 100, color: '#a3e635', issues: ['Clean across 42 scanners'] },
];

const SCORE_30D = [72, 68, 71, 75, 73, 78, 80, 79, 82, 85, 83, 87, 88, 87, 89, 91, 90, 92, 94, 93, 95, 94, 96, 95, 97, 96, 98, 97, 99, 98];
const FINDINGS = [
  { id: 'F-2847', scanner: 'Semgrep', severity: 'high', file: 'src/auth/login.ts', message: 'Hardcoded secret in source code', status: 'open' },
  { id: 'F-2846', scanner: 'Snyk', severity: 'medium', file: 'package.json', message: 'lodash < 4.17.21 vulnerable to prototype pollution', status: 'open' },
  { id: 'F-2845', scanner: 'Trufflehog', severity: 'critical', file: 'config.dev.ts', message: 'Stripe secret key exposed in config', status: 'open' },
  { id: 'F-2844', scanner: 'Trivy', severity: 'medium', file: 'Dockerfile', message: 'Base image has 3 CVEs', status: 'resolved' },
];

export function CustomerSecurity() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const overall = SCORE_30D[SCORE_30D.length - 1];

  const handleDownload = () => {
    const csv = `Security Posture Report\nGenerated,${new Date().toISOString()}\nOverall Score,${overall}\n\nCategory,Score,Issues\n${CATEGORIES.map(c => `${c.name},${c.score},${c.count}`).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `security-posture-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Security report downloaded');
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-lime" /> Security Posture
        </h1>
        <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 bg-lime/10 text-lime rounded-lg text-[11px] font-bold hover:bg-lime/20 transition-all">
          <Download className="w-3.5 h-3.5" /> Export Report
        </button>
      </div>

      {/* Overall Score + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Card */}
        <div className="bg-elevated/60 border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={overall >= 80 ? '#a3e635' : overall >= 60 ? '#fbbf24' : '#f43f5e'} strokeWidth="8" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={(2 * Math.PI * 42) - (overall / 100) * (2 * Math.PI * 42)} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${overall >= 80 ? '#a3e635' : overall >= 60 ? '#fbbf24' : '#f43f5e'}40)` }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: overall >= 80 ? '#a3e635' : overall >= 60 ? '#fbbf24' : '#f43f5e' }}>{overall}</span>
                <span className="text-[8px] text-white/25 uppercase">Score</span>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black text-white mb-1">Overall: {overall}/100</h2>
              <p className="text-xs text-white/40 mb-2">{overall >= 80 ? 'Excellent posture. All critical vectors secured.' : overall >= 60 ? 'Good posture with minor improvements needed.' : 'Critical issues detected. Immediate attention required.'}</p>
              {overall < 70 && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold ${overall < 50 ? 'bg-magenta/10 text-magenta' : 'bg-amber/10 text-amber'}`}>
                  <AlertTriangle className="w-3 h-3" /> {overall < 50 ? 'Critical issues detected' : 'Improvements recommended'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 30-Day Trend */}
        <div className="bg-elevated/60 border border-white/5 rounded-xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan" /> 30-Day Trend
          </h3>
          <div className="h-36 flex items-end gap-0.5">
            {SCORE_30D.map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div className="absolute bottom-full mb-1 text-[7px] text-white/40 opacity-0 group-hover:opacity-100 bg-black/70 px-1 rounded">{score}</div>
                <div className="w-full rounded-sm transition-all" style={{ height: `${score}%`, backgroundColor: score >= 80 ? '#a3e635' : score >= 60 ? '#fbbf24' : '#f43f5e', opacity: 0.3 + (i / SCORE_30D.length) * 0.7 }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[8px] text-white/20 mt-2">
            <span>30d ago</span>
            <span className="text-lime flex items-center gap-0.5"><TrendingUp className="w-2 h-2" /> +{SCORE_30D[SCORE_30D.length - 1] - SCORE_30D[0]}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Breakdown */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
            <Bug className="w-3.5 h-3.5 text-magenta" style={{ color: '#e879f9' }} /> Category Breakdown
          </h3>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isExpanded = expanded === cat.name;
            return (
              <div key={cat.name} className="bg-elevated/60 border border-white/5 rounded-xl overflow-hidden">
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
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-1.5">
                    {cat.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-white/40">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: cat.color }} />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Findings */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose" /> Recent Findings
          </h3>
          <div className="space-y-2">
            {FINDINGS.map(f => {
              const sevColor = f.severity === 'critical' ? '#f43f5e' : f.severity === 'high' ? '#fb923c' : f.severity === 'medium' ? '#fbbf24' : '#a3e635';
              return (
                <div key={f.id} className="bg-elevated/60 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-white/25">{f.id}</span>
                    <span className="text-[9px] font-mono text-cyan">{f.scanner}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ml-auto`} style={{ backgroundColor: `${sevColor}15`, color: sevColor }}>{f.severity}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-1">{f.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/20">{f.file}</span>
                    <span className={`text-[8px] font-bold uppercase ${f.status === 'resolved' ? 'text-lime' : 'text-amber'}`}>{f.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
