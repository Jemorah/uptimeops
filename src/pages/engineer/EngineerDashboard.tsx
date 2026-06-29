// ═══════════════════════════════════════════════════════════════
// ENGINEER DASHBOARD (Interface B) — On-Call Engineer View
// On-Call Toggle, Incident Queue, Technical Workspace, VM Controller
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  Radio, AlertTriangle, CheckCircle2, Terminal,
  Zap, ChevronRight, Server, Play,
  Square, GitBranch, FileCode, Bug, Lock,
  Loader2, Network
} from 'lucide-react';

// ── Types ──
interface Incident {
  id: string;
  title: string;
  customer_name: string;
  priority: string;
  status: string;
  description: string;
  claimed_by: string | null;
  created_at: string;
  agent_stage: string;
}

interface ClaimedTask {
  id: string;
  incident: Incident;
  startedAt: string;
  vmStatus: 'idle' | 'provisioning' | 'ready' | 'destroyed';
}

interface ScannerFinding {
  id: string;
  scanner: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
}

const AGENT_STAGES = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;

export function EngineerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOnCall, setIsOnCall] = useState(false);
  const [activeTab, setActiveTab] = useState<'claimed' | 'unassigned'>('claimed');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [, setClaimedTasks] = useState<ClaimedTask[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [findings, setFindings] = useState<ScannerFinding[]>([]);
  const [vmStatus, setVmStatus] = useState<'idle' | 'provisioning' | 'ready' | 'destroyed'>('idle');
  const [loading, setLoading] = useState(true);

  // ── Load dashboard data ──
  const loadData = useCallback(async () => {
    setLoading(true);

    // Get current engineer status
    const { data: me } = await supabase
      .from('engineers')
      .select('status')
      .eq('email', user?.email)
      .single();
    setIsOnCall(me?.status === 'on_call');

    // Open incidents
    const { data: incData } = await supabase
      .from('incidents')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(50);

    const incs: Incident[] = (incData ?? []).map(i => ({
      id: String(i.id),
      title: i.title ?? 'Untitled',
      customer_name: i.customer_name ?? 'Unknown',
      priority: i.priority ?? 'medium',
      status: i.status ?? 'open',
      description: i.description ?? '',
      claimed_by: i.claimed_by ?? null,
      created_at: i.created_at ?? new Date().toISOString(),
      agent_stage: i.agent_stage ?? 'triage',
    }));

    setIncidents(incs);

    // Claimed tasks (where claimed_by === user.id)
    const myClaims = incs.filter(i => i.claimed_by === user?.id);
    setClaimedTasks(myClaims.map(i => ({
      id: i.id,
      incident: i,
      startedAt: i.created_at,
      vmStatus: 'idle' as const,
    })));

    // Mock scanner findings for the first claimed incident
    if (myClaims.length > 0) {
      setFindings(generateFindings(myClaims[0].id));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('engineer-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ── Toggle on-call status ──
  const toggleOnCall = async () => {
    const newStatus = isOnCall ? 'active' : 'on_call';
    await supabase.from('engineers').update({ status: newStatus }).eq('email', user?.email);
    setIsOnCall(!isOnCall);
  };

  // ── Claim incident ──
  const claimIncident = async (incidentId: string) => {
    await supabase.from('incidents').update({ claimed_by: user?.id, status: 'triaging' }).eq('id', incidentId);
    await loadData();
  };

  // ── VM Actions ──
  const provisionVM = async () => {
    setVmStatus('provisioning');
    setTimeout(() => setVmStatus('ready'), 2000);
  };
  const destroyVM = () => setVmStatus('destroyed');

  const unassigned = incidents.filter(i => !i.claimed_by);
  const myClaims = incidents.filter(i => i.claimed_by === user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Zap className="w-5 h-5 text-lime animate-pulse" />
        <span className="ml-2 text-sm text-text-muted font-mono">Loading Engineer Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">ENGINEER DASHBOARD</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">Technical workspace — {user?.email}</p>
        </div>
        {/* On-Call Status Toggle */}
        <button
          onClick={toggleOnCall}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
            isOnCall
              ? 'bg-lime-dim text-lime border-lime/30 animate-glow-lime'
              : 'bg-surface-hover/30 text-text-muted border-surface-border hover:border-cyan/30 hover:text-cyan'
          }`}
        >
          <Radio className={`w-4 h-4 ${isOnCall ? 'animate-pulse' : ''}`} />
          {isOnCall ? 'ON CALL' : 'OFF DUTY'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-surface p-4 border-l-2 border-lime">
          <div className="text-2xl font-black text-lime">{myClaims.length}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">My Incidents</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-cyan">
          <div className="text-2xl font-black text-cyan">{unassigned.length}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">Unassigned</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-magenta">
          <div className="text-2xl font-black text-magenta">{findings.filter(f => f.severity === 'critical').length}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">Critical Findings</div>
        </div>
        <div className="glass-surface p-4 border-l-2 border-rose">
          <div className="text-2xl font-black text-rose">{incidents.filter(i => i.priority === 'critical').length}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">P1 Critical</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ══ Left: Incident Queue (2 cols) ══ */}
        <div className="xl:col-span-2 space-y-6">
          {/* Queue Tabs */}
          <section className="glass-surface p-5">
            <div className="flex items-center gap-4 mb-4 border-b border-surface-border">
              <button
                onClick={() => setActiveTab('claimed')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'claimed' ? 'text-lime border-lime' : 'text-text-muted border-transparent hover:text-text-primary'
                }`}
              >
                My Claims ({myClaims.length})
              </button>
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'unassigned' ? 'text-cyan border-cyan' : 'text-text-muted border-transparent hover:text-text-primary'
                }`}
              >
                Unassigned ({unassigned.length})
              </button>
            </div>

            {activeTab === 'claimed' ? (
              myClaims.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs">No claimed incidents. Claim one from the unassigned queue.</div>
              ) : (
                <div className="space-y-3">
                  {myClaims.map(inc => (
                    <ClaimedIncidentCard key={inc.id} incident={inc} onSelect={() => setSelectedIncident(inc)} />
                  ))}
                </div>
              )
            ) : (
              unassigned.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs">All incidents assigned</div>
              ) : (
                <div className="space-y-3">
                  {unassigned.map(inc => (
                    <UnassignedIncidentCard key={inc.id} incident={inc} onClaim={() => claimIncident(inc.id)} />
                  ))}
                </div>
              )
            )}
          </section>

          {/* Technical Workspace (if incident selected) */}
          {selectedIncident && (
            <section className="glass-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan" /> Technical Workspace
                </h2>
                <span className="text-[10px] font-mono text-text-muted">{selectedIncident.customer_name} — {selectedIncident.id.slice(0, 8)}</span>
              </div>

              {/* 6-Agent Pipeline */}
              <AgentPipeline stage={selectedIncident.agent_stage as typeof AGENT_STAGES[number]} />

              {/* Diff & Scanner Annotations */}
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Diff View */}
                <div className="bg-void-deep border border-surface-border rounded p-3 font-mono text-[11px]">
                  <div className="flex items-center gap-2 mb-2 text-text-muted text-[10px]">
                    <GitBranch className="w-3 h-3" /> Automated Repair Diff
                  </div>
                  <div className="space-y-1">
                    <div className="text-rose">- const timeout = 5000; // unsafe</div>
                    <div className="text-lime">+ const timeout = parseInt(process.env.TIMEOUT) || 30000;</div>
                    <div className="text-lime">+ await validateConnection(pool);</div>
                    <div className="text-text-muted"> // AI-generated fix: add env-based config + validation</div>
                  </div>
                </div>

                {/* Scanner Annotations */}
                <div className="space-y-2">
                  {findings.slice(0, 4).map(f => (
                    <div key={f.id} className={`flex items-start gap-2 p-2 rounded border ${
                      f.severity === 'critical' ? 'border-rose/30 bg-rose-dim' :
                      f.severity === 'high' ? 'border-magenta/30 bg-magenta-dim' :
                      'border-cyan/30 bg-cyan-dim'
                    }`}>
                      {f.severity === 'critical' ? <Bug className="w-3 h-3 text-rose mt-0.5 shrink-0" /> :
                       f.severity === 'high' ? <AlertTriangle className="w-3 h-3 text-magenta mt-0.5 shrink-0" /> :
                       <FileCode className="w-3 h-3 text-cyan mt-0.5 shrink-0" />}
                      <div>
                        <div className="text-[10px] font-bold text-text-primary">{f.scanner}: {f.message}</div>
                        <div className="text-[10px] text-text-muted font-mono">{f.file}:{f.line}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ══ Right: VM Controller + CodeGraph ══ */}
        <div className="space-y-6">
          {/* VM Controller */}
          <section className="glass-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan" /> VM Controller
            </h2>
            <div className="flex items-center justify-between mb-4 p-3 bg-void-light/50 rounded border border-surface-border">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  vmStatus === 'ready' ? 'bg-lime animate-pulse' :
                  vmStatus === 'provisioning' ? 'bg-cyan animate-pulse' :
                  vmStatus === 'destroyed' ? 'bg-rose' : 'bg-text-disabled'
                }`} />
                <span className="text-xs font-bold uppercase text-text-primary">{vmStatus}</span>
              </div>
              <span className="text-[10px] text-text-muted font-mono">sandbox-{user?.id?.slice(0, 6) ?? 'xxx'}</span>
            </div>
            <div className="flex gap-2">
              {vmStatus === 'idle' && (
                <button onClick={provisionVM} className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan/10 text-cyan rounded text-xs font-bold hover:bg-cyan/20 transition-colors border border-cyan/30">
                  <Play className="w-3 h-3" /> Provision VM
                </button>
              )}
              {vmStatus === 'provisioning' && (
                <button disabled className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan/10 text-cyan rounded text-xs font-bold border border-cyan/30 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Provisioning...
                </button>
              )}
              {vmStatus === 'ready' && (
                <>
                  <button onClick={() => navigate('/engineer/workspace')} className="flex-1 flex items-center justify-center gap-2 py-2 bg-lime/10 text-lime rounded text-xs font-bold hover:bg-lime/20 transition-colors border border-lime/30">
                    <Terminal className="w-3 h-3" /> Access
                  </button>
                  <button onClick={destroyVM} className="flex items-center justify-center gap-2 py-2 px-3 bg-rose/10 text-rose rounded text-xs font-bold hover:bg-rose/20 transition-colors border border-rose/30">
                    <Square className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            {vmStatus === 'ready' && (
              <div className="mt-3 space-y-1 text-[10px] font-mono text-text-muted">
                <div className="flex justify-between"><span>CPU:</span> <span className="text-lime">2 cores</span></div>
                <div className="flex justify-between"><span>RAM:</span> <span className="text-lime">4 GB</span></div>
                <div className="flex justify-between"><span>Disk:</span> <span className="text-lime">20 GB</span></div>
                <div className="flex justify-between"><span>Uptime:</span> <span className="text-cyan">12m 34s</span></div>
              </div>
            )}
          </section>

          {/* CodeGraph Visualizer */}
          <section className="glass-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-4 flex items-center gap-2">
              <Network className="w-4 h-4 text-magenta" /> CodeGraph
            </h2>
            <CodeGraphMini incidentId={selectedIncident?.id} />
          </section>

          {/* Lint Override Request */}
          <section className="glass-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose" /> Gate Requests
            </h2>
            <button
              onClick={() => navigate('/engineer/audit')}
              className="w-full p-3 bg-rose/5 border border-rose/20 rounded text-left hover:bg-rose/10 transition-colors"
            >
              <div className="text-xs font-bold text-rose">Request Lint Override</div>
              <div className="text-[10px] text-text-muted mt-1">Requires coordinator approval</div>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ──

function AgentPipeline({ stage }: { stage: typeof AGENT_STAGES[number] }) {
  const currentIdx = AGENT_STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {AGENT_STAGES.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`flex flex-col items-center ${i <= currentIdx ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black uppercase border-2 ${
              i === currentIdx ? 'bg-lime-dim border-lime text-lime animate-glow-lime' :
              i < currentIdx ? 'bg-lime/20 border-lime/40 text-lime' :
              'bg-surface-solid border-surface-border text-text-muted'
            }`}>
              {i < currentIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
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

function ClaimedIncidentCard({ incident, onSelect }: { incident: Incident; onSelect: () => void }) {
  return (
    <div className="p-4 bg-void-light/30 border border-surface-border/50 rounded hover:border-lime/30 transition-all cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={priorityBadge(incident.priority)}>{incident.priority}</span>
            <span className="badge-cyan">{incident.status}</span>
          </div>
          <h3 className="text-sm font-bold text-text-primary mt-2">{incident.title}</h3>
          <p className="text-xs text-text-muted mt-1">{incident.customer_name}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-text-muted font-mono">
        <span>Stage: <span className="text-lime uppercase">{incident.agent_stage}</span></span>
        <span>{timeAgo(incident.created_at)}</span>
      </div>
    </div>
  );
}

function UnassignedIncidentCard({ incident, onClaim }: { incident: Incident; onClaim: () => void }) {
  return (
    <div className="p-4 bg-void-light/30 border border-surface-border/50 rounded hover:border-cyan/30 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={priorityBadge(incident.priority)}>{incident.priority}</span>
            <span className="text-[10px] font-mono text-text-muted">{timeAgo(incident.created_at)}</span>
          </div>
          <h3 className="text-sm font-bold text-text-primary mt-2">{incident.title}</h3>
          <p className="text-xs text-text-muted mt-1">{incident.customer_name}</p>
        </div>
        <button
          onClick={onClaim}
          className="px-3 py-1.5 bg-cyan/10 text-cyan border border-cyan/30 rounded text-[10px] font-bold hover:bg-cyan/20 transition-colors"
        >
          Claim
        </button>
      </div>
    </div>
  );
}

function CodeGraphMini({ incidentId }: { incidentId?: string }) {
  if (!incidentId) {
    return <div className="text-center py-8 text-text-muted text-xs">Select an incident to view CodeGraph</div>;
  }

  // Mini AST/Call graph visualization
  const nodes = [
    { id: 'root', label: 'app.js', x: 50, y: 10, color: 'lime' },
    { id: 'db', label: 'db/pool.js', x: 20, y: 40, color: 'rose' },
    { id: 'api', label: 'api/routes.js', x: 50, y: 40, color: 'cyan' },
    { id: 'auth', label: 'middleware/auth.js', x: 80, y: 40, color: 'magenta' },
    { id: 'util', label: 'utils/validator.js', x: 35, y: 70, color: 'lime' },
    { id: 'config', label: 'config/env.js', x: 65, y: 70, color: 'cyan' },
  ];

  return (
    <svg viewBox="0 0 100 90" className="w-full h-40">
      {/* Edges */}
      {nodes.slice(1).map(n => (
        <line key={n.id} x1={nodes[0].x} y1={nodes[0].y + 5} x2={n.x} y2={n.y - 3} stroke="#1e293b" strokeWidth="0.5" />
      ))}
      {/* Nodes */}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x - 12} y={n.y - 4} width="24" height="8" rx="2" fill={`var(--${n.color === 'lime' ? 'lime-dim' : n.color === 'rose' ? 'rose-dim' : n.color === 'cyan' ? 'cyan-dim' : 'magenta-dim'})`} stroke={`var(--${n.color})`} strokeWidth="0.3" opacity="0.8" />
          <text x={n.x} y={n.y + 1.5} textAnchor="middle" fill={`var(--${n.color})`} fontSize="3.5" fontWeight="bold" fontFamily="JetBrains Mono">{n.label}</text>
        </g>
      ))}
      {/* Highlight vulnerable path */}
      <line x1={nodes[0].x} y1={nodes[0].y + 5} x2={nodes[1].x} y2={nodes[1].y - 3} stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="2,1" />
    </svg>
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

function generateFindings(incidentId: string): ScannerFinding[] {
  return [
    { id: `${incidentId}-1`, scanner: 'Semgrep', severity: 'critical', message: 'SQL injection in user input', file: 'src/db/query.js', line: 42 },
    { id: `${incidentId}-2`, scanner: 'SonarQube', severity: 'high', message: 'Hardcoded credential detected', file: 'src/config/env.js', line: 15 },
    { id: `${incidentId}-3`, scanner: 'Bandit', severity: 'medium', message: 'Insecure hash function', file: 'src/auth/password.js', line: 88 },
    { id: `${incidentId}-4`, scanner: 'Trivy', severity: 'high', message: 'CVE-2024-1234 in dependency', file: 'package.json', line: 23 },
  ];
}
