// ═══════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD v2.5 — Primary Telemetry Hub
// HQ-grade density: health gauge, 4-up metrics, incident carousel,
// compliance audit timeline, subscription status
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle, CheckCircle2, ShieldCheck, Activity,
  TrendingUp, Lock, Zap, ChevronRight, Fingerprint,
  Radio, Shield, Bell, CircleDot, CircleDashed, Hash
} from 'lucide-react';

// ── Mock Data ──
const MOCK_INCIDENTS = [
  { id: 'INC-2024-001847', title: 'SSL Certificate Expiry on API Gateway', severity: 'critical', status: 'deployed', stage: 4, agent: 'validate', created_at: new Date(Date.now() - 86400000).toISOString(), eta: '2h' },
  { id: 'INC-2024-001846', title: 'Database Connection Pool Exhaustion', severity: 'high', status: 'repaired', stage: 2, agent: 'repair', created_at: new Date(Date.now() - 172800000).toISOString(), eta: '4h' },
  { id: 'INC-2024-001845', title: 'Edge Function Cold Start Degradation', severity: 'medium', status: 'triaged', stage: 0, agent: 'triage', created_at: new Date(Date.now() - 259200000).toISOString(), eta: '8h' },
  { id: 'INC-2024-001844', title: 'DNS Propagation Delay on Secondary NS', severity: 'high', status: 'validated', stage: 3, agent: 'validate', created_at: new Date(Date.now() - 345600000).toISOString(), eta: '1h' },
  { id: 'INC-2024-001843', title: 'Storage Bucket Permission Misconfiguration', severity: 'low', status: 'resolved', stage: 5, agent: 'audit', created_at: new Date(Date.now() - 432000000).toISOString(), eta: 'Complete' },
];

const MOCK_AUDIT_LOGS = [
  { id: 'AUD-2847', actor: 'System', action: 'AGENT_TRIAGE_STARTED', target: 'INC-2024-001847', severity: 'info', timestamp: new Date(Date.now() - 3600000).toISOString(), hash: '0x8f3a...b2c1' },
  { id: 'AUD-2846', actor: 'AI Agent-Isolate', action: 'SANDBOX_CREATED', target: 'SBX-7f3a2b', severity: 'info', timestamp: new Date(Date.now() - 7200000).toISOString(), hash: '0x7e2b...a1d0' },
  { id: 'AUD-2845', actor: 'AI Agent-Repair', action: 'PATCH_GENERATED', target: 'PATCH-2847-a', severity: 'info', timestamp: new Date(Date.now() - 10800000).toISOString(), hash: '0x6d1c...903f' },
  { id: 'AUD-2844', actor: 'AI Agent-Validate', action: 'SCANNER_MATRIX_PASS', target: '42/42 Scanners', severity: 'info', timestamp: new Date(Date.now() - 14400000).toISOString(), hash: '0x5c0d...812e' },
  { id: 'AUD-2843', actor: 'Admin', action: 'PATCH_APPROVED', target: 'APR-2847-a', severity: 'warn', timestamp: new Date(Date.now() - 18000000).toISOString(), hash: '0x4b1e...715d' },
  { id: 'AUD-2842', actor: 'AI Agent-Deploy', action: 'DEPLOYMENT_SUCCESS', target: 'DEP-2847-prod', severity: 'info', timestamp: new Date(Date.now() - 21600000).toISOString(), hash: '0x3a2f...614c' },
  { id: 'AUD-2841', actor: 'Customer', action: 'APPROVAL_SUBMITTED', target: 'INC-2024-001847', severity: 'info', timestamp: new Date(Date.now() - 25200000).toISOString(), hash: '0x2910...573b' },
  { id: 'AUD-2840', actor: 'System', action: 'INCIDENT_RESOLVED', target: 'INC-2024-001847', severity: 'info', timestamp: new Date(Date.now() - 28800000).toISOString(), hash: '0x1801...462a' },
];

