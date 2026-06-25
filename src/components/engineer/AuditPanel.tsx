// ═══════════════════════════════════════════════════════════════
// COMPLIANCE AUDIT PANEL
// Every keystroke, command, file access logged
// Immutable, customer-accessible
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Terminal, HardDrive, Camera, Clock,
  Search, Download, Shield,
  Keyboard, Eye
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AuditPanelProps {
  incidentId: string;
}

type AuditEntryType = 'keystroke' | 'command' | 'file_access' | 'screenshot' | 'session' | 'credential';

interface AuditEntry {
  id: string;
  timestamp: string;
  type: AuditEntryType;
  actor: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

const MOCK_AUDIT: AuditEntry[] = [
  { id: 'ka-001', timestamp: '14:45:01.234', type: 'keystroke', actor: 'eng_alex', action: 'KEYSTROKE', details: '[ENTER] — executed command', severity: 'info' },
  { id: 'ka-002', timestamp: '14:45:01.245', type: 'command', actor: 'eng_alex', action: 'CMD_EXEC', details: 'ls -la /var/log/nginx/', severity: 'info' },
  { id: 'ka-003', timestamp: '14:45:01.678', type: 'command', actor: 'system', action: 'CMD_OUTPUT', details: 'total 128\ndrwxr-xr-x 2 root root 4096 Jun 25 14:00 .\n-rw-r--r-- 1 root root 892K Jun 25 13:30 access.log', severity: 'info' },
  { id: 'ka-004', timestamp: '14:45:12.001', type: 'keystroke', actor: 'eng_alex', action: 'KEYSTROKE', details: '[CTRL+F] — search in file', severity: 'info' },
  { id: 'ka-005', timestamp: '14:45:15.432', type: 'file_access', actor: 'eng_alex', action: 'FILE_READ', details: '/etc/nginx/nginx.conf — read (2.4KB)', severity: 'info' },
  { id: 'ka-006', timestamp: '14:45:18.789', type: 'keystroke', actor: 'eng_alex', action: 'KEYSTROKE', details: '[TYPED] "max_connections" — search pattern', severity: 'info' },
  { id: 'ka-007', timestamp: '14:45:22.111', type: 'command', actor: 'eng_alex', action: 'CMD_EXEC', details: 'cat config/database.js | grep pool', severity: 'info' },
  { id: 'ka-008', timestamp: '14:45:25.999', type: 'command', actor: 'system', action: 'CMD_OUTPUT', details: 'const pool = new Pool({ host, port, database }); // NO max, NO timeout', severity: 'warning' },
  { id: 'ka-009', timestamp: '14:45:30.456', type: 'session', actor: 'eng_alex', action: 'SESSION_START', details: 'Workspace session initiated for INC-0641', severity: 'info' },
  { id: 'ka-010', timestamp: '14:46:05.123', type: 'credential', actor: 'eng_alex', action: 'CRED_REQUEST', details: 'Requested credential access — push notification sent to customer', severity: 'info' },
  { id: 'ka-011', timestamp: '14:47:12.888', type: 'credential', actor: 'customer_ops', action: 'CRED_APPROVE', details: 'Customer approved credential access request', severity: 'info' },
  { id: 'ka-012', timestamp: '14:47:15.001', type: 'credential', actor: 'system', action: 'CRED_DECRYPT', details: 'Ephemeral key received — credentials decrypted in VM', severity: 'info' },
  { id: 'ka-013', timestamp: '14:48:02.234', type: 'screenshot', actor: 'system', action: 'AUTO_CAPTURE', details: 'Screenshot captured (30s interval) — saved to audit trail', severity: 'info' },
  { id: 'ka-014', timestamp: '14:48:10.567', type: 'file_access', actor: 'eng_alex', action: 'FILE_WRITE', details: 'config/database.js — modified (+4 lines added)', severity: 'warning' },
  { id: 'ka-015', timestamp: '14:48:15.001', type: 'command', actor: 'eng_alex', action: 'CMD_EXEC', details: 'npm test -- db-connection-stress', severity: 'info' },
  { id: 'ka-016', timestamp: '14:48:32.445', type: 'command', actor: 'system', action: 'CMD_OUTPUT', details: '5 tests passed (100%) — Memory: stable, Connections: OK, Failover: OK', severity: 'info' },
  { id: 'ka-017', timestamp: '14:50:01.001', type: 'screenshot', actor: 'system', action: 'AUTO_CAPTURE', details: 'Screenshot captured (30s interval) — saved to audit trail', severity: 'info' },
  { id: 'ka-018', timestamp: '14:52:00.789', type: 'keystroke', actor: 'eng_alex', action: 'KEYSTROKE', details: '[CTRL+S] — saved file in code editor', severity: 'info' },
  { id: 'ka-019', timestamp: '14:55:15.234', type: 'session', actor: 'eng_alex', action: 'FIX_SUBMIT', details: 'Fix submitted for coordinator approval — 5/5 tests passing', severity: 'info' },
];

const TYPE_ICONS: Record<AuditEntryType, React.ElementType> = {
  keystroke: Keyboard,
  command: Terminal,
  file_access: HardDrive,
  screenshot: Camera,
  session: Clock,
  credential: Shield,
};

const TYPE_COLORS: Record<AuditEntryType, string> = {
  keystroke: 'text-white/30',
  command: 'text-cyan',
  file_access: 'text-purple-400',
  screenshot: 'text-orange-400',
  session: 'text-lime',
  credential: 'text-green-400',
};

const TYPE_BG: Record<AuditEntryType, string> = {
  keystroke: 'bg-white/5',
  command: 'bg-cyan/5',
  file_access: 'bg-purple-400/5',
  screenshot: 'bg-orange-400/5',
  session: 'bg-lime/5',
  credential: 'bg-green-400/5',
};

export function AuditPanel({ incidentId }: AuditPanelProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AuditEntryType | 'all'>('all');

  const filtered = MOCK_AUDIT.filter(entry => {
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const typeCounts = MOCK_AUDIT.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {(['keystroke', 'command', 'file_access', 'screenshot', 'session', 'credential'] as AuditEntryType[]).map(type => {
          const Icon = TYPE_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={`p-2 border text-center transition-all ${
                typeFilter === type
                  ? `${TYPE_BG[type]} border-current ${TYPE_COLORS[type]}`
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${typeFilter === type ? '' : 'text-white/20'}`} />
              <span className="text-[9px] font-bold uppercase block">{type.replace('_', ' ')}</span>
              <span className={`text-[10px] font-mono ${typeFilter === type ? 'opacity-80' : 'text-white/30'}`}>
                {typeCounts[type] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-white/20 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit log..."
            className="pl-8 h-8 bg-black border-white/10 text-xs focus:border-lime/30"
          />
        </div>
        {typeFilter !== 'all' && (
          <button
            onClick={() => setTypeFilter('all')}
            className="px-2 py-1.5 text-[9px] font-bold uppercase bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
          >
            Clear
          </button>
        )}
        <button className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Download className="w-3.5 h-3.5 text-white/30" />
        </button>
      </div>

      {/* ── Audit Log Entries ── */}
      <div className="bg-black border border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/[0.01]">
          <Eye className="w-3 h-3 text-white/20" />
          <span className="text-[10px] text-white/40 font-bold uppercase">Audit Trail — {incidentId}</span>
          <span className="text-[9px] text-white/20 font-mono ml-auto">{filtered.length} entries</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
          {filtered.map((entry) => {
            const Icon = TYPE_ICONS[entry.type];
            return (
              <div key={entry.id} className={`flex items-start gap-3 px-3 py-2 hover:bg-white/[0.01] transition-colors ${TYPE_BG[entry.type]}`}>
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${TYPE_COLORS[entry.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-white/30">{entry.timestamp}</span>
                    <span className={`text-[9px] font-bold uppercase px-1 ${
                      entry.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                      entry.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {entry.action}
                    </span>
                    <span className="text-[9px] text-white/20 font-mono">{entry.actor}</span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed font-mono truncate">
                    {entry.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Immutable Notice ── */}
      <div className="p-3 border border-white/5 bg-white/[0.01] flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
        <div className="text-[10px] text-white/30 space-y-1">
          <p className="font-bold text-white/40">Immutable Audit Log</p>
          <p>All entries are cryptographically signed and stored permanently.</p>
          <p>Customer can request a full audit export at any time.</p>
          <p>Tamper detection: SHA-256 chain verified every 60 seconds.</p>
        </div>
      </div>
    </div>
  );
}
