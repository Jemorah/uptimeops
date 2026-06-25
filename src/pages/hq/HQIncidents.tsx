import { useState } from 'react';
import {
  CheckCircle, Clock, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Incident {
  id: string;
  site: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  aiConfidence: number;
  engineer: string | null;
  coordinatorApproved: boolean;
  created: string;
  resolved?: string;
}

const incidents: Incident[] = [
  { id: 'INC-0641', site: 'acme-corp.com', severity: 'high', status: 'repairing', aiConfidence: 72, engineer: 'Alex Chen', coordinatorApproved: false, created: '14:32' },
  { id: 'INC-0640', site: 'shop.beta.co', severity: 'medium', status: 'validating', aiConfidence: 88, engineer: 'Jordan Smith', coordinatorApproved: true, created: '13:45' },
  { id: 'INC-0639', site: 'api.startup.io', severity: 'low', status: 'deploying', aiConfidence: 96, engineer: 'Morgan Lee', coordinatorApproved: true, created: '12:10' },
  { id: 'INC-0638', site: 'blog.news.co', severity: 'medium', status: 'resolved', aiConfidence: 94, engineer: 'Alex Chen', coordinatorApproved: true, created: '10:05', resolved: '10:22' },
  { id: 'INC-0637', site: 'app.fintech.io', severity: 'critical', status: 'resolved', aiConfidence: 91, engineer: 'Jordan Smith', coordinatorApproved: true, created: '09:15', resolved: '09:28' },
  { id: 'INC-0636', site: 'store.retail.com', severity: 'low', status: 'resolved', aiConfidence: 99, engineer: null, coordinatorApproved: false, created: '08:30', resolved: '08:33' },
];

export function HQIncidents() {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = incidents.filter((inc) => {
    const matchesSearch = inc.site.includes(search.toLowerCase()) || inc.id.toLowerCase().includes(search.toLowerCase());
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">ALL INCIDENTS</h2>
        <p className="text-sm text-white/40 mt-1">Full incident overview and management</p>
      </div>

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
          <option value="triaging">Triaging</option>
          <option value="isolating">Isolating</option>
          <option value="repairing">Repairing</option>
          <option value="validating">Validating</option>
          <option value="deploying">Deploying</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      <div className="bg-surface border border-white/5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">ID</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Site</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Severity</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Status</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">AI Conf.</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Engineer</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Approved</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((inc) => (
              <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-sm font-mono font-bold">{inc.id}</td>
                <td className="p-4 text-sm">{inc.site}</td>
                <td className="p-4">
                  <Badge variant="outline" className={`text-xs capitalize ${severityColors[inc.severity]}`}>
                    {inc.severity}
                  </Badge>
                </td>
                <td className="p-4">
                  <span className="text-xs font-bold uppercase text-cyan">{inc.status}</span>
                </td>
                <td className="p-4">
                  <span className={`text-sm font-mono font-bold ${
                    inc.aiConfidence >= 90 ? 'text-green-500' :
                    inc.aiConfidence >= 70 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {inc.aiConfidence}%
                  </span>
                </td>
                <td className="p-4 text-sm">{inc.engineer || <span className="text-white/30">AI Only</span>}</td>
                <td className="p-4">
                  {inc.coordinatorApproved ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                </td>
                <td className="p-4">
                  {!inc.coordinatorApproved && inc.status !== 'resolved' && (
                    <div className="flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-lime/10 text-lime border border-lime/30 hover:bg-lime/20 transition-colors">
                        Approve
                      </button>
                      <button className="text-xs px-2 py-1 bg-magenta/10 text-magenta border border-magenta/30 hover:bg-magenta/20 transition-colors">
                        Abort
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No incidents found.</div>
        )}
      </div>
    </div>
  );
}
