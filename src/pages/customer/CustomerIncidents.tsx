// ═══════════════════════════════════════════════════════════════
// CUSTOMER INCIDENTS — Enhanced: stat cards, priority/status
// filters, sorting, detail preview, action buttons
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle, Clock, Search, Loader2,
  Filter, ArrowUpDown, Shield, Wrench, XCircle, RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Incident {
  id: string;
  title: string;
  status: string;
  priority: string;
  website_url: string;
  created_at: string;
  resolved_at?: string;
  description?: string;
  ai_confidence?: number;
}

type SortField = 'created_at' | 'priority' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  open:        { label: 'Open',        icon: AlertTriangle, cls: 'text-white/60 border-white/10 bg-white/5' },
  repairing:   { label: 'Repairing',   icon: Wrench,        cls: 'text-lime border-lime/20 bg-lime/5' },
  escalated:   { label: 'Escalated',   icon: AlertTriangle, cls: 'text-white/70 border-white/15 bg-white/5' },
  resolved:    { label: 'Resolved',    icon: CheckCircle,   cls: 'text-lime border-lime/20 bg-lime/5' },
  closed:      { label: 'Closed',      icon: XCircle,       cls: 'text-white/30 border-white/5 bg-white/[0.02]' },
};

const PRIORITY_ORDER: Record<string, number> = { P1_CRITICAL: 4, P2_HIGH: 3, P3_MEDIUM: 2, P4_LOW: 1 };
const PRIORITY_LABELS: Record<string, string> = { P1_CRITICAL: 'P1 Critical', P2_HIGH: 'P2 High', P3_MEDIUM: 'P3 Medium', P4_LOW: 'P4 Low' };

