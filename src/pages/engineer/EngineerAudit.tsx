import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AuditEntry {
  id: string;
  timestamp: string;
  engineer: string;
  action: string;
  target: string;
  details: string;
  severity: 'info' | 'warn' | 'critical';
}

const auditLog: AuditEntry[] = [
  { id: 'AUD-9842', timestamp: '2026-06-25 14:32:15', engineer: 'Alex Chen', action: 'SESSION_START', target: 'SES-4821', details: 'Joined active session for INC-0641', severity: 'info' },
  { id: 'AUD-9841', timestamp: '2026-06-25 14:31:22', engineer: 'system', action: 'ESCALATION', target: 'INC-0641', details: 'AI confidence dropped to 72%, auto-escalated', severity: 'warn' },
  { id: 'AUD-9840', timestamp: '2026-06-25 14:28:45', engineer: 'system', action: 'AI_ACTION', target: 'REPAIR', details: 'Applied patch to checkout.tsx, build failed', severity: 'warn' },
  { id: 'AUD-9839', timestamp: '2026-06-25 14:25:10', engineer: 'system', action: 'AI_ACTION', target: 'ISOLATE', details: 'VM-4821 spawned, site cloned', severity: 'info' },
  { id: 'AUD-9838', timestamp: '2026-06-25 14:20:00', engineer: 'system', action: 'TRIAGE', target: 'INC-0641', details: 'Emergency ticket created, classified as medium', severity: 'info' },
  { id: 'AUD-9837', timestamp: '2026-06-25 13:45:30', engineer: 'Jordan Smith', action: 'COORDINATOR_APPROVE', target: 'SES-4820', details: 'Approved deployment for checkout fix', severity: 'info' },
  { id: 'AUD-9836', timestamp: '2026-06-25 13:44:12', engineer: 'system', action: 'ESCALATION', target: 'SES-4820', details: 'AI confidence 65%, awaiting coordinator approval', severity: 'warn' },
  { id: 'AUD-9835', timestamp: '2026-06-25 12:38:05', engineer: 'Morgan Lee', action: 'SESSION_END', target: 'SES-4819', details: 'Session completed, fix deployed successfully', severity: 'info' },
  { id: 'AUD-9834', timestamp: '2026-06-25 12:10:00', engineer: 'Morgan Lee', action: 'SESSION_START', target: 'SES-4819', details: 'Manually escalated from AI pipeline', severity: 'info' },
  { id: 'AUD-9833', timestamp: '2026-06-25 10:22:18', engineer: 'Alex Chen', action: 'DEPLOY', target: 'SES-4818', details: 'CSS fix deployed to production', severity: 'info' },
];

export function EngineerAudit() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = auditLog.filter((entry) => {
    const matchesSearch = entry.action.toLowerCase().includes(search.toLowerCase()) ||
      entry.target.toLowerCase().includes(search.toLowerCase()) ||
      entry.engineer.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || entry.severity === filter;
    return matchesSearch && matchesFilter;
  });

  const severityColors = {
    info: 'text-cyan',
    warn: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">AUDIT TRAIL</h2>
          <p className="text-sm text-white/40 mt-1">Complete log of all actions and decisions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-white/10 text-sm text-white/60 hover:border-lime hover:text-lime transition-colors self-start">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit log..."
            className="pl-10 bg-surface border-white/10 text-white placeholder:text-white/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm px-3 py-2 focus:border-lime outline-none"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="bg-surface border border-white/5 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">ID</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Time</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Actor</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Action</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Target</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-sm font-mono text-white/60">{entry.id}</td>
                <td className="p-4 text-xs font-mono text-white/40">{entry.timestamp}</td>
                <td className="p-4 text-sm">{entry.engineer}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold uppercase ${severityColors[entry.severity]}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="p-4 text-sm font-mono">{entry.target}</td>
                <td className="p-4 text-sm text-white/60">{entry.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">No audit entries found.</div>
        )}
      </div>
    </div>
  );
}
