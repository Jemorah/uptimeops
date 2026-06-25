import { useState } from 'react';
import { Search, Download, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  targetType: string;
  details: string;
  severity: 'info' | 'warn' | 'critical';
  ipAddress: string;
}

const auditLog: AuditEntry[] = [
  { id: 'AUD-9842', timestamp: '2026-06-25 14:32:15', actor: 'Alex Chen', actorRole: 'engineer', action: 'SESSION_START', target: 'SES-4821', targetType: 'session', details: 'Joined active session for INC-0641', severity: 'info', ipAddress: '10.0.4.12' },
  { id: 'AUD-9841', timestamp: '2026-06-25 14:31:22', actor: 'system', actorRole: 'ai', action: 'ESCALATION', target: 'INC-0641', targetType: 'incident', details: 'AI confidence dropped to 72%, auto-escalated to on-call engineer', severity: 'warn', ipAddress: 'internal' },
  { id: 'AUD-9840', timestamp: '2026-06-25 14:28:45', actor: 'REPAIR-agent', actorRole: 'ai', action: 'REPAIR_ATTEMPT', target: 'checkout.tsx', targetType: 'file', details: 'Applied patch to fix CSS import, build failed with error #4821', severity: 'warn', ipAddress: 'internal' },
  { id: 'AUD-9839', timestamp: '2026-06-25 14:25:10', actor: 'ISOLATE-agent', actorRole: 'ai', action: 'VM_CREATE', target: 'VM-4821', targetType: 'vm', details: 'Spawned isolated VM with 2vCPU/4GB, cloned acme-corp.com', severity: 'info', ipAddress: 'internal' },
  { id: 'AUD-9838', timestamp: '2026-06-25 14:20:00', actor: 'TRIAGE-agent', actorRole: 'ai', action: 'INCIDENT_CREATE', target: 'INC-0641', targetType: 'incident', details: 'Emergency ticket from shop.acme-corp.com, classified as medium severity', severity: 'info', ipAddress: 'internal' },
  { id: 'AUD-9837', timestamp: '2026-06-25 13:45:30', actor: 'Coordinator (system)', actorRole: 'coordinator', action: 'DEPLOY_APPROVE', target: 'SES-4820', targetType: 'session', details: 'Coordinator approved deployment for checkout fix, AI confidence 88%', severity: 'info', ipAddress: '10.0.1.05' },
  { id: 'AUD-9836', timestamp: '2026-06-25 13:44:12', actor: 'VALIDATE-agent', actorRole: 'ai', action: 'VALIDATION_RESULT', target: 'SES-4820', targetType: 'session', details: 'Validation passed 8/10 checks, AI confidence 88%, awaiting approval', severity: 'warn', ipAddress: 'internal' },
  { id: 'AUD-9835', timestamp: '2026-06-25 12:38:05', actor: 'Morgan Lee', actorRole: 'engineer', action: 'SESSION_END', target: 'SES-4819', targetType: 'session', details: 'Session completed, fix deployed successfully, 1203 keystrokes logged', severity: 'info', ipAddress: '10.0.4.15' },
  { id: 'AUD-9834', timestamp: '2026-06-25 12:10:00', actor: 'Morgan Lee', actorRole: 'engineer', action: 'SESSION_START', target: 'SES-4819', targetType: 'session', details: 'Manually escalated from AI pipeline for api.startup.io memory leak', severity: 'info', ipAddress: '10.0.4.15' },
  { id: 'AUD-9833', timestamp: '2026-06-25 11:52:18', actor: 'Jordan Smith', actorRole: 'engineer', action: 'KEYSTROKE_LOG', target: 'VM-4818', targetType: 'vm', details: 'Recorded 567 keystrokes during 17-minute session', severity: 'info', ipAddress: '10.0.4.08' },
];

export function HQAudit() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filtered = auditLog.filter((entry) => {
    const matchesSearch = entry.action.toLowerCase().includes(search.toLowerCase()) ||
      entry.target.toLowerCase().includes(search.toLowerCase()) ||
      entry.actor.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || entry.actorRole === filterRole;
    const matchesSeverity = filterSeverity === 'all' || entry.severity === filterSeverity;
    return matchesSearch && matchesRole && matchesSeverity;
  });

  const severityColors = {
    info: 'text-cyan',
    warn: 'text-yellow-500',
    critical: 'text-red-500',
  };

  const roleColors: Record<string, string> = {
    ai: 'text-cyan',
    engineer: 'text-lime',
    coordinator: 'text-magenta',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">AUDIT LOG</h2>
          <p className="text-sm text-white/40 mt-1">Compliance-grade activity logging</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-white/10 text-sm text-white/60 hover:border-lime hover:text-lime transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-white/10 text-sm text-white/60 hover:border-lime hover:text-lime transition-colors">
            <Shield className="w-4 h-4" />
            Compliance Report
          </button>
        </div>
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
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-surface border border-white/10 text-white text-sm px-3 py-2 focus:border-lime outline-none"
        >
          <option value="all">All Actors</option>
          <option value="ai">AI Agents</option>
          <option value="engineer">Engineers</option>
          <option value="coordinator">Coordinators</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
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
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Role</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Action</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Target</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">Severity</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-white/40 p-4">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-sm font-mono text-white/60">{entry.id}</td>
                <td className="p-4 text-xs font-mono text-white/40">{entry.timestamp}</td>
                <td className="p-4 text-sm">{entry.actor}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold uppercase ${roleColors[entry.actorRole] || 'text-white/40'}`}>
                    {entry.actorRole}
                  </span>
                </td>
                <td className="p-4 text-xs font-bold uppercase">{entry.action}</td>
                <td className="p-4">
                  <div className="text-sm font-mono">{entry.target}</div>
                  <div className="text-xs text-white/40">{entry.details}</div>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-bold uppercase ${severityColors[entry.severity]}`}>
                    {entry.severity}
                  </span>
                </td>
                <td className="p-4 text-xs font-mono text-white/40">{entry.ipAddress}</td>
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
