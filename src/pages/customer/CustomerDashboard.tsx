// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD v2.5 — Your Infrastructure Command Center
// NOT an HQ operations console. This is YOUR view:
// YOUR incidents, YOUR protection status, YOUR security posture, YOUR audit trail.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  ShieldCheck, AlertTriangle, CheckCircle2,
  Activity, TrendingUp, Lock, Zap, Clock, ChevronRight,
  Fingerprint, Radio, HardDrive, Server,
  Hash, CreditCard, Bell
} from 'lucide-react';

// ────────────────────────── MOCK DATA ──────────────────────────

const MY_INCIDENTS = [
  { id: 'INC-2024-001847', title: 'SSL Certificate Expiry on API Gateway', severity: 'critical' as const, status: 'deployed', stage: 4, agent: 'Deploy', created_at: new Date(Date.now() - 86400000).toISOString(), eta: '2h', website: 'api.uptimeops.io' },
  { id: 'INC-2024-001846', title: 'Database Connection Pool Exhaustion', severity: 'high' as const, status: 'repaired', stage: 2, agent: 'Repair', created_at: new Date(Date.now() - 172800000).toISOString(), eta: '4h', website: 'db-primary.uptimeops.io' },
  { id: 'INC-2024-001845', title: 'Edge Function Cold Start Degradation', severity: 'medium' as const, status: 'triaged', stage: 0, agent: 'Triage', created_at: new Date(Date.now() - 259200000).toISOString(), eta: '8h', website: 'edge.uptimeops.io' },
  { id: 'INC-2024-001844', title: 'DNS Propagation Delay on Secondary NS', severity: 'high' as const, status: 'validated', stage: 3, agent: 'Validate', created_at: new Date(Date.now() - 345600000).toISOString(), eta: '1h', website: 'uptimeops.io' },
  { id: 'INC-2024-001843', title: 'Storage Bucket Permission Misconfiguration', severity: 'low' as const, status: 'resolved', stage: 5, agent: 'Audit', created_at: new Date(Date.now() - 432000000).toISOString(), eta: 'Complete', website: 'assets.uptimeops.io' },
];

const MY_AUDIT_TRAIL = [
  { id: 'AUD-2847', actor: 'System', action: 'AGENT_TRIAGE_STARTED', target: 'INC-2024-001847', severity: 'info' as const, timestamp: new Date(Date.now() - 3600000).toISOString(), hash: '0x8f3a2b1c9d4e5f6789012345678901234567890abcd' },
  { id: 'AUD-2846', actor: 'AI Isolate', action: 'SANDBOX_CREATED', target: 'SBX-7f3a2b', severity: 'info' as const, timestamp: new Date(Date.now() - 7200000).toISOString(), hash: '0x7e2ba1d0c3f4e5f6789012345678901234567890fed' },
  { id: 'AUD-2845', actor: 'AI Repair', action: 'PATCH_GENERATED', target: 'PATCH-2847-a', severity: 'info' as const, timestamp: new Date(Date.now() - 10800000).toISOString(), hash: '0x6d1c903fa2b4e5f6789012345678901234567890cba' },
  { id: 'AUD-2844', actor: 'AI Validate', action: 'SCANNER_MATRIX_PASS', target: '42/42 Scanners', severity: 'info' as const, timestamp: new Date(Date.now() - 14400000).toISOString(), hash: '0x5c0d812ea3b4c5d6789012345678901234567890fed' },
  { id: 'AUD-2843', actor: 'Admin', action: 'PATCH_APPROVED', target: 'APR-2847-a', severity: 'warn' as const, timestamp: new Date(Date.now() - 18000000).toISOString(), hash: '0x4b1e715dc2a3b4c5d6789012345678901234567890abc' },
  { id: 'AUD-2842', actor: 'AI Deploy', action: 'DEPLOYMENT_SUCCESS', target: 'DEP-2847-prod', severity: 'info' as const, timestamp: new Date(Date.now() - 21600000).toISOString(), hash: '0x3a2f614cb1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7' },
  { id: 'AUD-2841', actor: 'You', action: 'APPROVAL_SUBMITTED', target: 'INC-2024-001847', severity: 'info' as const, timestamp: new Date(Date.now() - 25200000).toISOString(), hash: '0x2910573ba0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6' },
  { id: 'AUD-2840', actor: 'System', action: 'INCIDENT_RESOLVED', target: 'INC-2024-001847', severity: 'info' as const, timestamp: new Date(Date.now() - 28800000).toISOString(), hash: '0x1801462a9f0e1d2c3b4a5968778685940321346576' },
];

