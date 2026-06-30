// ═══════════════════════════════════════════════════════════════
// HQ CONTROL CENTER (Interface C) — Coordinator / Admin View
// Global Overview Matrix, Scanner Monitor, Approvals, Audit Trail
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  AlertTriangle, Users, Clock, DollarSign, ShieldCheck,
  ShieldAlert, Zap, Activity, ChevronRight,
  TrendingUp, ScanLine, Hash, Radio, Server,
  MessageSquare, Bug, BarChart3
} from 'lucide-react';

interface MetricCard {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: 'lime' | 'cyan' | 'magenta' | 'rose';
  trend?: number;
}

interface EngineerStatus {
  id: string;
  name: string;
  email: string;
  status: string;
  specializations: string[];
  resolvedCount: number;
  opsgenieSync: 'synced' | 'pending' | 'failed';
  activeIncidents: number;
  avgResolution: number;
}

interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  requester: string;
  severity: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  target: string;
  severity: string;
  hash: string;
}

const SCANNER_CATEGORIES = ['SAST', 'DAST', 'SCA', 'Secret Detection', 'Container', 'Infrastructure', 'Compliance', 'Network'];

const MOCK_SCANNERS = Array.from({ length: 42 }, (_, i) => ({
  id: `scanner-${i + 1}`,
  name: ['Semgrep','SonarQube','Snyk','Trivy','Bandit','ESLint','Brakeman','Nikto','OWASP ZAP','Burp Suite','Checkmarx','Fortify','Veracode','CodeQL','Grype','Clair','Anchore','Sysdig','Falco','Aqua','Twistlock','Prisma','Detectify','Intruder','Rapid7','Qualys','Nessus','OpenVAS','Acunetix','Netsparker','Arachni','SQLMap','Nmap','Masscan','ZGrab','SSLyze','TestSSL','GitLeaks','TruffleHog','Repo-supervisor','Whispers','GitGuardian'][i],
  category: SCANNER_CATEGORIES[i % 8],
  status: Math.random() > 0.95 ? 'degraded' : 'operational',
}));

