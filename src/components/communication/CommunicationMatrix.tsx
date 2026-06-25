// ═══════════════════════════════════════════════════════════════
// COMMUNICATION MATRIX
// Visual 12-stage table: stage, channels, trigger, priority
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, MessageSquare, LayoutDashboard, Smartphone, AlertTriangle, Clock, Zap, Filter } from 'lucide-react';
import { COMM_MATRIX, CHANNEL_COLORS } from './types';
import type { CommMatrixRow } from './types';

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  dashboard: LayoutDashboard,
  push: MessageSquare,
};

const priorityColors = {
  critical: 'text-red-400 bg-red/10 border-red/20',
  high: 'text-orange-400 bg-orange/10 border-orange/20',
  medium: 'text-yellow-400 bg-yellow/10 border-yellow/20',
  low: 'text-white/30 bg-white/5 border-white/10',
};

export function CommunicationMatrix() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? COMM_MATRIX : COMM_MATRIX.filter(r => r.channels.includes(filter as never) || r.priority === filter);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-lime" />
            Communication Matrix
          </h3>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-white/20 mr-1" />
            {['all', 'email', 'sms', 'dashboard', 'critical', 'high'].map(f => (
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
              <MatrixRow key={row.stageKey} row={row} index={COMM_MATRIX.indexOf(row) + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixRow({ row, index }: { row: CommMatrixRow; index: number }) {
  const [hovered, setHovered] = useState(false);

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
          {row.channels.map(ch => {
            const Icon = channelIcons[ch] || Mail;
            return (
              <span
                key={ch}
                className="flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold uppercase"
                style={{ color: CHANNEL_COLORS[ch], borderColor: `${CHANNEL_COLORS[ch]}30`, backgroundColor: `${CHANNEL_COLORS[ch]}10` }}
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border ${priorityColors[row.priority]}`}>
          {row.priority === 'critical' && <AlertTriangle className="w-2.5 h-2.5" />}
          {row.priority}
        </span>
      </td>
    </tr>
  );
}
