// ═══════════════════════════════════════════════════════════════
// COMMUNICATION MATRIX — Email + Dashboard only, no SMS
// Monochrome + lime palette
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, MessageSquare, LayoutDashboard, AlertTriangle, Clock, Zap, Filter } from 'lucide-react';
import { COMM_MATRIX } from './types';
import type { CommMatrixRow } from './types';

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  dashboard: LayoutDashboard,
  push: MessageSquare,
};

const priorityStyles: Record<string, string> = {
  critical: 'border-white/20 bg-white/5 text-white/60',
  high:     'border-white/15 bg-white/[0.03] text-white/50',
  medium:   'border-white/10 bg-white/[0.02] text-white/40',
  low:      'border-white/5 bg-transparent text-white/30',
};

export function CommunicationMatrix() {
  const [filter, setFilter] = useState<string>('all');

  // Only show rows that don't include SMS as primary channel
  const noSmsMatrix = COMM_MATRIX.filter(r => !r.channels.includes('sms' as never));

  const filtered = filter === 'all'
    ? noSmsMatrix
    : noSmsMatrix.filter(r => r.channels.includes(filter as never) || r.priority === filter);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
            <Zap className="w-4 h-4 text-lime" />
            Communication Matrix
          </h3>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-white/20 mr-1" />
            {['all', 'email', 'dashboard', 'critical', 'high'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-[10px] font-bold uppercase border transition-colors ${
                  filter === f ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">#</th>
              <th className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">Stage</th>
              <th className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">Channels</th>
              <th className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">Trigger</th>
              <th className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((row) => (
              <MatrixRow key={row.stageKey} row={row} index={noSmsMatrix.indexOf(row) + 1} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/30">No stages match the filter.</div>
        )}
      </div>
    </div>
  );
}

function MatrixRow({ row, index }: { row: CommMatrixRow; index: number }) {
  const [hovered, setHovered] = useState(false);

  // Filter SMS out of displayed channels
  const displayChannels = row.channels.filter((ch: string) => ch !== 'sms');

  return (
    <tr
      className={`transition-colors ${hovered ? 'bg-white/[0.02]' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="p-3 text-white/20 font-mono">{String(index).padStart(2, '0')}</td>
      <td className="p-3">
        <div className="text-white/70 font-medium">{row.stage}</div>
        <div className="text-white/20 text-[10px] mt-0.5">{row.description}</div>
      </td>
      <td className="p-3">
        <div className="flex gap-1.5">
          {displayChannels.map((ch: string) => {
            const Icon = channelIcons[ch] || Mail;
            return (
              <span
                key={ch}
                className="flex items-center gap-1 px-1.5 py-0.5 border border-white/10 text-white/40 text-[10px] font-bold uppercase"
              >
                <Icon className="w-2.5 h-2.5" />
                {ch}
              </span>
            );
          })}
        </div>
      </td>
      <td className="p-3">
        <span className="flex items-center gap-1 text-white/40">
          <Clock className="w-3 h-3 text-white/20" />
          {row.trigger}
        </span>
      </td>
      <td className="p-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border ${priorityStyles[row.priority]}`}>
          {row.priority === 'critical' && <AlertTriangle className="w-2.5 h-2.5" />}
          {row.priority}
        </span>
      </td>
    </tr>
  );
}
