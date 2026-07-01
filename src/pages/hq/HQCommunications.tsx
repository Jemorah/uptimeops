// ═══════════════════════════════════════════════════════════════════════════════
// HQ COMMS CENTER v2.5 — Communications Matrix
// Metrics dashboard, channel matrix, notification log, realtime alert feed
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  MessageSquare, Mail, CheckCircle2, XCircle, Eye,
  Radio, AlertTriangle, Clock, Shield,
  Smartphone, Bell, Activity
} from 'lucide-react';

// ── Communication Matrix Data ──
const COMMS_MATRIX = [
  { stage: 'Incident Submitted', email: true, dashboard: true, sms: false, push: false },
  { stage: 'Triage Complete', email: true, dashboard: true, sms: false, push: true },
  { stage: 'Repair Started', email: true, dashboard: true, sms: true, push: true },
  { stage: 'Awaiting Approval', email: true, dashboard: true, sms: false, push: true },
  { stage: 'Fix Deployed', email: true, dashboard: true, sms: true, push: true },
  { stage: 'Resolved', email: true, dashboard: true, sms: false, push: false },
  { stage: 'Escalation', email: true, dashboard: true, sms: true, push: true },
  { stage: 'Billing Alert', email: true, dashboard: true, sms: false, push: false },
  { stage: 'Security Warning', email: true, dashboard: true, sms: true, push: true },
  { stage: 'Credential Expiry', email: true, dashboard: true, sms: false, push: true },
];

// ── Notification Log ──
const NOTIFICATION_LOG = [
  { id: 'NL-2847', channel: 'email', recipient: 'customer@techflow.io', subject: 'Incident INC-2024-001847: Fix Deployed', status: 'delivered', opened: true, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'NL-2846', channel: 'email', recipient: 'admin@uptimeops.io', subject: 'P1 Escalation: SSL Certificate Expiry', status: 'delivered', opened: true, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'NL-2845', channel: 'sms', recipient: '+1-555-0199', subject: 'CRITICAL: Site down — 502 errors', status: 'failed', opened: false, timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 'NL-2844', channel: 'push', recipient: 'dashboard', subject: 'Scanner Alert: 3 findings detected', status: 'delivered', opened: false, timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: 'NL-2843', channel: 'email', recipient: 'customer@datavault.io', subject: 'Monthly Security Report Available', status: 'delivered', opened: false, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'NL-2842', channel: 'email', recipient: 'engineer@uptimeops.io', subject: 'On-Call Shift Reminder (Tomorrow)', status: 'delivered', opened: true, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'NL-2841', channel: 'push', recipient: 'dashboard', subject: 'Approval Required: APR-2847-a', status: 'delivered', opened: true, timestamp: new Date(Date.now() - 7200000).toISOString() },
];

// ── Realtime Alert Feed ──
const ALERT_FEED = [
  { id: 'AF-001', severity: 'critical', message: 'OpsGenie alert paged: Alex Chen (P1 escalation INC-001847)', source: 'opsgenie', timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 'AF-002', severity: 'warn', message: 'Email delivery delayed: SMTP rate limit (TechFlow domain)', source: 'email', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'AF-003', severity: 'info', message: 'Push notification sent: 42 customers (deployment batch)', source: 'push', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'AF-004', severity: 'critical', message: 'SMS gateway timeout: Twilio API 504 (retrying)', source: 'sms', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: 'AF-005', severity: 'info', message: 'Communication digest: 247 emails sent in last hour', source: 'system', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

const CHANNEL_CONFIG: Record<string, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: '#22d3ee' },
  sms: { icon: Smartphone, color: '#e879f9' },
  push: { icon: Bell, color: '#fbbf24' },
  dashboard: { icon: Shield, color: '#a3e635' },
};

const STATUS_ICON = {
  delivered: <CheckCircle2 className="w-3 h-3 text-lime" />,
  failed: <XCircle className="w-3 h-3 text-magenta" />,
  pending: <Clock className="w-3 h-3 text-amber" />,
};