export function CustomerIncidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!customer) { setLoading(false); return; }
      const { data: incs } = await supabase.from('incidents').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false });
      setIncidents(incs || []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel('incidents-enhanced').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    const matchSearch = !q || inc.title?.toLowerCase().includes(q) || inc.id?.toLowerCase().includes(q) || inc.website_url?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchPriority = filterPriority === 'all' || inc.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  }).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'created_at') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortField === 'priority') return dir * ((PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0));
    return dir * a.status.localeCompare(b.status);
  });

  const counts = {
    all: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    repairing: incidents.filter(i => i.status === 'repairing').length,
    resolved: incidents.filter(i => ['resolved','closed'].includes(i.status)).length,
    escalated: incidents.filter(i => i.status === 'escalated').length,
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading incidents...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">INCIDENTS</h2>
          <p className="text-sm text-white/40 mt-1">Track and manage all infrastructure issues</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'Total', value: counts.all, icon: Shield },
          { key: 'open', label: 'Open', value: counts.open, icon: AlertTriangle, alert: counts.open > 0 },
          { key: 'repairing', label: 'Repairing', value: counts.repairing, icon: Wrench },
          { key: 'resolved', label: 'Resolved', value: counts.resolved, icon: CheckCircle },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key === 'all' ? 'all' : s.key)}
            className={`border rounded-xl p-4 text-left transition-all ${
              (s.key === 'all' && filterStatus === 'all') || filterStatus === s.key
                ? 'border-lime/20 bg-lime/[0.02]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.alert ? 'text-lime' : 'text-white/30'}`} />
              <span className="text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-2xl font-black">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." className="pl-10 bg-surface border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div className="flex gap-2">
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 focus:border-lime/30 outline-none rounded-lg">
            <option value="all">All Priorities</option>
            <option value="P1_CRITICAL">P1 Critical</option>
            <option value="P2_HIGH">P2 High</option>
            <option value="P3_MEDIUM">P3 Medium</option>
            <option value="P4_LOW">P4 Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 focus:border-lime/30 outline-none rounded-lg">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="repairing">Repairing</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        {(filterStatus !== 'all' || filterPriority !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }} className="text-[11px] text-white/30 hover:text-white/50 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  { label: 'ID', field: null },
                  { label: 'Title', field: null },
                  { label: 'Site', field: null },
                  { label: 'Priority', field: 'priority' as SortField },
                  { label: 'Status', field: 'status' as SortField },
                  { label: 'Date', field: 'created_at' as SortField },
                ].map(col => (
                  <th key={col.label} className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 p-4">
                    {col.field ? (
                      <button onClick={() => toggleSort(col.field!)} className="flex items-center gap-1 hover:text-white/50 transition-colors">
                        {col.label}
                        {sortField === col.field && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(inc => {
                const cfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG.open;
                const Icon = cfg.icon;
                const isExpanded = expandedId === inc.id;
                return (
                  <>
                    <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : inc.id)}>
                      <td className="p-4 text-xs font-mono text-white/35">{inc.id?.slice(0, 8)}</td>
                      <td className="p-4 text-sm font-medium max-w-[200px] truncate">{inc.title || 'Untitled'}</td>
                      <td className="p-4 text-xs text-white/45">{inc.website_url}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          inc.priority === 'P1_CRITICAL' ? 'border-white/20 text-white/60 bg-white/5' :
                          inc.priority === 'P2_HIGH' ? 'border-white/15 text-white/50 bg-white/[0.03]' :
                          'border-white/8 text-white/35'
                        }`}>{PRIORITY_LABELS[inc.priority] || inc.priority}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-white/35 font-mono">{fmtDate(inc.created_at)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${inc.id}-detail`}>
                        <td colSpan={6} className="px-4 pb-4 pt-1">
                          <div className="bg-void rounded-lg p-4 border border-white/5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <h4 className="text-sm font-bold mb-1">{inc.title}</h4>
                                <p className="text-xs text-white/40">{inc.description || 'No description provided.'}</p>
                              </div>
                              {inc.ai_confidence && (
                                <div className="shrink-0 text-center px-3 py-2 border border-lime/15 rounded-lg bg-lime/[0.03]">
                                  <div className="text-lg font-black text-lime">{inc.ai_confidence}%</div>
                                  <div className="text-[9px] text-white/30 uppercase tracking-wider">AI Confidence</div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                              <div><span className="text-white/25">Created:</span> <span className="text-white/50">{fmtDate(inc.created_at)} {fmtTime(inc.created_at)}</span></div>
                              <div><span className="text-white/25">URL:</span> <span className="text-white/50">{inc.website_url}</span></div>
                              <div><span className="text-white/25">Priority:</span> <span className="text-white/50">{PRIORITY_LABELS[inc.priority] || inc.priority}</span></div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/customer/incidents?id=${inc.id}`)}
                                className="text-[10px] text-white/30 hover:text-lime uppercase tracking-wider font-bold transition-colors"
                              >
                                View Full Details
                              </button>
                              {inc.status === 'open' && (
                                <button
                                  onClick={async () => {
                                    const { error } = await supabase.from('human_escalations').insert({
                                      incident_id: inc.id,
                                      reason: 'Customer escalation from portal',
                                      escalated_by: user?.id,
                                    });
                                    if (!error) toast.success('A human engineer will review your incident.');
                                  }}
                                  className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-wider font-bold transition-colors"
                                >
                                  Escalate
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center">
            {incidents.length === 0 ? (
              <>
                <Shield className="w-10 h-10 mx-auto mb-3 text-lime/15" />
                <p className="text-sm text-white/40 font-medium">No incidents on record</p>
                <p className="text-xs text-white/25 mt-1">Your infrastructure is running smoothly</p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 mx-auto mb-2 text-white/10" />
                <p className="text-sm text-white/30">No incidents match your filters</p>
                <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }} className="text-xs text-lime hover:underline mt-2">Clear all filters</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-white/25">
          <span>Showing {filtered.length} of {incidents.length} incidents</span>
          <span className="font-mono">{filterStatus !== 'all' || filterPriority !== 'all' ? 'Filtered' : 'All'}</span>
        </div>
      )}
    </div>
  );
}
