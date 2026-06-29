// ═══════════════════════════════════════════════════════════════
// HQ AUDIT — Compliance-grade audit log from Supabase
// CSV export, search, filters, monochrome + lime
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  created_at: string;
  actor_id: string;
  actor_type: string;
  action: string;
  target_id: string;
  target_type: string;
  details: Record<string, unknown>;
  ip_address: string;
  severity: string;
}

export function HQAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      setEntries(data || []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel('hq-audit').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.action?.toLowerCase().includes(q) || e.target_id?.toLowerCase().includes(q) || e.actor_id?.toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || e.actor_type === filterRole;
    const matchSeverity = filterSeverity === 'all' || e.severity === filterSeverity;
    return matchSearch && matchRole && matchSeverity;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Actor Type', 'Action', 'Target', 'Target Type', 'Severity', 'IP', 'Details'];
    const rows = filtered.map(e => [
      e.id, e.created_at, e.actor_id, e.actor_type, e.action, e.target_id, e.target_type, e.severity, e.ip_address || '', JSON.stringify(e.details || {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uptimeops-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} audit entries to CSV`);
  };

  const severityCls = (s: string) => s === 'critical' ? 'text-white/60' : s === 'warn' ? 'text-white/50' : 'text-white/35';
  const roleCls = (r: string) => r === 'ai' ? 'text-white/50' : r === 'engineer' ? 'text-lime' : r === 'coordinator' ? 'text-white/60' : 'text-white/40';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading audit log...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">AUDIT LOG</h2>
          <p className="text-sm text-white/40 mt-1">Compliance-grade activity logging — {entries.length} entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-white/10 text-xs text-white/60 hover:border-lime hover:text-lime transition-colors font-bold uppercase tracking-wider">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit log..." className="pl-10 bg-surface border-white/10 text-white placeholder:text-white/20" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 outline-none rounded-lg">
          <option value="all">All Actors</option>
          <option value="ai">AI Agents</option>
          <option value="engineer">Engineers</option>
          <option value="coordinator">Coordinators</option>
          <option value="customer">Customers</option>
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="bg-surface border border-white/10 text-white/60 text-xs px-3 py-2 outline-none rounded-lg">
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="border border-white/10 rounded-xl bg-white/[0.02] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['ID', 'Time', 'Actor', 'Role', 'Action', 'Target', 'Severity', 'IP'].map(h => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 p-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-xs font-mono text-white/45">{String(e.id ?? '').slice(0, 8)}</td>
                <td className="p-4 text-xs font-mono text-white/35">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-4 text-xs text-white/50">{String(e.actor_id ?? '').slice(0, 12)}</td>
                <td className="p-4"><span className={`text-xs font-bold uppercase ${roleCls(e.actor_type)}`}>{e.actor_type}</span></td>
                <td className="p-4 text-xs font-bold uppercase text-white/60">{e.action}</td>
                <td className="p-4"><div className="text-xs font-mono text-white/45">{e.target_id}</div></td>
                <td className="p-4"><span className={`text-xs font-bold uppercase ${severityCls(e.severity)}`}>{e.severity}</span></td>
                <td className="p-4 text-xs font-mono text-white/25">{e.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-white/30">No audit entries found.</div>}
      </div>
    </div>
  );
}
