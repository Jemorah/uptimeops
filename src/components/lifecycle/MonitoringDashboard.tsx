// ═══════════════════════════════════════════════════════════════
// MONITORING DASHBOARD — Stage 12: Continuous monitoring
// Uptime, security, performance, auto-fixes, alerts
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Activity, Shield, CheckCircle,
  AlertTriangle, Server, Lock, Gauge, BarChart3
} from 'lucide-react';
import type { MonitoringState, UptimeCheck, MonitoringAlert } from './types';

interface MonitoringDashboardProps {
  monitoring: MonitoringState | null;
}

const MOCK_CHECKS: UptimeCheck[] = [
  { timestamp: '14:00', status: 'up', responseTime: 142, statusCode: 200 },
  { timestamp: '14:01', status: 'up', responseTime: 138, statusCode: 200 },
  { timestamp: '14:02', status: 'up', responseTime: 156, statusCode: 200 },
  { timestamp: '14:03', status: 'up', responseTime: 131, statusCode: 200 },
  { timestamp: '14:04', status: 'up', responseTime: 145, statusCode: 200 },
  { timestamp: '14:05', status: 'slow', responseTime: 2340, statusCode: 200 },
  { timestamp: '14:06', status: 'up', responseTime: 128, statusCode: 200 },
  { timestamp: '14:07', status: 'up', responseTime: 149, statusCode: 200 },
  { timestamp: '14:08', status: 'up', responseTime: 142, statusCode: 200 },
  { timestamp: '14:09', status: 'up', responseTime: 135, statusCode: 200 },
  { timestamp: '14:10', status: 'up', responseTime: 151, statusCode: 200 },
  { timestamp: '14:11', status: 'up', responseTime: 143, statusCode: 200 },
];

const MOCK_ALERTS: MonitoringAlert[] = [
  { id: 'a1', timestamp: '14:05', severity: 'warning', category: 'performance', message: 'Response time spike: 2340ms (normal: ~140ms)', resolved: true, resolvedAt: '14:06' },
  { id: 'a2', timestamp: '13:30', severity: 'info', category: 'ssl', message: 'SSL certificate valid for 42 days', resolved: true, resolvedAt: '13:30' },
  { id: 'a3', timestamp: '12:00', severity: 'info', category: 'backup', message: 'Daily backup completed successfully', resolved: true, resolvedAt: '12:00' },
  { id: 'a4', timestamp: '2024-06-24', severity: 'critical', category: 'uptime', message: 'Site down for 12 minutes (ESC-2049)', resolved: true, resolvedAt: '2024-06-25T14:48:00Z' },
];

