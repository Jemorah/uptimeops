// ═══════════════════════════════════════════════════════════════
// HQ INCIDENTS — Full incident management for coordinators/admins
// Real Supabase data, stat cards, filters, expandable detail
// Monochrome + lime palette only
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle, Search, Loader2,
  Filter, RefreshCw,
  Shield, Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Incident {
  id: string;
  title: string;
  status: string;
  priority: string;
  website_url: string;
  customer_id: string;
  created_at: string;
  resolved_at?: string;
  description?: string;
  ai_confidence?: number;
  assigned_engineer?: string;
  pipeline_id?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'text-white/60 border-white/10 bg-white/5' },
  triaging:    { label: 'Triaging',    cls: 'text-white/60 border-white/10 bg-white/5' },
  isolating:   { label: 'Isolating',   cls: 'text-white/60 border-white/10 bg-white/5' },
  repairing:   { label: 'Repairing',   cls: 'text-lime border-lime/20 bg-lime/5' },
  validating:  { label: 'Validating',  cls: 'text-lime border-lime/20 bg-lime/5' },
  deploying:   { label: 'Deploying',   cls: 'text-lime border-lime/20 bg-lime/5' },
  escalated:   { label: 'Escalated',   cls: 'text-white/70 border-white/15 bg-white/5' },
  resolved:    { label: 'Resolved',    cls: 'text-lime border-lime/20 bg-lime/5' },
  closed:      { label: 'Closed',      cls: 'text-white/30 border-white/5 bg-white/[0.02]' },
};

const PRIORITY_LABELS: Record<string, string> = { P1_CRITICAL: 'P1 Critical', P2_HIGH: 'P2 High', P3_MEDIUM: 'P3 Medium', P4_LOW: 'P4 Low' };

export function HQIncidents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Load all incidents
      const { data: incs } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setIncidents(incs || []);

      // Load customers for name mapping
      const { data: custs } = await supabase.from('customers').select('id,company_name,email');
      const custMap: Record<string, string> = {};
      (custs || []).forEach(c => { custMap[c.id] = c.company_name || c.email; });
      setCustomers(custMap);

      setLoading(false);
    }
    load();
    const ch = supabase.channel('hq-incidents').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = incidents.filter(inc => {
    const q = search.toLowerCase();
    const matchSearch = !q || inc.title?.toLowerCase().includes(q) || inc.id?.toLowerCase().includes(q) || inc.website_url?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchPriority = filterPriority === 'all' || inc.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const counts = {
    total: incidents.length,
    open: incidents.filter(i => !['resolved','closed'].includes(i.status)).length,
    critical: incidents.filter(i => i.priority === 'P1_CRITICAL').length,
    resolved24h: incidents.filter(i => i.resolved_at && new Date(i.resolved_at).getTime() > Date.now() - 86400000).length,
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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
          <h2 className="text-2xl font-black tracking-tight">ALL INCIDENTS</h2>
          <p className="text-sm text-white/40 mt-1">Full incident overview across all customers</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: Shield },
          { label: 'Open', value: counts.open, icon: AlertTriangle, alert: counts.open > 0 },
          { label: 'P1 Critical', value: counts.critical, icon: Zap, alert: counts.critical > 0 },
          { label: 'Resolved 24h', value: counts.resolved24h, icon: CheckCircle },
        ].map(s => (
          <button key={s.label} onClick={() => setFilterStatus(s.label === 'Open' ? 'open' : s.label === 'P1 Critical' ? 'all' : 'all')} className={`border rounded-xl p-4 text-left transition-all ${s.alert ? 'border-lime/20 bg-lime/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
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
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 outline-none rounded-lg">
          <option value="all">All Priorities</option>
          <option value="P1_CRITICAL">P1 Critical</option>
          <option value="P2_HIGH">P2 High</option>
          <option value="P3_MEDIUM">P3 Medium</option>
          <option value="P4_LOW">P4 Low</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 outline-none rounded-lg">
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        {(filterStatus !== 'all' || filterPriority !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }} className="text-[11px] text-white/30 hover:text-white/50 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['ID','Customer','Title','Priority','Status','Created','Engineer'].map(h => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 p-4">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(inc => {
                const cfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG.open;
                const isExpanded = expandedId === inc.id;
                return (
                  <>
                    <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : inc.id)}>
                      <td className="p-4 text-xs font-mono text-white/35">{inc.id?.slice(0, 8)}</td>
                      <td className="p-4 text-xs text-white/45">{customers[inc.customer_id] || inc.customer_id?.slice(0, 8)}</td>
                      <td className="p-4 text-sm font-medium max-w-[200px] truncate">{inc.title || 'Untitled'}</td>
                      <td className="p-4"><span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${inc.priority === 'P1_CRITICAL' ? 'border-white/20 text-white/60 bg-white/5' : inc.priority === 'P2_HIGH' ? 'border-white/15 text-white/50' : 'border-white/8 text-white/35'}`}>{PRIORITY_LABELS[inc.priority] || inc.priority}</span></td>
                      <td className="p-4"><span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="p-4 text-xs text-white/35 font-mono">{fmtDate(inc.created_at)}</td>
                      <td className="p-4 text-xs text-white/45">{inc.assigned_engineer || <span className="text-white/20">Unassigned</span>}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${inc.id}-detail`}><td colSpan={7} className="px-4 pb-4 pt-1">
                        <div className="bg-void rounded-lg p-4 border border-white/5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold mb-1">{inc.title}</h4>
                              <p className="text-xs text-white/40">{inc.description || 'No description.'}</p>
                            </div>
                            {inc.ai_confidence && <div className="shrink-0 text-center px-3 py-2 border border-lime/15 rounded-lg bg-lime/[0.03]"><div className="text-lg font-black text-lime">{inc.ai_confidence}%</div><div className="text-[9px] text-white/30 uppercase">AI Confidence</div></div>}
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div><span className="text-white/25">URL:</span> <span className="text-white/50">{inc.website_url}</span></div>
                            <div><span className="text-white/25">Priority:</span> <span className="text-white/50">{PRIORITY_LABELS[inc.priority] || inc.priority}</span></div>
                            <div><span className="text-white/25">Pipeline:</span> <span className="text-white/50">{inc.pipeline_id || 'N/A'}</span></div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => navigate(`/hq/incidents?assign=${inc.id}`)}
                              className="text-[10px] text-lime hover:text-lime/70 uppercase tracking-wider font-bold"
                            >
                              Assign Engineer
                            </button>
                            <button
                              onClick={async () => {
                                const { error } = await supabase.from('human_escalations').insert({
                                  incident_id: inc.id,
                                  reason: 'HQ escalation',
                                  escalated_by: user?.id,
                                });
                                if (!error) toast.info(`Incident ${inc.id.slice(0, 8)} escalated to human engineer.`);
                              }}
                              className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider font-bold"
                            >
                              Escalate
                            </button>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center">
            {incidents.length === 0 ? <><Shield className="w-10 h-10 mx-auto mb-3 text-lime/15" /><p className="text-sm text-white/40">No incidents on record</p></> : <><Filter className="w-8 h-8 mx-auto mb-2 text-white/10" /><p className="text-sm text-white/30">No incidents match filters</p><button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }} className="text-xs text-lime hover:underline mt-2">Clear all filters</button></>}
          </div>
        )}
      </div>
      {filtered.length > 0 && <div className="flex items-center justify-between text-[11px] text-white/25"><span>Showing {filtered.length} of {incidents.length} incidents</span></div>}
    </div>
  );
}
