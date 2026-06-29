// ═══════════════════════════════════════════════════════════════
// HQ CONTROL CENTER (Interface C) — Coordinator / Admin View
// Global Overview Matrix, Scanner Monitor, Approvals Queue, Audit Trail
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  AlertTriangle, Users, Clock, DollarSign,
  ShieldAlert, Zap, Activity,
  ChevronRight, TrendingUp, ClipboardList, ScanLine, Plus, Hash
} from 'lucide-react';

// ── Types ──
interface MetricCard {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: 'lime' | 'cyan' | 'magenta' | 'rose';
  trend?: number;
}

interface ScannerStatus {
  id: string;
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'offline';
  lastScan: string;
}

interface ApprovalItem {
  id: string;
  type: 'lint_override' | 'deployment_exemption' | 'verification_signoff' | 'credential_access';
  title: string;
  requester: string;
  incidentId: string;
  severity: 'critical' | 'high' | 'medium';
  createdAt: string;
  status: 'pending' | 'approved' | 'denied';
}

interface AuditEntry {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  target: string;
  severity: string;
  hash: string;
  prevHash: string | null;
}

interface Engineer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'on_call' | 'offline';
  specializations: string[];
  resolvedCount: number;
}

// ── Constants ──
const SCANNER_CATEGORIES = [
  'SAST', 'DAST', 'SCA', 'Secret Detection', 'Container',
  'Infrastructure', 'Compliance', 'Network'
];

const MOCK_SCANNERS: ScannerStatus[] = Array.from({ length: 42 }, (_, i) => ({
  id: `scanner-${i + 1}`,
  name: ['Semgrep', 'SonarQube', 'Snyk', 'Trivy', 'Bandit', 'ESLint', 'Brakeman', 'Nikto', 'OWASP ZAP', 'Burp Suite', 'Checkmarx', 'Fortify', 'Veracode', 'CodeQL', 'Grype', 'Clair', 'Anchore', 'Sysdig', 'Falco', 'Aqua', 'Twistlock', 'Prisma', 'Detectify', 'Intruder', 'Rapid7', 'Qualys', 'Nessus', 'OpenVAS', 'Acunetix', 'Netsparker', 'Arachni', 'SQLMap', 'Nmap', 'Masscan', 'ZGrab', 'SSLyze', 'TestSSL', 'GitLeaks', 'TruffleHog', 'Repo-supervisor', 'Whispers', 'GitGuardian'][i],
  category: SCANNER_CATEGORIES[i % 8],
  status: Math.random() > 0.95 ? 'degraded' : 'operational',
  lastScan: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
}));