const AGENT_STAGES = ['Triage', 'Isolate', 'Repair', 'Validate', 'Deploy', 'Audit'];
const AGENT_COLORS = ['#22d3ee', '#e879f9', '#a3e635', '#fbbf24', '#34d399', '#a78bfa'];

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#a3e635' : score >= 50 ? '#fbbf24' : '#f43f5e';
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
}

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents] = useState(MOCK_INCIDENTS);
  const [auditLogs] = useState(MOCK_AUDIT_LOGS);
  const [healthScore] = useState(87);
  const [emailAlerts] = useState(true);
  const [subscription] = useState({ tier: 'Sentinel', price: 249, renewal: '2025-08-01', status: 'active' });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }, []);

  const stats = useMemo(() => ({
    active: incidents.filter(i => i.status !== 'resolved').length,
    resolved: incidents.filter(i => i.status === 'resolved').length + 12,
    runs: 2847,
    scannersActive: 42,
  }), [incidents]);

  const sevColor = (s: string) => s === 'critical' ? '#f43f5e' : s === 'high' ? '#fb923c' : s === 'medium' ? '#fbbf24' : '#a3e635';

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative bg-white/[0.02] border border-white/5 rounded-xl p-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{greeting}, {user?.email?.split('@')[0] || 'User'}</h1>
              <p className="text-xs text-white/40 mt-1">
                <Shield className="w-3 h-3 inline text-lime mr-1" />
                {subscription.tier} Plan · Active until {subscription.renewal}
                <span className="mx-2 text-white/10">|</span>
                <Bell className="w-3 h-3 inline text-cyan mr-1" />
                Email alerts {emailAlerts ? 'enabled' : 'disabled'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-lime bg-lime/10 px-2 py-1 rounded border border-lime/20">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE
              </span>
              <span className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded">
                42-Scanner Matrix Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status Ribbon */}
      {subscription.status === 'active' ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-lime/5 border border-lime/20 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-lime" />
          <span className="text-xs text-lime font-bold">INFRASTRUCTURE PROTECTED</span>
          <span className="text-[10px] text-white/40">— {subscription.tier} tier with 42-scanner validation matrix</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose/5 border border-rose/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-rose" />
          <span className="text-xs text-rose font-bold">INFRASTRUCTURE UNPROTECTED</span>
          <button onClick={() => navigate('/customer/billing')} className="ml-auto text-[10px] text-rose underline hover:no-underline">Subscribe Now</button>
        </div>
      )}

      {/* Metric Grid 4-up */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Outages', value: stats.active, icon: AlertTriangle, color: '#f43f5e', pulse: stats.active > 0 },
          { label: 'Resolved This Month', value: stats.resolved, icon: CheckCircle2, color: '#a3e635', trend: '+12%' },
          { label: 'Protection Runs', value: stats.runs.toLocaleString(), icon: Activity, color: '#22d3ee', trend: '+284' },
          { label: 'Scanners Active', value: `${stats.scannersActive}/42`, icon: ShieldCheck, color: '#e879f9' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              {s.trend && <span className="text-[10px] font-bold text-lime flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{s.trend}</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black text-white ${s.pulse ? 'animate-pulse' : ''}`}>{s.value}</span>
            </div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Active Operations Carousel */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime" /> Active Operations
            </h2>
            <button onClick={() => navigate('/customer/incidents')} className="flex items-center gap-1 text-[11px] text-lime hover:text-lime/80 font-bold transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {incidents.slice(0, 5).map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate('/customer/incidents')}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: sevColor(inc.severity), boxShadow: `0 0 8px ${sevColor(inc.severity)}40` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/30">{inc.id}</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sevColor(inc.severity)}15`, color: sevColor(inc.severity), border: `1px solid ${sevColor(inc.severity)}30` }}>
                          {inc.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30">ETA: {inc.eta}</span>
                    </div>
                    <p className="text-xs font-bold text-white/70 mb-2 truncate">{inc.title}</p>

                    {/* 6-Agent Progress */}
                    <div className="flex items-center gap-1">
                      {AGENT_STAGES.map((stage, i) => (
                        <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                            style={{
                              backgroundColor: i <= inc.stage ? `${AGENT_COLORS[i]}20` : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${i <= inc.stage ? AGENT_COLORS[i] : 'rgba(255,255,255,0.1)'}`,
                              boxShadow: i === inc.stage ? `0 0 8px ${AGENT_COLORS[i]}60` : 'none',
                            }}
                          >
                            {i < inc.stage ? <CheckCircle2 className="w-2.5 h-2.5" style={{ color: AGENT_COLORS[i] }} /> :
                             i === inc.stage ? <CircleDot className="w-2.5 h-2.5 animate-pulse" style={{ color: AGENT_COLORS[i] }} /> :
                             <CircleDashed className="w-2.5 h-2.5 text-white/15" />}
                          </div>
                          <span className="text-[7px] uppercase tracking-wider" style={{ color: i <= inc.stage ? AGENT_COLORS[i] : 'rgba(255,255,255,0.2)' }}>{stage.slice(0, 4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Health + Audit */}
        <div className="space-y-5">
          {/* Health Score */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-lime" /> Infrastructure Health
            </h3>
            <div className="flex items-center justify-center">
              <HealthGauge score={healthScore} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: 'Uptime', value: '99.97%', color: '#a3e635' },
                { label: 'Scans', value: '42/42', color: '#22d3ee' },
                { label: 'Latency', value: '45ms', color: '#fbbf24' },
                { label: 'Coverage', value: '100%', color: '#34d399' },
              ].map(m => (
                <div key={m.label} className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <div className="text-xs font-black" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[8px] text-white/25 uppercase">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Audit Timeline */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5 text-cyan" /> Audit Trail
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-1.5 border-l border-white/5 pl-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: log.severity === 'warn' ? '#fbbf24' : '#22d3ee' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-white/40">{log.id}</span>
                      <span className="text-[9px] font-bold" style={{ color: log.actor.startsWith('AI') ? '#e879f9' : log.actor === 'Admin' ? '#f43f5e' : '#a3e635' }}>{log.actor}</span>
                    </div>
                    <p className="text-[10px] text-white/50 truncate">{log.action}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Hash className="w-2.5 h-2.5 text-white/15" />
                      <span className="text-[8px] font-mono text-white/20 truncate">{log.hash}</span>
                    </div>
                  </div>
                  <span className="text-[8px] text-white/20 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber" /> Quick Actions
            </h3>
            <button onClick={() => navigate('/customer/incidents')} className="w-full flex items-center gap-2 px-3 py-2 bg-rose/10 text-rose rounded-lg text-[11px] font-bold hover:bg-rose/20 transition-all">
              <AlertTriangle className="w-3.5 h-3.5" /> Report New Incident
            </button>
            <button onClick={() => navigate('/customer/vault')} className="w-full flex items-center gap-2 px-3 py-2 bg-cyan/10 text-cyan rounded-lg text-[11px] font-bold hover:bg-cyan/20 transition-all">
              <Lock className="w-3.5 h-3.5" /> Add Credentials
            </button>
            <button onClick={() => navigate('/customer/security')} className="w-full flex items-center gap-2 px-3 py-2 bg-magenta/10 text-magenta rounded-lg text-[11px] font-bold hover:bg-magenta/20 transition-all" style={{ color: '#e879f9' }}>
              <ShieldCheck className="w-3.5 h-3.5" /> View Security Posture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
