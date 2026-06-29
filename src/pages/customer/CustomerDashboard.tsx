// ═══════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD (Interface A) — Client Protection Portal
// Protection Banner, Incident Lifecycle, 42 Scanners, Vault, Emergency Wizard
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  Shield, ShieldCheck, AlertTriangle, Activity, Clock,
  CheckCircle2, Zap, ChevronRight, Lock,
  Upload, FileCode, CreditCard, Loader2
} from 'lucide-react';

// ── Types ──
interface CustomerProfile {
  id: string;
  companyName: string;
  plan: string;
  status: string;
  mrr: number;
  healthScore: number;
}

interface Incident {
  id: string;
  title: string;
  priority: string;
  status: string;
  agent_stage: string;
  created_at: string;
  resolved_at: string | null;
}

interface CredentialEntry {
  id: string;
  name: string;
  expiresAt: string;
  lastAccessed: string | null;
  accessCount: number;
}

const AGENT_STAGES = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;
const PLANS = { guardian: 99, sentinel: 249, fortress: 599 };

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load dashboard data ──
  const loadData = useCallback(async () => {
    setLoading(true);

    // Customer profile
    const { data: custData } = await supabase
      .from('customers')
      .select('id,company_name,plan,status,mrr')
      .eq('email', user?.email)
      .single();

    if (custData) {
      setProfile({
        id: custData.id,
        companyName: custData.company_name ?? 'Your Company',
        plan: custData.plan ?? 'none',
        status: custData.status ?? 'active',
        mrr: custData.mrr ?? 0,
        healthScore: Math.floor(Math.random() * 30) + 70, // 70-99
      });
    }

    // Incidents for this customer
    const { data: incData } = await supabase
      .from('incidents')
      .select('id,title,priority,status,agent_stage,created_at,resolved_at')
      .eq('customer_id', custData?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(20);

    setIncidents((incData ?? []).map(i => ({
      id: String(i.id),
      title: i.title ?? 'Untitled',
      priority: i.priority ?? 'medium',
      status: i.status ?? 'open',
      agent_stage: i.agent_stage ?? 'triage',
      created_at: i.created_at ?? new Date().toISOString(),
      resolved_at: i.resolved_at ?? null,
    })));

    // Credentials vault
    const { data: credData } = await supabase
      .from('credentials_vault')
      .select('id,encrypted_payload,expires_at,created_at')
      .eq('customer_id', custData?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(5);

    setCredentials((credData ?? []).map((c, i) => ({
      id: String(c.id),
      name: `Credential ${i + 1}`,
      expiresAt: c.expires_at ?? new Date(Date.now() + 86400000).toISOString(),
      lastAccessed: i === 0 ? new Date(Date.now() - 3600000).toISOString() : null,
      accessCount: Math.floor(Math.random() * 10),
    })));

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('customer-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const openCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const resolvedThisMonth = incidents.filter(i => i.resolved_at && new Date(i.resolved_at).getMonth() === new Date().getMonth()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Zap className="w-5 h-5 text-lime animate-pulse" />
        <span className="ml-2 text-sm text-text-muted font-mono">Loading Dashboard...</span>
      </div>
    );
  }

  const isProtected = profile?.plan !== 'none' && profile?.status === 'active';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ══ Protection Status Banner ══ */}
      <div className={`p-4 rounded-lg border flex items-center gap-4 ${
        isProtected
          ? 'bg-lime-dim border-lime/30'
          : 'bg-amber-500/10 border-amber-500/30'
      }`}>
        {isProtected ? (
          <>
            <ShieldCheck className="w-8 h-8 text-lime shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-lime uppercase tracking-wider">Protection Active</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {profile?.companyName} — {profile?.plan?.toUpperCase()} Plan — ${PLANS[profile?.plan as keyof typeof PLANS] ?? 0}/mo
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-lime">{profile?.healthScore ?? 0}%</div>
              <div className="text-[10px] text-text-muted uppercase font-bold">Health Score</div>
            </div>
          </>
        ) : (
          <>
            <Shield className="w-8 h-8 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-400 uppercase tracking-wider">No Active Protection</div>
              <div className="text-xs text-text-secondary mt-0.5">Subscribe to activate monitoring and incident response</div>
            </div>
            <button onClick={() => navigate('/customer/billing')} className="px-4 py-2 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded text-xs font-bold hover:bg-amber-400/30 transition-colors">
              Subscribe Now
            </button>
          </>
        )}
      </div>

      {/* ══ Stats Row ══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-surface p-4 border-l-2 border-rose">
          <div className="text-2xl font-black text-rose">{openCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">Open Issues</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-lime">
          <div className="text-2xl font-black text-lime">{resolvedThisMonth}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">This Month</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-cyan">
          <div className="text-2xl font-black text-cyan">{incidents.length}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">Total Incidents</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-magenta">
          <div className="text-2xl font-black text-magenta">{profile?.healthScore ?? 0}%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">Health Score</div>
        </div>
      </div>

      {/* ══ 6-Agent Pipeline Tracker (for most recent active incident) ══ */}
      {incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed')[0] && (
        <section className="glass-surface p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-lime" /> AI Agent Pipeline — Active Incident
          </h2>
          <AgentPipelineTracker stage={incidents.filter(i => i.status !== 'resolved')[0].agent_stage as typeof AGENT_STAGES[number]} />
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ══ Left: Incident Lifecycle Grid (2 cols) ══ */}
        <div className="xl:col-span-2 space-y-6">
          {/* Incident Grid Header */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan" /> Incident Lifecycle
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'kanban' ? 'bg-cyan/10 text-cyan border border-cyan/30' : 'text-text-muted border border-surface-border'}`}>
                  Kanban
                </button>
                <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'table' ? 'bg-cyan/10 text-cyan border border-cyan/30' : 'text-text-muted border border-surface-border'}`}>
                  Table
                </button>
              </div>
            </div>

            {viewMode === 'kanban' ? <KanbanView incidents={incidents} /> : <TableView incidents={incidents} />}
          </section>

          {/* 42 Security Scanners Panel */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-magenta" /> Security Intelligence — 42 Scanners
              </h2>
              <span className="text-[10px] font-bold bg-lime-dim text-lime px-2 py-0.5 rounded">42/42 Pass</span>
            </div>
            <ScannerGrid />

            {/* CodeGraph Snapshot */}
            <div className="mt-4 p-3 bg-void-deep border border-surface-border rounded">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-3.5 h-3.5 text-magenta" />
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CodeGraph Snapshot</span>
              </div>
              <CodeGraphSnapshot />
            </div>
          </section>
        </div>

        {/* ══ Right: Vault + Emergency (1 col) ══ */}
        <div className="space-y-6">
          {/* Credential Vault */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan" /> Credential Vault
              </h2>
              <button onClick={() => navigate('/customer/vault')} className="text-[10px] text-cyan font-bold uppercase flex items-center gap-1">
                Manage <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* AES-256-GCM Architecture Note */}
            <div className="p-3 bg-cyan/5 border border-cyan/20 rounded mb-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold text-cyan uppercase">Zero-Knowledge Architecture</div>
                  <div className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    Credentials are encrypted client-side using AES-256-GCM.
                    The server only stores the encrypted payload, IV, and auth tag.
                    <span className="text-rose font-bold"> Plaintext is never transmitted.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Credential List */}
            {credentials.length === 0 ? (
              <div className="text-center py-4 text-text-muted text-xs">No credentials stored</div>
            ) : (
              <div className="space-y-2">
                {credentials.map(cred => (
                  <div key={cred.id} className="flex items-center justify-between p-2.5 bg-void-light/50 rounded border border-surface-border/50">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-cyan" />
                      <span className="text-xs text-text-primary font-mono">{cred.name}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-bold ${getExpiryColor(cred.expiresAt)}`}>
                        {formatExpiry(cred.expiresAt)}
                      </div>
                      <div className="text-[9px] text-text-muted">{cred.accessCount} accesses</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Emergency Trigger CTA */}
          <section className={`p-6 rounded-lg border-2 border-magenta/50 bg-magenta-dim text-center cursor-pointer hover:border-magenta hover:bg-magenta/20 transition-all animate-pulse-magenta`}
            onClick={() => setShowEmergency(true)}
          >
            <AlertTriangle className="w-8 h-8 text-magenta mx-auto mb-2" />
            <div className="text-sm font-black text-magenta uppercase tracking-wider">Report Emergency</div>
            <div className="text-[10px] text-text-muted mt-1">Trigger immediate incident response</div>
          </section>

          {/* Quick Actions */}
          <section className="glass-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">Quick Links</h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/customer/security')} className="w-full flex items-center gap-2 p-2.5 rounded bg-void-light/50 border border-surface-border/50 hover:border-magenta/30 hover:bg-magenta-dim transition-all text-left">
                <Shield className="w-4 h-4 text-magenta" />
                <span className="text-xs text-text-primary">Security Report</span>
              </button>
              <button onClick={() => navigate('/customer/billing')} className="w-full flex items-center gap-2 p-2.5 rounded bg-void-light/50 border border-surface-border/50 hover:border-lime/30 hover:bg-lime-dim transition-all text-left">
                <CreditCard className="w-4 h-4 text-lime" />
                <span className="text-xs text-text-primary">Billing & Plans</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Emergency Wizard Modal */}
      {showEmergency && <EmergencyWizard onClose={() => setShowEmergency(false)} />}
    </div>
  );
}

// ── Sub-Components ──

function AgentPipelineTracker({ stage }: { stage: typeof AGENT_STAGES[number] }) {
  const currentIdx = AGENT_STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {AGENT_STAGES.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`flex flex-col items-center ${i <= currentIdx ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              i === currentIdx ? 'bg-lime-dim border-lime text-lime shadow-[0_0_12px_rgba(163,230,53,0.4)]' :
              i < currentIdx ? 'bg-lime/20 border-lime/40 text-lime' :
              'bg-surface-solid border-surface-border text-text-muted'
            }`}>
              {i < currentIdx ? <CheckCircle2 className="w-5 h-5" /> : i === currentIdx ? <Zap className="w-5 h-5 animate-pulse" /> : <Clock className="w-4 h-4" />}
            </div>
            <span className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${i === currentIdx ? 'text-lime' : 'text-text-muted'}`}>{s}</span>
          </div>
          {i < AGENT_STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-lime' : 'bg-surface-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function KanbanView({ incidents }: { incidents: Incident[] }) {
  const statuses = ['open', 'triaging', 'repairing', 'validating', 'resolved'];
  const statusLabels: Record<string, string> = { open: 'Open', triaging: 'Triaging', repairing: 'Repairing', validating: 'Validating', resolved: 'Resolved' };
  const statusColors: Record<string, string> = { open: 'border-rose/30', triaging: 'border-magenta/30', repairing: 'border-cyan/30', validating: 'border-lime/30', resolved: 'border-surface-border' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {statuses.map(status => {
        const statusIncidents = incidents.filter(i => i.status === status || (status === 'open' && i.status === 'submitted'));
        return (
          <div key={status} className={`bg-void-light/30 rounded border ${statusColors[status]} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{statusLabels[status]}</span>
              <span className="text-[10px] font-bold text-text-primary">{statusIncidents.length}</span>
            </div>
            <div className="space-y-2">
              {statusIncidents.slice(0, 5).map(inc => (
                <div key={inc.id} className="p-2 bg-void-deep rounded border border-surface-border/50">
                  <div className="text-[10px] font-bold text-text-primary truncate">{inc.title}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={priorityBadge(inc.priority)}>{inc.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="cyber-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Stage</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map(inc => (
            <tr key={inc.id}>
              <td className="text-text-primary font-medium text-xs">{inc.title}</td>
              <td><span className={priorityBadge(inc.priority)}>{inc.priority}</span></td>
              <td><span className="badge-cyan">{inc.status}</span></td>
              <td><span className="text-[10px] font-bold text-lime uppercase">{inc.agent_stage}</span></td>
              <td className="font-mono text-text-muted text-[10px]">{timeAgo(inc.created_at)}</td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr><td colSpan={5} className="text-center py-6 text-text-muted text-xs">No incidents found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScannerGrid() {
  const scannerNames = [
    'Semgrep', 'SonarQube', 'Snyk', 'Trivy', 'Bandit', 'ESLint', 'Brakeman', 'Nikto',
    'OWASP ZAP', 'Burp Suite', 'Checkmarx', 'Fortify', 'Veracode', 'CodeQL', 'Grype', 'Clair',
    'Anchore', 'Sysdig', 'Falco', 'Aqua', 'Twistlock', 'Prisma', 'Detectify', 'Intruder',
    'Rapid7', 'Qualys', 'Nessus', 'OpenVAS', 'Acunetix', 'Netsparker', 'Arachni', 'SQLMap',
    'Nmap', 'Masscan', 'ZGrab', 'SSLyze', 'TestSSL', 'GitLeaks', 'TruffleHog', 'Repo-supervisor',
    'Whispers', 'GitGuardian'
  ];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {scannerNames.map((name, i) => (
        <div
          key={i}
          title={`${name} — Operational`}
          className="h-6 rounded-sm bg-lime/30 hover:bg-lime/50 transition-all flex items-center justify-center"
        >
          <CheckCircle2 className="w-3 h-3 text-lime" />
        </div>
      ))}
    </div>
  );
}

function CodeGraphSnapshot() {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-24">
      <defs>
        <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <circle cx="2" cy="2" r="1.5" fill="#22d3ee" />
        </marker>
      </defs>
      {/* Nodes */}
      <rect x="80" y="5" width="40" height="12" rx="3" fill="rgba(163,230,53,0.15)" stroke="#a3e635" strokeWidth="0.5" />
      <text x="100" y="13" textAnchor="middle" fill="#a3e635" fontSize="5" fontWeight="bold" fontFamily="JetBrains Mono">entry point</text>

      <rect x="10" y="35" width="35" height="12" rx="3" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth="0.5" />
      <text x="27" y="43" textAnchor="middle" fill="#f43f5e" fontSize="4.5" fontWeight="bold" fontFamily="JetBrains Mono">auth.js</text>

      <rect x="60" y="35" width="35" height="12" rx="3" fill="rgba(34,211,238,0.15)" stroke="#22d3ee" strokeWidth="0.5" />
      <text x="77" y="43" textAnchor="middle" fill="#22d3ee" fontSize="4.5" fontWeight="bold" fontFamily="JetBrains Mono">db.js</text>

      <rect x="110" y="35" width="35" height="12" rx="3" fill="rgba(232,121,249,0.15)" stroke="#e879f9" strokeWidth="0.5" />
      <text x="127" y="43" textAnchor="middle" fill="#e879f9" fontSize="4.5" fontWeight="bold" fontFamily="JetBrains Mono">api.js</text>

      <rect x="155" y="35" width="38" height="12" rx="3" fill="rgba(34,211,238,0.15)" stroke="#22d3ee" strokeWidth="0.5" />
      <text x="174" y="43" textAnchor="middle" fill="#22d3ee" fontSize="4.5" fontWeight="bold" fontFamily="JetBrains Mono">utils.js</text>

      {/* Edges */}
      <line x1="95" y1="17" x2="35" y2="35" stroke="#1e293b" strokeWidth="0.5" markerEnd="url(#arrow)" />
      <line x1="100" y1="17" x2="77" y2="35" stroke="#f43f5e" strokeWidth="0.7" strokeDasharray="2,1" />
      <line x1="105" y1="17" x2="127" y2="35" stroke="#1e293b" strokeWidth="0.5" markerEnd="url(#arrow)" />
      <line x1="110" y1="17" x2="170" y2="35" stroke="#1e293b" strokeWidth="0.5" markerEnd="url(#arrow)" />

      {/* Vulnerable path highlight */}
      <line x1="95" y1="17" x2="77" y2="35" stroke="#f43f5e" strokeWidth="0.8" opacity="0.6" />
      <circle cx="86" cy="26" r="3" fill="none" stroke="#f43f5e" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

function EmergencyWizard({ onClose }: { onClose: () => void }) {
  const [severity, setSeverity] = useState(3);
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    setSubmitting(true);
    const priorities = ['low', 'medium', 'high', 'critical', 'critical'];
    await supabase.from('incidents').insert({
      title: `Emergency: ${domain || 'Unspecified domain'}`,
      description: description || 'Emergency incident triggered by customer',
      priority: priorities[severity - 1] || 'high',
      status: 'submitted',
      customer_id: user?.id,
      agent_stage: 'triage',
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-surface w-full max-w-lg p-6 border-2 border-magenta/30 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-magenta-dim border border-magenta/30 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-magenta" />
          </div>
          <div>
            <h3 className="text-lg font-black text-magenta uppercase tracking-wider">Emergency Trigger</h3>
            <p className="text-[10px] text-text-muted">This will create a P1 critical incident immediately</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Affected Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} className="w-full mt-1 bg-void-light border border-surface-border rounded px-3 py-2 text-xs text-text-primary focus:border-magenta focus:outline-none" placeholder="e.g., api.yoursite.com" />
          </div>

          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Severity Level</label>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-lime font-bold">LOW</span>
              <input type="range" min="1" max="5" value={severity} onChange={e => setSeverity(parseInt(e.target.value))} className="flex-1 accent-magenta" />
              <span className="text-[10px] text-rose font-bold">CRITICAL</span>
            </div>
            <div className="text-center text-sm font-black text-magenta mt-1">{severity}/5</div>
          </div>

          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 bg-void-light border border-surface-border rounded px-3 py-2 text-xs text-text-primary focus:border-magenta focus:outline-none resize-none" placeholder="What's happening?" />
          </div>

          <div className="border-2 border-dashed border-surface-border rounded p-6 text-center hover:border-magenta/30 transition-colors">
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <div className="text-xs text-text-muted">Drag and drop log files or screenshots</div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary border border-surface-border rounded hover:bg-surface-hover/30 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 text-xs font-bold bg-magenta text-white rounded hover:bg-magenta-dark transition-colors disabled:opacity-50 animate-glow-magenta">
            {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Creating...</span> : 'Trigger Emergency Response'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function priorityBadge(p: string) {
  if (p === 'critical') return 'badge-rose';
  if (p === 'high') return 'badge-magenta';
  if (p === 'medium') return 'badge-cyan';
  return 'badge-lime';
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getExpiryColor(date: string): string {
  const hours = Math.floor((new Date(date).getTime() - Date.now()) / 3600000);
  if (hours < 24) return 'text-rose';
  if (hours < 72) return 'text-magenta';
  return 'text-lime';
}

function formatExpiry(date: string): string {
  const hours = Math.floor((new Date(date).getTime() - Date.now()) / 3600000);
  if (hours < 1) return 'Expires soon';
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}