const AGENT_STAGES = ['Triage', 'Isolate', 'Repair', 'Validate', 'Deploy', 'Audit'];
const STAGE_COLORS = ['#22d3ee', '#e879f9', '#a3e635', '#fbbf24', '#34d399', '#a78bfa'];

const SEV = {
  critical: { color: '#f43f5e', label: 'CRITICAL', pulse: true },
  high:     { color: '#fb923c', label: 'HIGH', pulse: false },
  medium:   { color: '#fbbf24', label: 'MEDIUM', pulse: false },
  low:      { color: '#a3e635', label: 'LOW', pulse: false },
};

// ────────────────────────── SUB-COMPONENTS ──────────────────────────

function HealthScore({ score }: { score: number }) {
  const c = score >= 90 ? '#a3e635' : score >= 70 ? '#fbbf24' : '#f43f5e';
  const r = 40;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${c}50)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: c }}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-black text-white/80">Infrastructure Health</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          {score >= 90 ? 'All systems nominal' : score >= 70 ? 'Minor issues detected' : 'Critical attention needed'}
        </p>
        <div className="flex gap-3 mt-2">
          <span className="text-[9px] text-lime bg-lime/10 px-1.5 py-0.5 rounded">99.97% Uptime</span>
          <span className="text-[9px] text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">42/42 Scans</span>
        </div>
      </div>
    </div>
  );
}