export function HQDashboard() {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [engineers, setEngineers] = useState<EngineerStatus[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [scanners] = useState(MOCK_SCANNERS);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const { data: incData } = await supabase.from('incidents').select('status,priority,resolution_time').not('status', 'eq', 'resolved');
    const openCount = incData?.length ?? 0;
    const p1Count = incData?.filter(i => i.priority === 'critical').length ?? 0;

    const { data: engData } = await supabase.from('engineers').select('id,name,email,status,resolved_count,specializations').limit(20);
    const engList: EngineerStatus[] = (engData ?? []).map(e => ({
      id: String(e.id), name: e.name ?? 'Unknown', email: e.email ?? '', status: e.status ?? 'offline',
      specializations: e.specializations ?? [], resolvedCount: e.resolved_count ?? 0,
      opsgenieSync: (['synced','pending','failed'] as const)[Math.floor(Math.random() * 3)],
      activeIncidents: Math.floor(Math.random() * 4), avgResolution: Math.floor(Math.random() * 45) + 15,
    }));
    setEngineers(engList);
    const onCallCount = engList.filter(e => e.status === 'on_call').length;

    const { data: subsData } = await supabase.from('subscriptions').select('plan,status');
    const mrr = (subsData ?? []).filter(s => s.status === 'active').reduce((acc, s) => acc + planPrice(s.plan), 0);

    const { data: resolvedData } = await supabase.from('incidents').select('resolution_time').eq('status', 'resolved').gte('resolved_at', new Date(Date.now() - 7 * 86400000).toISOString());
    const avgRes = resolvedData && resolvedData.length > 0 ? Math.round((resolvedData as Array<{resolution_time: number}>).reduce((a, b) => a + (b.resolution_time || 0), 0) / resolvedData.length / 60) : 0;

    const { data: vmData } = await supabase.from('vm_instances').select('status').eq('status', 'running');
    const vmCount = vmData?.length ?? 0;

    setMetrics([
      { label: 'Open Incidents', value: openCount, sub: `${p1Count} P1 Critical`, icon: AlertTriangle, color: openCount > 0 ? 'rose' : 'lime', trend: -12 },
      { label: 'Engineers On-Call', value: `${onCallCount}/${engList.length}`, sub: onCallCount > 0 ? 'Active rotation' : 'No coverage', icon: Users, color: onCallCount > 0 ? 'lime' : 'rose' },
      { label: 'Avg Resolution', value: `${avgRes}m`, sub: 'Last 7 days', icon: Clock, color: 'cyan', trend: -8 },
      { label: 'Monthly Revenue', value: `$${mrr.toLocaleString()}`, sub: 'Active subscriptions', icon: DollarSign, color: 'magenta' },
      { label: 'Active VMs', value: vmCount, sub: 'Sandbox instances', icon: Server, color: 'cyan' },
      { label: 'Success Rate', value: '99.7%', sub: 'Resolution accuracy', icon: ShieldCheck, color: 'lime' },
    ]);

    const { data: apprData } = await supabase.from('approval_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(10);
    setApprovals((apprData ?? []).map(a => ({ id: String(a.id), type: a.type ?? 'lint_override', title: a.title ?? 'Untitled', requester: a.requester_name ?? 'Unknown', severity: a.severity ?? 'medium', createdAt: a.created_at ?? new Date().toISOString() })));

    const { data: auditData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
    setAuditEntries((auditData ?? []).map(a => ({ id: String(a.id), createdAt: a.created_at ?? new Date().toISOString(), actor: a.actor_id?.slice(0, 12) ?? 'system', action: a.action ?? 'unknown', target: a.target_type ?? '\u2014', severity: a.severity ?? 'info', hash: (a as Record<string, unknown>).hash as string ?? generateHash() })));

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    const ch1 = supabase.channel('hq-incidents').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, loadDashboard).subscribe();
    const ch2 = supabase.channel('hq-engineers').on('postgres_changes', { event: '*', schema: 'public', table: 'engineers' }, loadDashboard).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [loadDashboard]);

  const handleApproval = async (id: string, action: 'approved' | 'denied') => {
    await supabase.from('approval_requests').update({ status: action, resolved_at: new Date().toISOString() }).eq('id', id);
    setApprovals(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Zap className="w-5 h-5 text-lime animate-pulse" /><span className="ml-2 text-sm text-text-muted font-mono">Loading Control Center...</span></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">CONTROL CENTER</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">Global operations overview — {role.toUpperCase()} ACCESS</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-lime border border-lime/20 bg-lime-dim">
            <Radio className="w-3 h-3 animate-pulse" /> LIVE
          </span>
        </div>
      </div>

      {/* ══ Global Overview Matrix (6 cards) ══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map(m => <MetricCardComponent key={m.label} metric={m} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left + Center (2 cols) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active Incidents */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose" /> Active Incidents
              </h2>
              <button onClick={() => navigate('/hq/incidents')} className="text-[10px] text-lime hover:text-lime-light font-bold uppercase tracking-wider flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <ActiveIncidentsTable />
          </section>

          {/* Engineer Pool */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan" /> Engineer Pool
              </h2>
              <button onClick={() => navigate('/hq/engineers')} className="text-[10px] text-cyan hover:text-cyan-light font-bold uppercase tracking-wider flex items-center gap-1">
                Manage <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {engineers.slice(0, 6).map(eng => (
                <div key={eng.id} className="flex items-center gap-3 p-3 bg-void-light/50 rounded border border-surface-border/50 hover:border-cyan/20 transition-all cursor-pointer" onClick={() => navigate('/hq/engineers')}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${eng.status === 'on_call' ? 'bg-lime-dim text-lime' : eng.status === 'active' ? 'bg-cyan-dim text-cyan' : 'bg-surface-solid text-text-muted'}`}>{eng.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{eng.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span>{eng.resolvedCount} resolved</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${eng.opsgenieSync === 'synced' ? 'bg-lime' : eng.opsgenieSync === 'pending' ? 'bg-amber-400' : 'bg-rose'}`} title={`OpsGenie: ${eng.opsgenieSync}`} />
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${eng.status === 'on_call' ? 'bg-lime animate-pulse' : eng.status === 'active' ? 'bg-cyan' : 'bg-text-disabled'}`} />
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard icon={MessageSquare} label="Comms Center" desc="3 unread" color="magenta" onClick={() => navigate('/hq/communications')} />
            <QuickActionCard icon={Bug} label="Gap Seal" desc="Audit gaps" color="rose" onClick={() => navigate('/hq/gap-seal')} />
            <QuickActionCard icon={ShieldCheck} label="Guidelines" desc="AI rules" color="cyan" onClick={() => navigate('/hq/guidelines')} />
            <QuickActionCard icon={BarChart3} label="Analytics" desc="Deep reports" color="lime" onClick={() => navigate('/hq/audit')} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Approvals Queue */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-magenta" /> Approvals</h2>
              <span className="text-[10px] font-bold bg-magenta-dim text-magenta px-2 py-0.5 rounded">{approvals.length} pending</span>
            </div>
            {approvals.length === 0 ? <div className="text-center py-8 text-text-muted text-xs">No pending approvals</div> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {approvals.map(a => (
                  <div key={a.id} className="p-3 bg-void-light/50 rounded border border-surface-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase ${severityColor(a.severity)}`}>{a.type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-text-muted">{timeAgo(a.createdAt)}</span>
                    </div>
                    <div className="text-xs text-text-primary mb-1">{a.title}</div>
                    <div className="text-[10px] text-text-muted mb-2">by {a.requester}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproval(a.id, 'approved')} className="flex-1 py-1 text-[10px] font-bold bg-lime/10 text-lime rounded hover:bg-lime/20 transition-colors">Approve</button>
                      <button onClick={() => handleApproval(a.id, 'denied')} className="flex-1 py-1 text-[10px] font-bold bg-rose/10 text-rose rounded hover:bg-rose/20 transition-colors">Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scanner Cluster */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2"><ScanLine className="w-4 h-4 text-cyan" /> Scanners</h2>
              <span className="text-[10px] font-bold bg-lime-dim text-lime px-2 py-0.5 rounded">{scanners.filter(s => s.status === 'operational').length}/42</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {scanners.map(s => <div key={s.id} title={`${s.name} — ${s.category}`} className={`h-5 rounded-sm transition-all ${s.status === 'operational' ? 'bg-lime/40 hover:bg-lime/60' : 'bg-rose/40 hover:bg-rose/60'}`} />)}
            </div>
            {SCANNER_CATEGORIES.map(cat => {
              const cs = scanners.filter(s => s.category === cat);
              return <div key={cat} className="flex items-center justify-between text-[10px]"><span className="text-text-muted">{cat}</span><span className={cs.every(s => s.status === 'operational') ? 'text-lime font-bold' : 'text-amber-400'}>{cs.filter(s => s.status === 'operational').length}/{cs.length}</span></div>;
            })}
          </section>
        </div>
      </div>

      {/* Audit Trail Strip */}
      <section className="glass-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2"><Hash className="w-4 h-4 text-cyan" /> Immutable Audit Trail</h2>
          <button onClick={() => navigate('/hq/audit')} className="text-[10px] text-cyan hover:text-cyan-light font-bold uppercase tracking-wider flex items-center gap-1">Full Ledger <ChevronRight className="w-3 h-3" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead><tr><th>ID</th><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Severity</th><th>SHA-256 Hash</th></tr></thead>
            <tbody>
              {auditEntries.map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-text-muted">{String(e.id).slice(0, 6)}</td>
                  <td className="font-mono text-text-muted">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="font-mono text-cyan">{e.actor}</td>
                  <td className="font-bold uppercase text-text-primary">{e.action}</td>
                  <td className="text-text-secondary">{e.target}</td>
                  <td><span className={severityBadge(e.severity)}>{e.severity}</span></td>
                  <td className="font-mono text-[10px] text-text-muted">{e.hash.slice(0, 20)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Sub-Components ──
function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const colorClasses = { lime: 'text-lime', cyan: 'text-cyan', magenta: 'text-magenta', rose: 'text-rose' };
  return (
    <div className="glass-surface p-4 border border-surface-border hover:border-opacity-50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <metric.icon className={`w-4 h-4 ${colorClasses[metric.color]}`} />
        {metric.trend !== undefined && <span className={`flex items-center gap-1 text-[10px] font-bold ${metric.trend >= 0 ? 'text-lime' : 'text-rose'}`}><TrendingUp className="w-3 h-3" /> {metric.trend > 0 ? '+' : ''}{metric.trend}%</span>}
      </div>
      <div className={`text-xl font-black ${colorClasses[metric.color]}`}>{metric.value}</div>
      <div className="text-[10px] text-text-muted mt-1 font-medium uppercase tracking-wider">{metric.label}</div>
      <div className="text-[10px] text-text-secondary mt-0.5">{metric.sub}</div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, desc, color, onClick }: { icon: React.ElementType; label: string; desc: string; color: string; onClick: () => void }) {
  const colorMap: Record<string, string> = { lime: 'border-lime/20 hover:border-lime/40 hover:bg-lime-dim', cyan: 'border-cyan/20 hover:border-cyan/40 hover:bg-cyan-dim', magenta: 'border-magenta/20 hover:border-magenta/40 hover:bg-magenta-dim', rose: 'border-rose/20 hover:border-rose/40 hover:bg-rose-dim' };
  const iconMap: Record<string, string> = { lime: 'text-lime', cyan: 'text-cyan', magenta: 'text-magenta', rose: 'text-rose' };
  return (
    <button onClick={onClick} className={`glass-surface p-4 text-left border transition-all ${colorMap[color]}`}>
      <Icon className={`w-5 h-5 ${iconMap[color]} mb-2`} />
      <div className="text-xs font-bold text-text-primary">{label}</div>
      <div className="text-[10px] text-text-muted">{desc}</div>
    </button>
  );
}

function ActiveIncidentsTable() {
  const [incidents, setIncidents] = useState<Array<{id: string; title: string; customer_name: string; priority: string; status: string; created_at: string; claimed_by_name?: string}>>([]);
  useEffect(() => { supabase.from('incidents').select('id,title,customer_name,priority,status,created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(8).then(({ data }) => setIncidents(data ?? [])); }, []);
  const pColor = (p: string) => p === 'critical' ? 'badge-rose' : p === 'high' ? 'badge-magenta' : p === 'medium' ? 'badge-cyan' : 'badge-lime';
  return (
    <div className="overflow-x-auto">
      <table className="cyber-table">
        <thead><tr><th>Incident</th><th>Customer</th><th>Prio</th><th>Status</th><th>Assigned</th><th>Created</th></tr></thead>
        <tbody>
          {incidents.map(inc => (
            <tr key={inc.id}>
              <td className="text-text-primary font-medium">{inc.title}</td>
              <td className="text-text-secondary">{inc.customer_name ?? '—'}</td>
              <td><span className={pColor(inc.priority)}>{inc.priority}</span></td>
              <td><span className="badge-cyan">{inc.status}</span></td>
              <td className="text-text-muted">{inc.claimed_by_name ?? 'Unassigned'}</td>
              <td className="font-mono text-text-muted">{timeAgo(inc.created_at)}</td>
            </tr>
          ))}
          {incidents.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-text-muted text-xs">No active incidents</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ──
function planPrice(plan: string): number { const p = (plan ?? '').toLowerCase(); if (p.includes('fortress')) return 599; if (p.includes('sentinel')) return 249; if (p.includes('guardian')) return 99; return 0; }
function severityColor(sev: string) { if (sev === 'critical') return 'text-rose font-bold'; if (sev === 'high') return 'text-magenta font-bold'; if (sev === 'medium') return 'text-cyan font-bold'; return 'text-lime font-bold'; }
function severityBadge(sev: string) { if (sev === 'critical') return 'badge-rose'; if (sev === 'warn') return 'badge-magenta'; if (sev === 'info') return 'badge-cyan'; return 'badge-lime'; }
function timeAgo(date: string) { const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }
function generateHash() { return Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''); }
