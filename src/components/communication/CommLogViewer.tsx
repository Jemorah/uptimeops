// ═══════════════════════════════════════════════════════════════
// COMM LOG VIEWER — Email + Dashboard only, no SMS
// Monochrome + lime palette
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, LayoutDashboard, RefreshCw, Clock, Eye, AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react';
import type { CommLogEntry, CommStatus } from './types';

interface CommLogViewerProps {
  logs: CommLogEntry[];
  onRetry: (logId: string) => void;
}

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  dashboard: LayoutDashboard,
};

const statusIcons: Record<string, React.ReactNode> = {
  delivered: <CheckCircle className="w-3 h-3 text-lime" />,
  opened:    <Eye className="w-3 h-3 text-white/40" />,
  failed:    <XCircle className="w-3 h-3 text-white/40" />,
  sent:      <Clock className="w-3 h-3 text-white/30" />,
};

export function CommLogViewer({ logs, onRetry }: CommLogViewerProps) {
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<CommStatus | 'all'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filter out SMS logs from display
  const emailDashboardLogs = logs.filter(l => l.channel !== 'sms');

  const filtered = emailDashboardLogs.filter(l => {
    if (filterChannel !== 'all' && l.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    return true;
  });

  const formatTime = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
            <Mail className="w-4 h-4 text-lime" />
            Communication Log
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-white/20" />
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-1 outline-none">
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="dashboard">Dashboard</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as CommStatus | 'all')} className="bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-1 outline-none">
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="opened">Opened</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {filtered.map(log => {
          const Icon = channelIcons[log.channel] || Mail;
          const isExpanded = expandedLog === log.id;
          const canRetry = log.status === 'failed' && log.retryCount < log.maxRetries;

          return (
            <div key={log.id} className="hover:bg-white/[0.01] transition-colors">
              <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                <Icon className="w-4 h-4 flex-shrink-0 text-white/40" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-white/70 truncate">{log.subject}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border border-white/10 bg-white/5 text-white/40">
                      {log.status}
                    </span>
                    {log.retryCount > 0 && (
                      <span className="text-[9px] text-white/30 font-mono">R{log.retryCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/20">
                    <span>{log.recipient}</span>
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{formatTime(log.sentAt)}</span>
                    {log.incidentId && <span className="font-mono">{log.incidentId}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusIcons[log.status] || null}
                  {canRetry && (
                    <button
                      onClick={e => { e.stopPropagation(); onRetry(log.id); }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      RETRY
                    </button>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pl-12 space-y-2">
                  <div className="text-xs text-white/40 bg-black/20 p-2 border border-white/5">{log.body}</div>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div><span className="text-white/20">Sent:</span> <span className="text-white/40">{formatTime(log.sentAt)}</span></div>
                    <div><span className="text-white/20">Delivered:</span> <span className="text-white/40">{formatTime(log.deliveredAt)}</span></div>
                    <div><span className="text-white/20">Opened:</span> <span className="text-white/40">{formatTime(log.openedAt)}</span></div>
                    <div><span className="text-white/20">Failed:</span> <span className="text-white/40">{formatTime(log.failedAt)} {log.failReason}</span></div>
                  </div>
                  {log.failReason && (
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <AlertTriangle className="w-3 h-3" />
                      {log.failReason} (Attempt {log.retryCount}/{log.maxRetries})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-white/30">No communication logs found.</div>
        )}
      </div>
    </div>
  );
}
