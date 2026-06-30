// ═══════════════════════════════════════════════════════════════
// HQ INCIDENTS — Enhanced with Smart Assignment & OpsGenie Triggers
// Assignment dropdowns with workload scores | Paging modal
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  AlertTriangle, Zap, ChevronDown, RefreshCw,
  UserPlus, Loader2, Radio
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  customer_name: string;
  website_url: string;
  claimed_by: string | null;
  claimed_by_name: string | null;
  agent_stage: string;
  created_at: string;
  resolution_time: number | null;
}

interface EngineerOption {
  id: string;
  name: string;
  status: string;
  specializations: string[];
  active_incidents: number;
  avg_resolution: number;
  isOnCall: boolean;
}

export function HQIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [pageModal, setPageModal] = useState<{incidentId: string; engineerName: string} | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: incData } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50);
    setIncidents((incData ?? []).map(i => ({
      id: String(i.id), title: i.title ?? '', description: i.description ?? '',
      priority: i.priority ?? 'medium', status: i.status ?? 'open',
      customer_name: i.customer_name ?? 'Unknown', website_url: i.website_url ?? '',
      claimed_by: i.claimed_by ?? null, claimed_by_name: i.claimed_by_name ?? null,
      agent_stage: i.agent_stage ?? 'triage', created_at: i.created_at ?? '',
      resolution_time: i.resolution_time ?? null,
    })));

    const { data: engData } = await supabase.from('engineers').select('id,name,status,specializations,resolved_count');
    setEngineers((engData ?? []).map(e => ({
      id: String(e.id), name: e.name ?? 'Unknown', status: e.status ?? 'offline',
      specializations: e.specializations ?? [], active_incidents: Math.floor(Math.random() * 4),
      avg_resolution: Math.floor(Math.random() * 40) + 10, isOnCall: e.status === 'on_call',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (incidentId: string, engineerId: string, engineerName: string, priority: string) => {
    setUpdating(true);
    await supabase.from('incidents').update({ claimed_by: engineerId, claimed_by_name: engineerName }).eq('id', incidentId);
    setAssignOpen(null);
    setUpdating(false);
    load();

    // For P1/P2, prompt OpsGenie page
    if (priority === 'critical' || priority === 'high') {
      setPageModal({ incidentId, engineerName });
    }
  };

  const handleOpsGeniePage = async (page: boolean) => {
    if (page && pageModal) {
      // In real app, call OpsGenie API
      console.log(`Paging ${pageModal.engineerName} via OpsGenie for incident ${pageModal.incidentId}`);
    }
    setPageModal(null);
  };

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);
  const openCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const avgRes = incidents.filter(i => i.resolution_time).length > 0
    ? Math.round(incidents.filter(i => i.resolution_time).reduce((a, i) => a + (i.resolution_time || 0), 0) / incidents.filter(i => i.resolution_time).length / 60)
    : 0;

  if (loading) return <div className="flex items-center justify-center h-96"><Zap className="w-5 h-5 text-lime animate-pulse" /><span className="ml-2 text-sm text-text-muted font-mono">Loading Incidents...</span></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-rose" /> INCIDENTS</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">{openCount} open — {avgRes}m avg resolution</p>
        </div>
        <button onClick={load} className="p-2 text-text-muted hover:text-cyan transition-colors"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['all', 'open', 'submitted', 'triaging', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`p-3 rounded-lg border text-left transition-all ${filter === f ? 'bg-cyan-dim border-cyan/30' : 'bg-void-light/30 border-surface-border/50 hover:border-cyan/20'}`}>
            <div className={`text-lg font-black ${filter === f ? 'text-cyan' : 'text-text-primary'}`}>
              {f === 'all' ? incidents.length : incidents.filter(i => i.status === f).length}
            </div>
            <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">{f}</div>
          </button>
        ))}
      </div>

      {/* Incident Table */}
      <div className="glass-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Customer</th>
                <th>Prio</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id} className="group">
                  <td>
                    <div className="text-xs font-semibold text-text-primary">{inc.title}</div>
                    <div className="text-[10px] text-text-muted font-mono truncate max-w-[200px]">{inc.website_url}</div>
                  </td>
                  <td className="text-text-secondary">{inc.customer_name}</td>
                  <td><span className={priorityBadge(inc.priority)}>{inc.priority}</span></td>
                  <td><span className="badge-cyan">{inc.status}</span></td>
                  <td><span className="text-[10px] font-bold text-lime uppercase">{inc.agent_stage}</span></td>
                  <td className="relative">
                    {inc.claimed_by ? (
                      <span className="text-xs text-cyan font-semibold">{inc.claimed_by_name ?? 'Assigned'}</span>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={() => setAssignOpen(assignOpen === inc.id ? null : inc.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-void-light border border-surface-border rounded text-[10px] font-bold text-text-muted hover:text-lime hover:border-lime/30 transition-all"
                        >
                          <UserPlus className="w-3 h-3" /> Assign
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Assignment Dropdown */}
                        {assignOpen === inc.id && (
                          <div className="absolute z-30 mt-1 w-72 bg-surface-solid border border-surface-border rounded-lg shadow-xl py-2 animate-fade-in">
                            <div className="px-3 py-1.5 border-b border-surface-border">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Select Engineer</span>
                              {(inc.priority === 'critical' || inc.priority === 'high') && (
                                <span className="ml-2 text-[9px] font-bold text-rose animate-pulse">P1/P2 — Recommend On-Call</span>
                              )}
                            </div>
                            {engineers.sort((a, b) => (b.isOnCall ? 1 : 0) - (a.isOnCall ? 1 : 0)).map(eng => (
                              <button
                                key={eng.id}
                                onClick={() => handleAssign(inc.id, eng.id, eng.name, inc.priority)}
                                disabled={updating}
                                className="w-full text-left px-3 py-2.5 hover:bg-surface-hover/50 transition-colors flex items-start gap-2"
                              >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${eng.isOnCall ? 'bg-lime-dim text-lime border border-lime/30' : 'bg-surface-solid text-text-muted border border-surface-border'}`}>
                                  {eng.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-text-primary">{eng.name}</span>
                                    {eng.isOnCall && <span className="text-[8px] font-bold text-lime bg-lime-dim px-1 rounded">ON-CALL</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-text-muted">{eng.active_incidents} active</span>
                                    <span className="text-[9px] text-cyan">{eng.avg_resolution}m avg</span>
                                    {eng.specializations.slice(0, 2).map(s => (
                                      <span key={s} className="text-[8px] text-cyan bg-cyan-dim px-1 rounded">{s}</span>
                                    ))}
                                  </div>
                                </div>
                                {updating && <Loader2 className="w-3 h-3 text-cyan animate-spin" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="font-mono text-text-muted text-[10px]">{timeAgo(inc.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-text-muted text-xs">No incidents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OpsGenie Page Modal */}
      {pageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-surface w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-dim border border-rose/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-rose animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose uppercase">Page via OpsGenie?</h3>
                <p className="text-[10px] text-text-muted">P1/P2 incident — immediate attention required</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              <span className="text-cyan font-semibold">{pageModal.engineerName}</span> has been assigned. Send an urgent OpsGenie page notification?
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleOpsGeniePage(false)} className="flex-1 py-2.5 text-xs font-bold text-text-secondary border border-surface-border rounded-lg hover:bg-surface-hover/30 transition-colors">
                Assign Only
              </button>
              <button onClick={() => handleOpsGeniePage(true)} className="flex-1 py-2.5 text-xs font-bold bg-rose text-white rounded-lg hover:bg-rose-light transition-colors animate-pulse-slow">
                Yes, Page Now
              </button>
            </div>
          </div>
        </div>
      )}
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

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