export function MonitoringDashboard({ monitoring }: MonitoringDashboardProps) {
  const [activeTab, setActiveTab] = useState<'uptime' | 'security' | 'performance' | 'alerts'>('uptime');

  if (!monitoring) {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-lime" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Monitoring</h3>
        </div>
        <p className="text-xs text-white/40">Continuous monitoring for subscription customers</p>
      </div>
    );
  }

  const avgResponse = MOCK_CHECKS.reduce((s, c) => s + c.responseTime, 0) / MOCK_CHECKS.length;
  const upCount = MOCK_CHECKS.filter(c => c.status === 'up').length;
  const uptime = ((upCount / MOCK_CHECKS.length) * 100).toFixed(2);

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-lime" />
            Continuous Monitoring
          </h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-[10px] text-white/30">Active</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/5">
        <div className="bg-black/20 p-2 text-center">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Uptime</div>
          <div className="text-sm font-black font-mono text-lime">{uptime}%</div>
        </div>
        <div className="bg-black/20 p-2 text-center">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Response</div>
          <div className="text-sm font-black font-mono text-cyan">{Math.round(avgResponse)}ms</div>
        </div>
        <div className="bg-black/20 p-2 text-center">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Auto-fixes</div>
          <div className="text-sm font-black font-mono text-green-400">{monitoring.autoFixesCount}</div>
        </div>
        <div className="bg-black/20 p-2 text-center">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Alerts</div>
          <div className="text-sm font-black font-mono text-yellow-400">{MOCK_ALERTS.filter(a => !a.resolved).length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {([
          { key: 'uptime' as const, label: 'Uptime', icon: Server },
          { key: 'security' as const, label: 'Security', icon: Lock },
          { key: 'performance' as const, label: 'Performance', icon: Gauge },
          { key: 'alerts' as const, label: 'Alerts', icon: AlertTriangle },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-lime text-lime'
                : 'border-transparent text-white/30 hover:text-white/50'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Uptime Tab */}
      {activeTab === 'uptime' && (
        <div className="p-4">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Last 12 checks (60s interval)</div>
          <div className="flex items-end gap-1 h-24 mb-3">
            {MOCK_CHECKS.map((check, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full transition-colors ${
                    check.status === 'up' ? 'bg-lime/30' :
                    check.status === 'slow' ? 'bg-yellow/30' :
                    'bg-red/30'
                  }`}
                  style={{ height: `${Math.max(4, Math.min(80, check.responseTime / 30))}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/20">
            <span>{MOCK_CHECKS[0].timestamp}</span>
            <span>{MOCK_CHECKS[MOCK_CHECKS.length - 1].timestamp}</span>
          </div>
          <div className="mt-3 space-y-1">
            {MOCK_CHECKS.slice(-5).map((check, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  check.status === 'up' ? 'bg-lime' : check.status === 'slow' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className="text-white/40 w-8 font-mono">{check.timestamp}</span>
                <span className="text-white/30">HTTP {check.statusCode}</span>
                <span className={`font-mono ml-auto ${
                  check.responseTime > 1000 ? 'text-yellow-400' : 'text-white/30'
                }`}>
                  {check.responseTime}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green/5 border border-green/10">
            <Shield className="w-4 h-4 text-green-400" />
            <div className="flex-1">
              <div className="text-xs font-bold text-green-400">Last Scan: No Issues</div>
              <div className="text-[10px] text-white/30">Daily security scan — 2024-06-25 02:00 UTC</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Malware scan', status: 'Clean' },
              { label: 'SSL certificate', status: 'Valid (42 days)' },
              { label: 'Outdated plugins', status: '0 critical' },
              { label: 'File integrity', status: 'Verified' },
              { label: 'Firewall rules', status: 'Active' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-2 bg-black/10 text-xs">
                <span className="text-white/40">{item.label}</span>
                <span className="text-lime font-mono">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'TTFB', value: '142ms', score: 95, color: 'text-lime' },
              { label: 'FCP', value: '312ms', score: 90, color: 'text-lime' },
              { label: 'LCP', value: '1.2s', score: 85, color: 'text-yellow-400' },
              { label: 'TTI', value: '2.1s', score: 78, color: 'text-yellow-400' },
            ].map(metric => (
              <div key={metric.label} className="bg-black/20 p-3 text-center">
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{metric.label}</div>
                <div className={`text-sm font-black font-mono ${metric.color}`}>{metric.value}</div>
                <div className="text-[10px] text-white/20">Score: {metric.score}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 bg-cyan/5 border border-cyan/10">
            <BarChart3 className="w-4 h-4 text-cyan" />
            <span className="text-xs text-cyan">Overall Score: 87/100 (Good)</span>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="p-4">
          <div className="space-y-2">
            {MOCK_ALERTS.map(alert => (
              <div key={alert.id} className={`p-3 border ${
                alert.severity === 'critical' ? 'bg-red/5 border-red/10' :
                alert.severity === 'warning' ? 'bg-yellow/5 border-yellow/10' :
                'bg-white/[0.02] border-white/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {alert.severity === 'critical' ? <AlertTriangle className="w-3 h-3 text-red-400" /> :
                   alert.severity === 'warning' ? <AlertTriangle className="w-3 h-3 text-yellow-400" /> :
                   <CheckCircle className="w-3 h-3 text-cyan" />}
                  <span className={`text-[10px] font-bold uppercase ${
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'warning' ? 'text-yellow-400' :
                    'text-cyan'
                  }`}>
                    {alert.category}
                  </span>
                  {alert.resolved && (
                    <span className="text-[10px] text-lime ml-auto flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Resolved
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