function IncidentCard({ inc }: { inc: typeof MY_INCIDENTS[0] }) {
  const s = SEV[inc.severity];
  const nav = useNavigate();
  return (
    <div
      onClick={() => nav('/customer/incidents')}
      className="relative bg-white/[0.02] border border-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all group overflow-hidden"
    >
      {/* Severity accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}40` }} />

      <div className="flex items-start justify-between mb-2 pl-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/25">{inc.id}</span>
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${s.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
            {s.label}
          </span>
        </div>
        <span className="text-[9px] text-white/25">{inc.eta}</span>
      </div>

      <p className="text-xs font-bold text-white/70 mb-3 pl-2 line-clamp-1">{inc.title}</p>

      {/* 6-Agent Pipeline Strip */}
      <div className="flex items-center gap-0.5 pl-2">
        {AGENT_STAGES.map((stage, i) => {
          const done = i < inc.stage;
          const active = i === inc.stage;
          return (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full h-1 rounded-full transition-all"
                style={{
                  backgroundColor: done ? STAGE_COLORS[i] : active ? STAGE_COLORS[i] : 'rgba(255,255,255,0.05)',
                  opacity: done ? 1 : active ? 1 : 0.3,
                  boxShadow: active ? `0 0 6px ${STAGE_COLORS[i]}` : 'none',
                }}
              />
              <span className="text-[6px] uppercase tracking-wider" style={{ color: done || active ? STAGE_COLORS[i] : 'rgba(255,255,255,0.15)' }}>{stage.slice(0,3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditRow({ log }: { log: typeof MY_AUDIT_TRAIL[0] }) {
  const actorColor = log.actor.startsWith('AI') ? '#e879f9' : log.actor === 'Admin' ? '#f43f5e' : log.actor === 'You' ? '#a3e635' : '#22d3ee';
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: actorColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-bold" style={{ color: actorColor }}>{log.actor}</span>
          <span className="text-[8px] text-white/15">{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <p className="text-[10px] text-white/50">{log.action} → <span className="text-white/30 font-mono">{log.target}</span></p>
        <div className="flex items-center gap-1 mt-0.5">
          <Hash className="w-2.5 h-2.5 text-white/10" />
          <span className="text-[8px] font-mono text-white/15 truncate">{log.hash.slice(0, 18)}...</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────── MAIN EXPORT ──────────────────────────

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [healthScore] = useState(87);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }, []);

  const stats = useMemo(() => ({
    active: MY_INCIDENTS.filter(i => i.status !== 'resolved').length,
    resolved: 14,
    runs: 2847,
  }), []);

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ═══════ HEADER PROFILE CARD ═══════ */}
      <div className="relative bg-white/[0.02] border border-white/5 rounded-xl p-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">
                {greeting}, <span className="text-lime">{user?.email?.split('@')[0] || 'User'}</span>
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-lime" /> Sentinel Plan</span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan" /> Active until Aug 1, 2025</span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-cyan" /> Email alerts on</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-lime bg-lime/10 px-2.5 py-1 rounded-full border border-lime/20">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE MONITORING
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ PROTECTION STATUS RIBBON ═══════ */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-lime/5 border border-lime/15 rounded-lg">
        <ShieldCheck className="w-4 h-4 text-lime shrink-0" />
        <span className="text-xs font-bold text-lime">YOUR INFRASTRUCTURE IS PROTECTED</span>
        <span className="text-[10px] text-white/30 hidden sm:inline">— Sentinel tier with 42-scanner validation matrix and 6-agent autonomous pipeline</span>
        <button onClick={() => navigate('/customer/billing')} className="ml-auto text-[10px] text-lime underline hover:no-underline shrink-0">Manage Plan</button>
      </div>

      {/* ═══════ GLOBAL METRIC GRID ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Outages', value: stats.active, icon: AlertTriangle, color: '#f43f5e', pulse: stats.active > 0, detail: 'Unmitigated issues' },
          { label: 'Resolved This Month', value: stats.resolved, icon: CheckCircle2, color: '#a3e635', trend: '+12%', detail: 'Since Jul 1, 2025' },
          { label: 'Protection Runs', value: stats.runs.toLocaleString(), icon: Activity, color: '#22d3ee', trend: '+284', detail: 'Autonomous executions' },
          { label: 'Health Score', value: `${healthScore}`, icon: ShieldCheck, color: '#e879f9', detail: 'Combined metric', isHealth: true },
        ].map(m => (
          <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <m.icon className="w-4 h-4" style={{ color: m.color }} />
              {m.trend && <span className="text-[9px] font-bold text-lime flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />{m.trend}</span>}
            </div>
            <p className={`text-2xl font-black text-white ${m.pulse ? 'animate-pulse' : ''}`}>{m.value}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{m.label}</p>
            <p className="text-[8px] text-white/15 mt-0.5">{m.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ═══════ LEFT COLUMN: Active Operations + Audit ═══════ */}
        <div className="xl:col-span-3 space-y-5">

          {/* Active Operations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-lime" /> Your Active Operations
              </h2>
              <button onClick={() => navigate('/customer/incidents')} className="flex items-center gap-1 text-[10px] text-lime hover:text-lime/80 font-bold transition-colors">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {MY_INCIDENTS.map(inc => <IncidentCard key={inc.id} inc={inc} />)}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5 text-cyan" /> Your Audit Trail
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-1">
              {MY_AUDIT_TRAIL.map(log => <AuditRow key={log.id} log={log} />)}
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN: Health + Quick Actions ═══════ */}
        <div className="xl:col-span-2 space-y-5">

          {/* Infrastructure Health Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-lime" /> Your Infrastructure
            </h3>
            <HealthScore score={healthScore} />
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'Websites', value: '4', icon: Server, c: '#22d3ee' },
                { label: 'Databases', value: '2', icon: HardDrive, c: '#e879f9' },
                { label: 'Avg Latency', value: '45ms', icon: Activity, c: '#fbbf24' },
                { label: 'Scan Coverage', value: '100%', icon: ShieldCheck, c: '#34d399' },
              ].map(m => (
                <div key={m.label} className="bg-white/[0.03] rounded-lg p-2.5 flex items-center gap-2">
                  <m.icon className="w-3.5 h-3.5" style={{ color: m.c }} />
                  <div>
                    <p className="text-xs font-black text-white/70">{m.value}</p>
                    <p className="text-[8px] text-white/20 uppercase">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber" /> Quick Actions
            </h3>
            <button onClick={() => navigate('/customer/incidents')} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-rose/10 text-rose rounded-lg text-[11px] font-bold hover:bg-rose/20 transition-all">
              <AlertTriangle className="w-4 h-4" /> Report New Incident
            </button>
            <button onClick={() => navigate('/customer/vault')} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-cyan/10 text-cyan rounded-lg text-[11px] font-bold hover:bg-cyan/20 transition-all">
              <Lock className="w-4 h-4" /> Add Credentials to Vault
            </button>
            <button onClick={() => navigate('/customer/security')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-bold hover:opacity-80 transition-all" style={{ backgroundColor: 'rgba(232,121,249,0.1)', color: '#e879f9' }}>
              <ShieldCheck className="w-4 h-4" /> View Security Posture
            </button>
            <button onClick={() => navigate('/customer/billing')} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/5 text-white/50 rounded-lg text-[11px] font-bold hover:bg-white/10 transition-all">
              <CreditCard className="w-4 h-4" /> Manage Billing
            </button>
          </div>

          {/* 6-Agent Legend */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3">Autonomous Pipeline</h3>
            <div className="space-y-2">
              {AGENT_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[i], boxShadow: `0 0 4px ${STAGE_COLORS[i]}` }} />
                  <span className="text-[10px] text-white/40">{stage}</span>
                  <span className="text-[8px] text-white/15 ml-auto">
                    {i === 0 ? 'Severity assessment' : i === 1 ? 'Sandbox provision' : i === 2 ? 'AI patch generation' : i === 3 ? '42-scanner check' : i === 4 ? 'Zero-downtime deploy' : 'Compliance trail'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
