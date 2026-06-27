import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle, CheckCircle, Clock,
  Search, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Incident {
  id: string;
  title: string;
  status: string;
  priority: string;
  website_url: string;
  created_at: string;
  resolved_at?: string;
  description?: string;
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  open:        { label: 'Open',        icon: <AlertTriangle className="w-3.5 h-3.5 text-white/60" /> },
  repairing:   { label: 'Repairing',   icon: <Clock className="w-3.5 h-3.5 text-lime animate-spin" /> },
  escalated:   { label: 'Escalated',   icon: <AlertTriangle className="w-3.5 h-3.5 text-white/60" /> },
  resolved:    { label: 'Resolved',    icon: <CheckCircle className="w-3.5 h-3.5 text-lime" /> },
  closed:      { label: 'Closed',      icon: <CheckCircle className="w-3.5 h-3.5 text-white/40" /> },
};

const PRIORITY_MAP: Record<string, string> = {
  P1_CRITICAL: 'Critical',
  P2_HIGH: 'High',
  P3_MEDIUM: 'Medium',
  P4_LOW: 'Low',
};

export function CustomerIncidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    async function load() {
      if (!user) return;

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) { setLoading(false); return; }

      const { data: incs } = await supabase
        .from('incidents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      setIncidents(incs || []);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('incidents-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = incidents.filter((inc) => {
    const matchesSearch = !search ||
      inc.title?.toLowerCase().includes(search.toLowerCase()) ||
      inc.id?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-lime animate-spin" />
        <span className="ml-2 text-sm text-white/40">Loading incidents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">INCIDENTS</h2>
        <p className="text-sm text-white/40 mt-1">History of all incidents across your monitored sites</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="pl-10 bg-surface border-white/10 text-white placeholder:text-white/20"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm px-3 py-2 focus:border-lime outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="repairing">Repairing</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Incident Table */}
      <div className="bg-surface border border-white/5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">ID</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Title</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Site</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Priority</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Status</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((inc) => {
              const statusInfo = STATUS_MAP[inc.status] || STATUS_MAP.open;
              return (
                <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-sm font-mono text-white/40">{inc.id?.slice(0, 8)}</td>
                  <td className="p-4 text-sm font-medium">{inc.title || 'Untitled'}</td>
                  <td className="p-4 text-sm text-white/50">{inc.website_url}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-white/60">
                      {PRIORITY_MAP[inc.priority] || inc.priority}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {statusInfo.icon}
                      <span className="text-sm">{statusInfo.label}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-white/40 font-mono">
                    {new Date(inc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">
            {incidents.length === 0 ? 'No incidents yet. That is great news!' : 'No incidents match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
