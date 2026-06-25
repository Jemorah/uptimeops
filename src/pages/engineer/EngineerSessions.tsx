import {
  Terminal, Search, CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface Session {
  id: string;
  ticketId: string;
  site: string;
  engineer: string;
  status: 'active' | 'completed' | 'aborted' | 'pending_approval';
  started: string;
  ended?: string;
  keystrokes: number;
  coordinatorApproved: boolean;
}

const sessions: Session[] = [
  { id: 'SES-4821', ticketId: 'INC-0641', site: 'acme-corp.com', engineer: 'Alex Chen', status: 'active', started: '14:20', keystrokes: 342, coordinatorApproved: true },
  { id: 'SES-4820', ticketId: 'INC-0640', site: 'shop.beta.co', engineer: 'Jordan Smith', status: 'active', started: '13:45', keystrokes: 891, coordinatorApproved: false },
  { id: 'SES-4819', ticketId: 'INC-0639', site: 'api.startup.io', engineer: 'Morgan Lee', status: 'completed', started: '12:10', ended: '12:38', keystrokes: 1203, coordinatorApproved: true },
  { id: 'SES-4818', ticketId: 'INC-0638', site: 'blog.news.co', engineer: 'Alex Chen', status: 'completed', started: '10:05', ended: '10:22', keystrokes: 567, coordinatorApproved: true },
  { id: 'SES-4817', ticketId: 'INC-0637', site: 'app.fintech.io', engineer: 'Jordan Smith', status: 'aborted', started: '09:15', ended: '09:20', keystrokes: 45, coordinatorApproved: true },
  { id: 'SES-4816', ticketId: 'INC-0636', site: 'store.retail.com', engineer: 'Morgan Lee', status: 'pending_approval', started: '08:30', keystrokes: 0, coordinatorApproved: false },
];

const statusConfig = {
  active: { icon: Terminal, color: 'text-cyan', bg: 'bg-cyan/10', label: 'Active' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  aborted: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Aborted' },
  pending_approval: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending Approval' },
};

export function EngineerSessions() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = sessions.filter((s) => {
    const matchesSearch = s.site.includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">ACTIVE SESSIONS</h2>
        <p className="text-sm text-white/40 mt-1">Monitor and manage remote engineering sessions</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="pl-10 bg-surface border-white/10 text-white placeholder:text-white/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm px-3 py-2 focus:border-lime outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="completed">Completed</option>
          <option value="aborted">Aborted</option>
        </select>
      </div>

      <div className="bg-surface border border-white/5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Session</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Site</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Engineer</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Status</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Duration</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Keystrokes</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Approved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((s) => {
              const config = statusConfig[s.status];
              return (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-mono font-bold">{s.id}</div>
                    <div className="text-xs text-white/40 font-mono">{s.ticketId}</div>
                  </td>
                  <td className="p-4 text-sm">{s.site}</td>
                  <td className="p-4 text-sm">{s.engineer}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <config.icon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-sm ${config.color}`}>{config.label}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-white/60">
                    {s.started}{s.ended ? ` - ${s.ended}` : ''}
                  </td>
                  <td className="p-4 text-sm font-mono text-white/60">{s.keystrokes.toLocaleString()}</td>
                  <td className="p-4">
                    {s.coordinatorApproved ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No sessions found.</div>
        )}
      </div>
    </div>
  );
}
