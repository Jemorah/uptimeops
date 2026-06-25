import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Incident {
  id: string;
  title: string;
  status: 'open' | 'resolved' | 'escalated' | 'repairing';
  severity: 'critical' | 'high' | 'medium' | 'low';
  site: string;
  createdAt: string;
  resolvedAt?: string;
  aiConfidence?: number;
}

const mockIncidents: Incident[] = [
  { id: 'INC-0641', title: 'Database connection timeout', status: 'resolved', severity: 'high', site: 'acme-corp.com', createdAt: '2026-06-24 10:15', resolvedAt: '2026-06-24 10:18', aiConfidence: 97 },
  { id: 'INC-0640', title: 'Memory leak in checkout service', status: 'resolved', severity: 'medium', site: 'shop.acme-corp.com', createdAt: '2026-06-23 18:22', resolvedAt: '2026-06-23 18:35', aiConfidence: 94 },
  { id: 'INC-0639', title: 'CSS asset 404 on checkout page', status: 'resolved', severity: 'low', site: 'shop.acme-corp.com', createdAt: '2026-06-22 09:10', resolvedAt: '2026-06-22 09:14', aiConfidence: 99 },
  { id: 'INC-0638', title: 'API rate limit exceeded', status: 'resolved', severity: 'medium', site: 'api.acme-corp.com', createdAt: '2026-06-21 14:30', resolvedAt: '2026-06-21 14:38', aiConfidence: 96 },
  { id: 'INC-0637', title: 'SSL certificate expiry warning', status: 'resolved', severity: 'low', site: 'acme-corp.com', createdAt: '2026-06-20 00:00', resolvedAt: '2026-06-20 00:05', aiConfidence: 100 },
  { id: 'INC-0635', title: 'Load balancer health check failure', status: 'resolved', severity: 'high', site: 'acme-corp.com', createdAt: '2026-06-18 11:45', resolvedAt: '2026-06-18 11:52', aiConfidence: 91 },
];

export function CustomerIncidents() {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = mockIncidents.filter((inc) => {
    const matchesSearch = inc.title.toLowerCase().includes(search.toLowerCase()) || inc.id.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || inc.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityColors = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  const statusIcons = {
    open: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
    escalated: <AlertTriangle className="w-4 h-4 text-red-500" />,
    repairing: <Clock className="w-4 h-4 text-cyan animate-spin" />,
  };

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
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm px-3 py-2 focus:border-lime outline-none"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
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
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Severity</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Status</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">AI Confidence</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((inc) => (
              <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-sm font-mono text-white/60">{inc.id}</td>
                <td className="p-4 text-sm font-medium">{inc.title}</td>
                <td className="p-4 text-sm text-white/60">{inc.site}</td>
                <td className="p-4">
                  <Badge variant="outline" className={`text-xs capitalize ${severityColors[inc.severity]}`}>
                    {inc.severity}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {statusIcons[inc.status]}
                    <span className="text-sm capitalize">{inc.status}</span>
                  </div>
                </td>
                <td className="p-4">
                  {inc.aiConfidence ? (
                    <span className={`text-sm font-mono font-bold ${inc.aiConfidence >= 90 ? 'text-green-500' : inc.aiConfidence >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {inc.aiConfidence}%
                    </span>
                  ) : (
                    <span className="text-sm text-white/30">-</span>
                  )}
                </td>
                <td className="p-4 text-sm text-white/40 font-mono">{inc.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No incidents found matching your filters.</div>
        )}
      </div>
    </div>
  );
}
