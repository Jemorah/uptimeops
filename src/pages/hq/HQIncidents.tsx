// ═══════════════════════════════════════════════════════════════
// ALL INCIDENTS — Triage Worklist Matrix
// Dense table, multi-filter, SLA counter, contextual side drawer
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  AlertTriangle, ChevronDown,
  UserPlus, X, Eye, ChevronLeft, ChevronRight, Terminal
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  stack: string;
  customer_name: string;
  website_url: string;
  claimed_by: string | null;
  claimed_by_name: string | null;
  agent_stage: string;
  created_at: string;
  sla_deadline: string | null;
  resolution_time: number | null;
}

interface Engineer {
  id: string;
  name: string;
  status: string;
  active_incidents: number;
}

export function HQIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [drawerOpen, setDrawerOpen] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  // Filters
  const [fPrio, setFPrio] = useState<Set<string>>(new Set());
  const [fStack, setFStack] = useState<Set<string>>(new Set());
  const [fStatus, setFStatus] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Clock
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: incs } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(200);
    setIncidents((incs ?? []).map(i => ({
      id: String(i.id), title: i.title ?? '', description: i.description ?? '',
      priority: i.priority ?? 'medium', status: i.status ?? 'open', stack: i.stack ?? 'Infrastructure',
      customer_name: i.customer_name ?? 'Unknown', website_url: i.website_url ?? '',
      claimed_by: i.claimed_by ?? null, claimed_by_name: i.claimed_by_name ?? null,
      agent_stage: i.agent_stage ?? 'triage', created_at: i.created_at ?? '',
      sla_deadline: i.sla_deadline ?? null, resolution_time: i.resolution_time ?? null,
    })));
    const { data: engs } = await supabase.from('engineers').select('id,name,status');
    setEngineers((engs ?? []).map(e => ({ id: String(e.id), name: e.name ?? 'Unknown', status: e.status ?? 'offline', active_incidents: 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (set: Set<string>, v: string) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const filtered = incidents.filter(i => {
    if (fPrio.size > 0 && !fPrio.has(i.priority)) return false;
    if (fStack.size > 0 && !fStack.has(i.stack)) return false;
    if (fStatus.size > 0 && !fStatus.has(i.status)) return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleAssign = async (incId: string, engId: string, engName: string) => {
    await supabase.from('incidents').update({ claimed_by: engId, claimed_by_name: engName }).eq('id', incId);
    setAssignOpen(null); load();
  };

  const slaColor = (inc: Incident) => {
    if (!inc.sla_deadline) return 'text-text-muted';
    const remaining = new Date(inc.sla_deadline).getTime() - now;
    if (remaining < 0) return 'text-rose animate-pulse font-bold';
    if (remaining < 300000) return 'text-rose';
    if (remaining < 900000) return 'text-magenta';
    return 'text-lime';
  };

  const formatSla = (inc: Incident) => {
    if (!inc.sla_deadline) return '—';
    const remaining = new Date(inc.sla_deadline).getTime() - now;
    if (remaining < 0) return 'BREACHED';
    const m = Math.floor(remaining / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Zap className="w-5 h-5 text-lime animate-pulse" /><span className="ml-2 text-sm text-text-muted font-mono">Loading Incidents...</span></div>;

  const drawerIncident = incidents.find(i => i.id === drawerOpen);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-rose" /> ALL INCIDENTS</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">{filtered.length} total — {incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length} open</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-surface p-4 space-y-3">
        {/* Severity */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Severity:</span>
          {['critical','high','medium','low'].map(p => (
            <button key={p} onClick={() => setFPrio(toggle(fPrio, p))} className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all ${fPrio.has(p) ? p === 'critical' ? 'bg-rose-dim text-rose border-rose/30' : p === 'high' ? 'bg-magenta-dim text-magenta border-magenta/30' : p === 'medium' ? 'bg-cyan-dim text-cyan border-cyan/30' : 'bg-lime-dim text-lime border-lime/30' : 'bg-void-light text-text-muted border-surface-border'}`}>{p}</button>
          ))}
        </div>
        {/* Stack */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Stack:</span>
          {['Database','Edge Function','SSL/DNS','Auth','Infrastructure','Frontend'].map(s => (
            <button key={s} onClick={() => setFStack(toggle(fStack, s))} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${fStack.has(s) ? 'bg-cyan-dim text-cyan border-cyan/30' : 'bg-void-light text-text-muted border-surface-border'}`}>{s}</button>
          ))}
        </div>
        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Status:</span>
          {['triggered','open','triaging','patching','validating','resolved'].map(s => (
            <button key={s} onClick={() => setFStatus(toggle(fStatus, s))} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${fStatus.has(s) ? 'bg-lime-dim text-lime border-lime/30' : 'bg-void-light text-text-muted border-surface-border'}`}>{s}</button>
          ))}
          {(fPrio.size + fStack.size + fStatus.size > 0) && (
            <button onClick={() => { setFPrio(new Set()); setFStack(new Set()); setFStatus(new Set()); }} className="text-[10px] text-rose font-bold hover:text-rose-light ml-2">Clear All</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead><tr><th>ID</th><th>Incident</th><th>Customer</th><th>Prio</th><th>Stack</th><th>Status</th><th>Assigned</th><th>SLA</th><th>Stage</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(inc => (
                <tr key={inc.id} className="cursor-pointer hover:bg-cyan-dim/10 transition-colors" onClick={() => setDrawerOpen(inc.id)}>
                  <td className="font-mono text-[10px] text-text-muted">{String(inc.id).slice(0, 8)}</td>
                  <td className="text-xs font-semibold text-text-primary">{inc.title}</td>
                  <td className="text-xs text-text-secondary">{inc.customer_name}</td>
                  <td><span className={priorityBadge(inc.priority)}>{inc.priority}</span></td>
                  <td><span className="text-[9px] font-mono text-cyan bg-cyan-dim px-1.5 py-0.5 rounded">{inc.stack}</span></td>
                  <td><span className="badge-cyan">{inc.status}</span></td>
                  <td className="relative">
                    {inc.claimed_by ? <span className="text-xs text-cyan">{inc.claimed_by_name}</span> : (
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setAssignOpen(assignOpen === inc.id ? null : inc.id); }} className="px-2 py-0.5 bg-void-light border border-surface-border rounded text-[9px] font-bold text-text-muted hover:text-lime flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Assign <ChevronDown className="w-2.5 h-2.5" />
                        </button>
                        {assignOpen === inc.id && (
                          <div className="absolute z-30 mt-1 w-56 bg-surface-solid border border-surface-border rounded-lg shadow-xl py-1" onClick={e => e.stopPropagation()}>
                            <div className="px-2 py-1 border-b border-surface-border text-[9px] text-text-muted uppercase font-bold">Select Engineer</div>
                            {engineers.sort((a, b) => (b.status === 'on_call' ? 1 : 0) - (a.status === 'on_call' ? 1 : 0)).map(eng => (
                              <button key={eng.id} onClick={() => handleAssign(inc.id, eng.id, eng.name)} className="w-full text-left px-2 py-1.5 hover:bg-surface-hover/50 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${eng.status === 'on_call' ? 'bg-lime' : 'bg-text-muted'}`} />
                                <span className="text-xs text-text-primary">{eng.name}</span>
                                {eng.status === 'on_call' && <span className="text-[8px] text-lime font-bold ml-auto">ON-CALL</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={`font-mono text-[10px] ${slaColor(inc)}`}>{formatSla(inc)}</td>
                  <td><span className="text-[9px] font-bold text-lime uppercase">{inc.agent_stage}</span></td>
                  <td><Eye className="w-3.5 h-3.5 text-text-muted hover:text-cyan" /></td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-text-muted text-xs">No incidents match filters</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <span className="text-[10px] text-text-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Side Drawer */}
      {drawerIncident && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDrawerOpen(null)} />
          <aside className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-void-deep border-l border-surface-border z-50 p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-text-primary">Incident Detail</h3>
              <button onClick={() => setDrawerOpen(null)} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={priorityBadge(drawerIncident.priority)}>{drawerIncident.priority}</span>
                <span className="badge-cyan">{drawerIncident.status}</span>
                <span className="text-[10px] font-mono text-cyan bg-cyan-dim px-2 py-0.5 rounded">{drawerIncident.stack}</span>
              </div>

              <h4 className="text-xl font-black text-text-primary">{drawerIncident.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{drawerIncident.description || 'No description provided.'}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-void-light rounded border border-surface-border/50">
                  <div className="text-[10px] text-text-muted uppercase font-bold">Customer</div>
                  <div className="text-sm text-text-primary">{drawerIncident.customer_name}</div>
                </div>
                <div className="p-3 bg-void-light rounded border border-surface-border/50">
                  <div className="text-[10px] text-text-muted uppercase font-bold">Target</div>
                  <div className="text-sm text-text-primary font-mono truncate">{drawerIncident.website_url || '—'}</div>
                </div>
                <div className="p-3 bg-void-light rounded border border-surface-border/50">
                  <div className="text-[10px] text-text-muted uppercase font-bold">SLA Remaining</div>
                  <div className={`text-sm font-black font-mono ${slaColor(drawerIncident)}`}>{formatSla(drawerIncident)}</div>
                </div>
                <div className="p-3 bg-void-light rounded border border-surface-border/50">
                  <div className="text-[10px] text-text-muted uppercase font-bold">Assigned</div>
                  <div className="text-sm text-cyan">{drawerIncident.claimed_by_name || 'Unassigned'}</div>
                </div>
              </div>

              {/* Stack trace / logs */}
              <div className="p-3 bg-void-deep rounded border border-surface-border font-mono text-[10px] text-text-muted space-y-1">
                <div className="flex items-center gap-2 mb-2 text-text-secondary font-bold"><Terminal className="w-3 h-3" /> Pipeline Logs</div>
                <div><span className="text-lime">&gt;</span> [{new Date(drawerIncident.created_at).toLocaleTimeString()}] Incident {String(drawerIncident.id).slice(0, 8)} triggered</div>
                <div><span className="text-lime">&gt;</span> Triage agent: classified as {drawerIncident.priority}</div>
                <div><span className="text-lime">&gt;</span> Isolate agent: provisioning sandbox VM</div>
                <div><span className="text-cyan">&gt;</span> Current stage: {drawerIncident.agent_stage}</div>
                {drawerIncident.claimed_by && <div><span className="text-magenta">&gt;</span> Engineer: {drawerIncident.claimed_by_name}</div>}
                <div><span className="text-lime">&gt;</span> 42-scanner matrix: verifying</div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function priorityBadge(p: string) { if (p === 'critical') return 'badge-rose'; if (p === 'high') return 'badge-magenta'; if (p === 'medium') return 'badge-cyan'; return 'badge-lime'; }

// Inline Zap icon
function Zap(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
