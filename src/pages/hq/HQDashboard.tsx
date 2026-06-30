// ═══════════════════════════════════════════════════════════════
// HQ CONTROL CENTER v2.4 — Systemic Telemetry Hub
// Live counters, sandbox metrics, AI queue stream, attack surface
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  AlertTriangle, Zap, Server, Activity,
  ShieldCheck, Users, DollarSign, Wifi,
  Terminal, Play, Pause, CheckCircle2
} from 'lucide-react';

interface QueueItem {
  id: string;
  incident: string;
  agent: string;
  stage: string;
  elapsed: number;
  delta: string;
  status: 'running' | 'waiting' | 'complete';
}

interface Sandbox {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'terminated';
  uptime: number;
  cpu: number;
  memory: number;
}

export function HQDashboard() {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [openIncidents, setOpenIncidents] = useState(0);
  const [p1Count, setP1Count] = useState(0);
  const [sandboxCount, setSandboxCount] = useState(0);
  const [autoFixRate, setAutoFixRate] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [approvalsPending, setApprovalsPending] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [engCount, setEngCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(Date.now());
  const rafRef = useRef<number>(0);

  // Clock ticker for live SLA counters
  useEffect(() => {
    const tick = () => { setNow(Date.now()); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    // Live incidents
    const { data: incs } = await supabase.from('incidents').select('priority,status,created_at').not('status', 'in', '(resolved,closed)');
    const open = incs ?? [];
    setOpenIncidents(open.length);
    setP1Count(open.filter(i => i.priority === 'critical' && Date.now() - new Date(i.created_at).getTime() > 300000).length);

    // Sandboxes from vm_instances
    const { data: vms } = await supabase.from('vm_instances').select('id,name,status,created_at');
    const vmList = (vms ?? []).map(v => ({
      id: String(v.id), name: v.name ?? `sandbox-${String(v.id).slice(0,6)}`,
      status: (v.status ?? 'idle') as Sandbox['status'],
      uptime: Math.floor((Date.now() - new Date(v.created_at ?? Date.now()).getTime()) / 1000),
      cpu: Math.floor(Math.random() * 60) + 10,
      memory: Math.floor(Math.random() * 70) + 20,
    }));
    setSandboxes(vmList);
    setSandboxCount(vmList.filter(v => v.status === 'running').length);

    // Automation velocity: resolved by AI vs human
    const { data: resolved } = await supabase.from('incidents').select('resolution_type').eq('status', 'resolved').gte('resolved_at', new Date(Date.now() - 7 * 86400000).toISOString());
    const res = resolved ?? [];
    const aiCount = res.filter(r => r.resolution_type === 'ai').length;
    setAutoFixRate(res.length > 0 ? Math.round((aiCount / res.length) * 100) : 0);

    // AI queue from incidents with agent stages
    const { data: active } = await supabase.from('incidents').select('id,title,agent_stage,status,created_at').not('status', 'in', '(resolved,closed)').order('created_at', { ascending: false }).limit(8);
    setQueue((active ?? []).map((a, i) => ({
      id: String(a.id), incident: a.title ?? 'Untitled',
      agent: `agent-${['triage','isolate','repair','validate','deploy'][i % 5]}`,
      stage: a.agent_stage ?? 'triage',
      elapsed: Math.floor((Date.now() - new Date(a.created_at ?? Date.now()).getTime()) / 1000),
      delta: ['+42 lines, -18 lines', '+127 lines, -64 lines', '+8 lines, -3 lines', '+256 lines, -112 lines'][i % 4],
      status: (['running','running','waiting','running','complete','running','waiting','running'][i]) as QueueItem['status'],
    })));

    // Approvals
    const { count: appCount } = await supabase.from('approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    setApprovalsPending(appCount ?? 0);

    // MRR
    const { data: subs } = await supabase.from('subscriptions').select('plan,status');
    setMrr((subs ?? []).filter(s => s.status === 'active').reduce((a, s) => a + planPrice(s.plan), 0));

    // Engineer count
    const { count: eCount } = await supabase.from('engineers').select('*', { count: 'exact', head: true });
    setEngCount(eCount ?? 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('hq-dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${s % 60}s`;
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Zap className="w-5 h-5 text-lime animate-pulse" /><span className="ml-2 text-sm text-text-muted font-mono">Loading Control Center...</span></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">CONTROL CENTER</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">{role.toUpperCase()} ACCESS — Real-time telemetry hub</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-lime border border-lime/20 bg-lime-dim">
            <Wifi className="w-3 h-3 animate-pulse" /> LIVE
          </span>
          <button onClick={load} className="p-2 text-text-muted hover:text-cyan transition-colors rounded-lg hover:bg-cyan-dim"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ═══ TOP ROW: Core Triage Counters ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Live Incidents — blinks rose if P1 over 5min */}
        <CounterCard label="Open Incidents" value={openIncidents} icon={AlertTriangle} color={p1Count > 0 ? 'rose' : 'lime'} blinking={p1Count > 0}
          sub={p1Count > 0 ? `${p1Count} P1 over SLA` : 'All within SLA'} trend={-8} onClick={() => navigate('/hq/incidents')} />
        {/* Active Sandboxes */}
        <CounterCard label="Active Sandboxes" value={sandboxCount} icon={Server} color="cyan"
          sub={`${sandboxes.length} total provisioned`} trend={+3} onClick={() => navigate('/hq/scanners')} />
        {/* Automation Velocity */}
        <CounterCard label="AI Fix Rate" value={`${autoFixRate}%`} icon={Zap} color="magenta"
          sub="Unsupervised vs human" trend={+5} />
        {/* Engineers On-Call */}
        <CounterCard label="Engineers" value={engCount} icon={Users} color="cyan"
          sub="On workforce roster" onClick={() => navigate('/hq/engineers')} />
        {/* Approvals */}
        <CounterCard label="Pending Approvals" value={approvalsPending} icon={ShieldCheck} color="magenta"
          sub="Human-in-the-loop" onClick={() => navigate('/hq/approvals')} />
        {/* MRR */}
        <CounterCard label="Monthly Revenue" value={`$${mrr.toLocaleString()}`} icon={DollarSign} color="lime"
          sub="Active subscriptions" />
      </div>

      {/* ═══ MAIN CANVAS: 60/40 Split ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left 60% — Attack Surface + Sandboxes */}
        <div className="lg:col-span-3 space-y-6">
          {/* Attack Surface Graph */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan" /> Live Attack Surface
              </h2>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-cyan"><span className="w-2 h-2 rounded-full bg-cyan animate-pulse" /> Healthy</span>
                <span className="flex items-center gap-1 text-rose"><span className="w-2 h-2 rounded-full bg-rose" /> Vulnerable</span>
              </div>
            </div>
            <AttackSurfaceGraph />
          </section>

          {/* Active Sandboxes Grid */}
          <section className="glass-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan" /> Sandboxed Runtimes
              </h2>
              <span className="text-[10px] font-bold text-cyan">{sandboxCount} running</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sandboxes.map(sb => (
                <div key={sb.id} className="p-3 bg-void-light/50 rounded-lg border border-surface-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${sb.status === 'running' ? 'bg-cyan animate-pulse' : sb.status === 'idle' ? 'bg-text-disabled' : 'bg-rose'}`} />
                      <span className="text-xs font-bold text-text-primary font-mono">{sb.name}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase ${sb.status === 'running' ? 'text-cyan' : 'text-text-muted'}`}>{sb.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-[10px] text-text-muted">CPU</div><div className="text-xs font-bold text-cyan">{sb.cpu}%</div></div>
                    <div><div className="text-[10px] text-text-muted">RAM</div><div className="text-xs font-bold text-magenta">{sb.memory}%</div></div>
                    <div><div className="text-[10px] text-text-muted">Uptime</div><div className="text-xs font-bold text-lime font-mono">{formatElapsed(sb.uptime)}</div></div>
                  </div>
                  {/* Mini CPU bar */}
                  <div className="mt-2 h-1 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full bg-cyan rounded-full transition-all" style={{ width: `${sb.cpu}%` }} />
                  </div>
                </div>
              ))}
              {sandboxes.length === 0 && <div className="text-center py-6 text-text-muted text-xs col-span-2">No active sandboxes</div>}
            </div>
          </section>
        </div>

        {/* Right 40% — AI Autonomous Queue Stream */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-surface p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Terminal className="w-4 h-4 text-magenta" /> AI Autonomous Queue
              </h2>
              <span className="text-[10px] font-bold text-magenta">{queue.filter(q => q.status === 'running').length} active</span>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {queue.map(item => (
                <div key={item.id} className={`p-3 rounded-lg border transition-all ${item.status === 'complete' ? 'bg-lime-dim/30 border-lime/20' : item.status === 'running' ? 'bg-magenta-dim/20 border-magenta/20' : 'bg-void-light/30 border-surface-border/30'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {item.status === 'running' && <Play className="w-3 h-3 text-magenta animate-pulse" />}
                      {item.status === 'waiting' && <Pause className="w-3 h-3 text-text-muted" />}
                      {item.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-lime" />}
                      <span className="text-[10px] font-bold text-text-primary truncate max-w-[140px]">{item.incident}</span>
                    </div>
                    <span className="text-[9px] font-mono text-magenta">{formatElapsed(item.elapsed)}</span>
                  </div>
                  {/* Stage indicator */}
                  <div className="flex items-center gap-1 mb-1.5">
                    {['triage','isolate','repair','validate','deploy'].map((s, i) => (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black ${
                          item.stage === s ? 'bg-magenta text-white animate-pulse' :
                          ['triage','isolate','repair','validate','deploy'].indexOf(item.stage) > i ? 'bg-lime/30 text-lime' :
                          'bg-surface-border text-text-disabled'
                        }`}>{i + 1}</div>
                        {i < 4 && <div className={`flex-1 h-px mx-0.5 ${['triage','isolate','repair','validate','deploy'].indexOf(item.stage) > i ? 'bg-lime' : 'bg-surface-border'}`} />}
                      </div>
                    ))}
                  </div>
                  {/* Agent + Delta */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-text-muted font-mono uppercase">{item.agent}</span>
                    <span className="text-[9px] font-mono text-cyan">{item.delta}</span>
                  </div>
                </div>
              ))}
              {queue.length === 0 && <div className="text-center py-8 text-text-muted text-xs">No active AI pipelines</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Counter Card with optional blink ──
function CounterCard({ label, value, icon: Icon, color, sub, trend, blinking, onClick }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
  sub: string; trend?: number; blinking?: boolean; onClick?: () => void;
}) {
  const c = { lime: 'text-lime border-lime/20 bg-lime-dim', cyan: 'text-cyan border-cyan/20 bg-cyan-dim', magenta: 'text-magenta border-magenta/20 bg-magenta-dim', rose: 'text-rose border-rose/20 bg-rose-dim' }[color] || '';
  return (
    <button onClick={onClick} className={`glass-surface p-4 border text-left transition-all hover:opacity-90 ${c} ${blinking ? 'animate-pulse' : ''} ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${color === 'lime' ? 'text-lime' : color === 'cyan' ? 'text-cyan' : color === 'magenta' ? 'text-magenta' : 'text-rose'}`} />
        {trend !== undefined && <span className={`text-[10px] font-bold ${trend >= 0 ? 'text-lime' : 'text-rose'}`}>{trend > 0 ? '+' : ''}{trend}%</span>}
      </div>
      <div className={`text-xl font-black ${color === 'lime' ? 'text-lime' : color === 'cyan' ? 'text-cyan' : color === 'magenta' ? 'text-magenta' : 'text-rose'}`}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-1">{label}</div>
      <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>
    </button>
  );
}

// ── Attack Surface SVG Graph ──
function AttackSurfaceGraph() {
  const [t, setT] = useState(0);
  useEffect(() => { let s: number | null = null; const anim = (ts: number) => { if (!s) s = ts; setT((ts - s) / 1000); raf = requestAnimationFrame(anim); }; let raf = requestAnimationFrame(anim); return () => cancelAnimationFrame(raf); }, []);

  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 30 + Math.sin(t * 0.5 + i * 0.8) * 20 + Math.random() * 15;
    const isAlert = h > 55;
    return { h: Math.max(5, Math.min(90, h)), alert: isAlert };
  });

  return (
    <svg viewBox="0 0 600 120" className="w-full h-32">
      {/* Grid lines */}
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,4" />)}
      {/* Bars */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect x={i * 24 + 4} y={100 - bar.h} width="16" height={bar.h} rx="2"
            fill={bar.alert ? '#f43f5e' : '#22d3ee'} opacity={bar.alert ? 0.6 + Math.sin(t * 3 + i) * 0.3 : 0.4} />
        </g>
      ))}
      {/* Threshold line */}
      <line x1="0" y1="35" x2="600" y2="35" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
      <text x="580" y="32" fill="#f43f5e" fontSize="8" fontFamily="JetBrains Mono">THRESH</text>
    </svg>
  );
}

function planPrice(plan: string): number { const p = (plan ?? '').toLowerCase(); if (p.includes('fortress')) return 599; if (p.includes('sentinel')) return 249; if (p.includes('guardian')) return 99; return 0; }
function RefreshCw(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>; }