export function HQCommunications() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'log' | 'alerts'>('matrix');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Stats
  const todayCount = NOTIFICATION_LOG.filter(n => (Date.now() - new Date(n.timestamp).getTime()) < 86400000).length;
  const deliveredCount = NOTIFICATION_LOG.filter(n => n.status === 'delivered').length;
  const failedCount = NOTIFICATION_LOG.filter(n => n.status === 'failed').length;
  const openedCount = NOTIFICATION_LOG.filter(n => n.opened).length;

  const filteredLog = channelFilter === 'all' ? NOTIFICATION_LOG : NOTIFICATION_LOG.filter(n => n.channel === channelFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-lime" /> Communications Matrix
        </h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-lime bg-lime/10 px-2 py-1 rounded border border-lime/20">
            <Radio className="w-3 h-3 animate-pulse" /> LIVE
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Messages Today', value: todayCount, icon: MessageSquare, color: '#22d3ee' },
          { label: 'Delivered', value: deliveredCount, icon: CheckCircle2, color: '#a3e635' },
          { label: 'Failed', value: failedCount, icon: XCircle, color: '#f43f5e' },
          { label: 'Opened', value: openedCount, icon: Eye, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} className="bg-elevated/60 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-2xl font-black text-white">{s.value}</span>
            </div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
        {(['matrix', 'log', 'alerts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
            {tab === 'matrix' ? 'Channel Matrix' : tab === 'log' ? 'Notification Log' : 'Realtime Alerts'}
          </button>
        ))}
      </div>

      {/* ── TAB: Channel Matrix ── */}
      {activeTab === 'matrix' && (
        <div className="bg-elevated/60 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {['Pipeline Stage', 'Email', 'Dashboard', 'SMS', 'Push'].map(h => (
                  <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-white/30 p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMMS_MATRIX.map(row => (
                <tr key={row.stage} className="hover:bg-white/[0.02] transition-all">
                  <td className="p-3 text-[11px] font-bold text-white/60">{row.stage}</td>
                  {(['email', 'dashboard', 'sms', 'push'] as const).map(ch => {
                    const cfg = CHANNEL_CONFIG[ch];
                    const Icon = cfg.icon;
                    const active = row[ch as keyof typeof row] as boolean;
                    return (
                      <td key={ch} className="p-3">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? '' : 'bg-white/5'}`} style={active ? { backgroundColor: `${cfg.color}15` } : {}}>
                          <Icon className="w-3 h-3" style={{ color: active ? cfg.color : 'rgba(255,255,255,0.1)' }} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: Notification Log ── */}
      {activeTab === 'log' && (
        <div className="space-y-3">
          {/* Channel Filter */}
          <div className="flex gap-2">
            <button onClick={() => setChannelFilter('all')} className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${channelFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>All</button>
            {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={key} onClick={() => setChannelFilter(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${channelFilter === key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
                  <Icon className="w-3 h-3" style={{ color: cfg.color }} /> {key}
                </button>
              );
            })}
          </div>

          <div className="bg-elevated/60 border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {['ID', 'Channel', 'Recipient', 'Subject', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-white/25 p-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLog.map(n => {
                  const ch = CHANNEL_CONFIG[n.channel];
                  const Icon = ch.icon;
                  return (
                    <tr key={n.id} className="hover:bg-white/[0.02] transition-all">
                      <td className="p-3 text-[9px] font-mono text-white/25">{n.id}</td>
                      <td className="p-3"><Icon className="w-3.5 h-3.5" style={{ color: ch.color }} /></td>
                      <td className="p-3 text-[10px] text-white/40 font-mono">{n.recipient}</td>
                      <td className="p-3 text-[10px] text-white/50">{n.subject}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[n.status as keyof typeof STATUS_ICON]}
                          <span className={`text-[9px] font-bold uppercase ${n.status === 'delivered' ? 'text-lime' : n.status === 'failed' ? 'text-magenta' : 'text-amber'}`}>{n.status}</span>
                        </div>
                      </td>
                      <td className="p-3 text-[9px] text-white/20 font-mono">{new Date(n.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Realtime Alerts ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {ALERT_FEED.map(alert => {
            const sevColor = alert.severity === 'critical' ? '#f43f5e' : alert.severity === 'warn' ? '#fbbf24' : '#22d3ee';
            const SevIcon = alert.severity === 'critical' ? AlertTriangle : Activity;
            return (
              <div key={alert.id} className="bg-elevated/60 border border-white/5 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sevColor}15` }}>
                  <SevIcon className="w-4 h-4" style={{ color: sevColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono text-white/25">{alert.id}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sevColor}15`, color: sevColor }}>{alert.severity}</span>
                    <span className="text-[8px] font-mono text-white/20 uppercase">{alert.source}</span>
                  </div>
                  <p className="text-[11px] text-white/60">{alert.message}</p>
                  <span className="text-[8px] text-white/15">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