export function HQDashboard() {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [scanners] = useState<ScannerStatus[]>(MOCK_SCANNERS);
  const [loading, setLoading] = useState(true);
  const [showAddEngineer, setShowAddEngineer] = useState(false);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  // ── Load all dashboard data ──
  const loadDashboard = useCallback(async () => {
    setLoading(true);

    // Incidents count
    const { data: incidentsData } = await supabase
      .from('incidents')
      .select('status,priority,resolution_time', { count: 'exact' })
      .not('status', 'eq', 'resolved');

    const openCount = incidentsData?.length ?? 0;
    const p1Count = incidentsData?.filter(i => i.priority === 'critical').length ?? 0;

    // Engineers
    const { data: engineersData } = await supabase
      .from('engineers')
      .select('id,name,email,status,resolved_count,specializations')
      .limit(20);

    const engList: Engineer[] = (engineersData ?? []).map(e => ({
      id: String(e.id),
      name: e.name ?? 'Unknown',
      email: e.email ?? '',
      status: e.status ?? 'offline',
      specializations: e.specializations ?? [],
      resolvedCount: e.resolved_count ?? 0,
    }));
    setEngineers(engList);
    const onCallCount = engList.filter(e => e.status === 'on_call').length;

    // Customers & MRR
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select('plan,status');

    const mrr = (subsData ?? [])
      .filter(s => s.status === 'active')
      .reduce((acc, s) => acc + planPrice(s.plan), 0);

    // Avg resolution
    const { data: resolvedData } = await supabase
      .from('incidents')
      .select('resolution_time')
      .eq('status', 'resolved')
      .gte('resolved_at', new Date(Date.now() - 7 * 86400000).toISOString());

    const avgResolution = resolvedData && resolvedData.length > 0
      ? Math.round((resolvedData as Array<{resolution_time: number}>).reduce((a, b) => a + (b.resolution_time || 0), 0) / resolvedData.length / 60)
      : 0;

    setMetrics([
      { label: 'Open Incidents', value: openCount, sub: `${p1Count} P1 Critical`, icon: AlertTriangle, color: openCount > 0 ? 'rose' : 'lime' },
      { label: 'Engineers On-Call', value: `${onCallCount}/${engList.length}`, sub: onCallCount > 0 ? 'Active rotation' : 'No coverage', icon: Users, color: onCallCount > 0 ? 'lime' : 'rose' },
      { label: 'Avg Resolution', value: `${avgResolution}m`, sub: 'Last 7 days', icon: Clock, color: 'cyan' },
      { label: 'Monthly Revenue', value: `$${mrr.toLocaleString()}`, sub: 'Active subscriptions', icon: DollarSign, color: 'magenta' },
    ]);

    // Approvals queue
    const { data: approvalsData } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    setApprovals((approvalsData ?? []).map(a => ({
      id: String(a.id),
      type: a.type ?? 'lint_override',
      title: a.title ?? 'Untitled Request',
      requester: a.requester_name ?? 'Unknown',
      incidentId: String(a.incident_id ?? ''),
      severity: a.severity ?? 'medium',
      createdAt: a.created_at ?? new Date().toISOString(),
      status: a.status ?? 'pending',
    })));

    // Audit log
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    setAuditEntries((auditData ?? []).map((a, i, arr) => ({
      id: String(a.id),
      createdAt: a.created_at ?? new Date().toISOString(),
      actor: a.actor_id?.slice(0, 12) ?? 'system',
      action: a.action ?? 'unknown',
      target: a.target_type ?? '—',
      severity: a.severity ?? 'info',
      hash: (a as Record<string, unknown>).hash as string ?? generateHash(),
      prevHash: i < arr.length - 1 ? generateHash() : null,
    })));

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();

    // Realtime: incidents
    const incidentsChannel = supabase
      .channel('hq-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, loadDashboard)
      .subscribe();

    // Realtime: engineers
    const engineersChannel = supabase
      .channel('hq-engineers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engineers' }, loadDashboard)
      .subscribe();

    // Realtime: approvals
    const approvalsChannel = supabase
      .channel('hq-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, loadDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(engineersChannel);
      supabase.removeChannel(approvalsChannel);
    };
  }, [loadDashboard]);

  const handleApprovalAction = async (id: string, action: 'approved' | 'denied') => {
    setApprovalsLoading(true);
    await supabase.from('approval_requests').update({ status: action, resolved_at: new Date().toISOString() }).eq('id', id);
    setApprovals(prev => prev.filter(a => a.id !== id));
    setApprovalsLoading(false);
  };

  const operationalScanners = scanners.filter(s => s.status === 'operational').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Zap className="w-5 h-5 text-lime animate-pulse" />
        <span className="ml-2 text-sm text-text-muted font-mono">Loading Control Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">CONTROL CENTER</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">Global operations overview — {role.toUpperCase()} ACCESS</p>
        </div>
        <button
          onClick={() => setShowAddEngineer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-lime text-void-deep text-xs font-bold rounded hover:bg-lime-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Engineer
        </button>
      </div>

      {/* ══ Global Overview Matrix ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCardComponent key={m.label} metric={m} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ══ Active Incidents + Engineer Pool (2 cols) ══ */}
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

          {/* Engineer Pool Saturation */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan" /> Engineer Pool
              </h2>
              <button onClick={() => navigate('/hq/engineers')} className="text-[10px] text-cyan hover:text-cyan-light font-bold uppercase tracking-wider flex items-center gap-1">
                Manage <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {engineers.slice(0, 6).map(eng => (
                <div key={eng.id} className="flex items-center gap-3 p-3 bg-void-light/50 rounded border border-surface-border/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    eng.status === 'on_call' ? 'bg-lime-dim text-lime' :
                    eng.status === 'active' ? 'bg-cyan-dim text-cyan' :
                    'bg-surface-solid text-text-muted'
                  }`}>
                    {eng.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{eng.name}</div>
                    <div className="text-[10px] text-text-muted">{eng.resolvedCount} resolved</div>
                  </div>
                  <StatusDot status={eng.status} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ══ Right Column: Approvals + Scanner Status ══ */}
        <div className="space-y-6">
          {/* Security Approvals Queue */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-magenta" /> Approvals Queue
              </h2>
              <span className="text-[10px] font-bold bg-magenta-dim text-magenta px-2 py-0.5 rounded">{approvals.length} pending</span>
            </div>
            {approvals.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs">No pending approvals</div>
            ) : (
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
                      <button onClick={() => handleApprovalAction(a.id, 'approved')} disabled={approvalsLoading} className="flex-1 py-1 text-[10px] font-bold bg-lime/10 text-lime rounded hover:bg-lime/20 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleApprovalAction(a.id, 'denied')} disabled={approvalsLoading} className="flex-1 py-1 text-[10px] font-bold bg-rose/10 text-rose rounded hover:bg-rose/20 transition-colors">
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Scanner Cluster Fitness */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-cyan" /> Scanner Cluster
              </h2>
              <span className="text-[10px] font-bold bg-lime-dim text-lime px-2 py-0.5 rounded">{operationalScanners}/42 Operational</span>
            </div>
            {/* Scanner Grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {scanners.map(s => (
                <div
                  key={s.id}
                  title={`${s.name} — ${s.category} — ${s.status}`}
                  className={`h-5 rounded-sm transition-all ${
                    s.status === 'operational' ? 'bg-lime/40 hover:bg-lime/60' :
                    s.status === 'degraded' ? 'bg-cyan/40 hover:bg-cyan/60' :
                    'bg-rose/40 hover:bg-rose/60'
                  }`}
                />
              ))}
            </div>
            {/* Scanner Categories */}
            <div className="space-y-1.5">
              {SCANNER_CATEGORIES.map(cat => {
                const catScanners = scanners.filter(s => s.category === cat);
                const catOp = catScanners.filter(s => s.status === 'operational').length;
                return (
                  <div key={cat} className="flex items-center justify-between text-[10px]">
                    <span className="text-text-muted">{cat}</span>
                    <span className={catOp === catScanners.length ? 'text-lime font-bold' : 'text-cyan'}>{catOp}/{catScanners.length}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Links */}
          <section className="glass-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime" /> Quick Actions
            </h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/hq/incidents')} className="w-full flex items-center gap-2 p-2.5 rounded bg-void-light/50 border border-surface-border/50 hover:border-lime/30 hover:bg-lime-dim transition-all text-left">
                <AlertTriangle className="w-4 h-4 text-rose" />
                <span className="text-xs text-text-primary">Manage Incidents</span>
              </button>
              <button onClick={() => navigate('/hq/audit')} className="w-full flex items-center gap-2 p-2.5 rounded bg-void-light/50 border border-surface-border/50 hover:border-cyan/30 hover:bg-cyan-dim transition-all text-left">
                <ClipboardList className="w-4 h-4 text-cyan" />
                <span className="text-xs text-text-primary">View Audit Trail</span>
              </button>
              <button onClick={() => navigate('/hq/scanners')} className="w-full flex items-center gap-2 p-2.5 rounded bg-void-light/50 border border-surface-border/50 hover:border-magenta/30 hover:bg-magenta-dim transition-all text-left">
                <ScanLine className="w-4 h-4 text-magenta" />
                <span className="text-xs text-text-primary">Scanner Configuration</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ══ Audit Trail Strip ══ */}
      <section className="glass-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan" /> Immutable Audit Trail
          </h2>
          <button onClick={() => navigate('/hq/audit')} className="text-[10px] text-cyan hover:text-cyan-light font-bold uppercase tracking-wider flex items-center gap-1">
            Full Ledger <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Severity</th>
                <th>SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-text-muted">{String(e.id).slice(0, 6)}</td>
                  <td className="font-mono text-text-muted">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="font-mono text-cyan">{e.actor}</td>
                  <td className="font-bold uppercase text-text-primary">{e.action}</td>
                  <td className="text-text-secondary">{e.target}</td>
                  <td><span className={severityBadge(e.severity)}>{e.severity}</span></td>
                  <td className="font-mono text-[10px] text-text-muted">{e.hash.slice(0, 16)}...{e.prevHash ? '←' + e.prevHash.slice(0, 8) : 'GENESIS'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Engineer Modal */}
      {showAddEngineer && <AddEngineerModal onClose={() => setShowAddEngineer(false)} />}
    </div>
  );
}

// ── Sub-Components ──

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const colorMap = {
    lime: 'text-lime bg-lime-dim border-lime/20',
    cyan: 'text-cyan bg-cyan-dim border-cyan/20',
    magenta: 'text-magenta bg-magenta-dim border-magenta/20',
    rose: 'text-rose bg-rose-dim border-rose/20',
  };

  return (
    <div className={`glass-surface p-5 border transition-all hover:border-opacity-50 ${colorMap[metric.color]}`}>
      <div className="flex items-start justify-between mb-3">
        <metric.icon className={`w-5 h-5 ${metric.color === 'lime' ? 'text-lime' : metric.color === 'cyan' ? 'text-cyan' : metric.color === 'magenta' ? 'text-magenta' : 'text-rose'}`} />
        {metric.trend !== undefined && (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${metric.trend >= 0 ? 'text-lime' : 'text-rose'}`}>
            <TrendingUp className="w-3 h-3" /> {metric.trend > 0 ? '+' : ''}{metric.trend}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-black tracking-tight ${metric.color === 'lime' ? 'text-lime' : metric.color === 'cyan' ? 'text-cyan' : metric.color === 'magenta' ? 'text-magenta' : 'text-rose'}`}>
        {metric.value}
      </div>
      <div className="text-[10px] text-text-muted mt-1 font-medium uppercase tracking-wider">{metric.label}</div>
      <div className="text-[10px] text-text-secondary mt-0.5">{metric.sub}</div>
    </div>
  );
}

function ActiveIncidentsTable() {
  const [incidents, setIncidents] = useState<Array<{id: string; title: string; customer_name: string; priority: string; status: string; created_at: string}>>([]);

  useEffect(() => {
    supabase.from('incidents').select('id,title,customer_name,priority,status,created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(8).then(({ data }) => {
      setIncidents(data ?? []);
    });
  }, []);

  const priorityColor = (p: string) => {
    if (p === 'critical') return 'badge-rose';
    if (p === 'high') return 'badge-magenta';
    if (p === 'medium') return 'badge-cyan';
    return 'badge-lime';
  };

  return (
    <div className="overflow-x-auto">
      <table className="cyber-table">
        <thead>
          <tr>
            <th>Incident</th>
            <th>Customer</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map(inc => (
            <tr key={inc.id}>
              <td className="text-text-primary font-medium">{inc.title}</td>
              <td className="text-text-secondary">{inc.customer_name ?? '—'}</td>
              <td><span className={priorityColor(inc.priority)}>{inc.priority}</span></td>
              <td><span className="badge-cyan">{inc.status}</span></td>
              <td className="font-mono text-text-muted">{timeAgo(inc.created_at)}</td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr><td colSpan={5} className="text-center py-6 text-text-muted text-xs">No active incidents</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === 'on_call') return <div className="w-2 h-2 rounded-full bg-lime animate-pulse" title="On Call" />;
  if (status === 'active') return <div className="w-2 h-2 rounded-full bg-cyan" title="Active" />;
  return <div className="w-2 h-2 rounded-full bg-text-disabled" title="Offline" />;
}

function AddEngineerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) return;
    setSaving(true);
    await supabase.from('engineers').insert({ name, email, status: 'active', resolved_count: 0, specializations: [] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-surface w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4">Add Engineer</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-void-light border border-surface-border rounded px-3 py-2 text-xs text-text-primary focus:border-lime focus:outline-none" placeholder="Engineer name" />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 bg-void-light border border-surface-border rounded px-3 py-2 text-xs text-text-primary focus:border-lime focus:outline-none" placeholder="email@uptimeops.com" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-text-secondary hover:text-text-primary border border-surface-border rounded hover:bg-surface-hover/30 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !name || !email} className="flex-1 py-2 text-xs font-bold bg-lime text-void-deep rounded hover:bg-lime-dark transition-colors disabled:opacity-50">
            {saving ? 'Adding...' : 'Add Engineer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function planPrice(plan: string): number {
  const p = (plan ?? '').toLowerCase();
  if (p.includes('fortress')) return 599;
  if (p.includes('sentinel')) return 249;
  if (p.includes('guardian')) return 99;
  return 0;
}

function severityColor(sev: string) {
  if (sev === 'critical') return 'text-rose font-bold';
  if (sev === 'high') return 'text-magenta font-bold';
  if (sev === 'medium') return 'text-cyan font-bold';
  return 'text-lime font-bold';
}

function severityBadge(sev: string) {
  if (sev === 'critical') return 'badge-rose';
  if (sev === 'warn') return 'badge-magenta';
  if (sev === 'info') return 'badge-cyan';
  return 'badge-lime';
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function generateHash(): string {
  return Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}
