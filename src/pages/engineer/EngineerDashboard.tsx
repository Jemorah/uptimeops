import { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Shield,
  Terminal, Users, Zap, TrendingUp
} from 'lucide-react';

const mockSessions = [
  { id: 'SES-4821', site: 'acme-corp.com', issue: 'DB timeout', status: 'active', started: '14:20', keystrokes: 342, aiConfidence: 72 },
  { id: 'SES-4820', site: 'shop.beta.co', issue: 'Checkout 500', status: 'active', started: '13:45', keystrokes: 891, aiConfidence: 65 },
  { id: 'SES-4819', site: 'api.startup.io', issue: 'Memory leak', status: 'monitoring', started: '12:10', keystrokes: 1203, aiConfidence: 88 },
];

const onCallSchedule = [
  { day: 'Mon', primary: 'Alex Chen', backup: 'Jordan Smith' },
  { day: 'Tue', primary: 'Alex Chen', backup: 'Jordan Smith' },
  { day: 'Wed', primary: 'Jordan Smith', backup: 'Morgan Lee' },
  { day: 'Thu', primary: 'Jordan Smith', backup: 'Morgan Lee' },
  { day: 'Fri', primary: 'Morgan Lee', backup: 'Alex Chen' },
];

export function EngineerDashboard() {
  const [stats] = useState({
    activeSessions: 3,
    resolvedToday: 12,
    avgResponse: '4.2m',
    escalationRate: '8%',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">ENGINEER DASHBOARD</h2>
        <p className="text-sm text-white/40 mt-1">On-call remote access portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions', value: stats.activeSessions, icon: Terminal, color: 'text-cyan' },
          { label: 'Resolved Today', value: stats.resolvedToday, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Avg Response', value: stats.avgResponse, icon: Clock, color: 'text-lime' },
          { label: 'Escalation Rate', value: stats.escalationRate, icon: TrendingUp, color: 'text-yellow-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-2xl font-black font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Sessions */}
        <div className="lg:col-span-2 bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan" />
              Active Sessions
            </h3>
            <span className="text-xs font-mono text-white/40">{mockSessions.length} active</span>
          </div>
          <div className="divide-y divide-white/5">
            {mockSessions.map((session) => (
              <div key={session.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'active' ? 'bg-cyan animate-pulse' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-mono font-bold">{session.id}</span>
                    <span className="text-sm text-white/60">{session.site}</span>
                  </div>
                  <span className={`text-xs font-bold uppercase ${
                    session.aiConfidence >= 90 ? 'text-green-500' :
                    session.aiConfidence >= 70 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    AI: {session.aiConfidence}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>Issue: {session.issue}</span>
                    <span>Started: {session.started}</span>
                    <span>Keystrokes: {session.keystrokes}</span>
                  </div>
                  <button className="text-xs text-cyan hover:underline">Join Session</button>
                </div>
                {session.aiConfidence < 90 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-yellow-500">
                    <AlertTriangle className="w-3 h-3" />
                    AI confidence below threshold - coordinator approval required before deploy
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* On-Call Schedule */}
        <div className="bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-lime" />
              On-Call This Week
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {onCallSchedule.map((day) => (
              <div key={day.day} className="p-4">
                <div className="text-xs font-bold text-white/40 mb-2">{day.day}</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-lime" />
                  <span className="text-sm">{day.primary}</span>
                  <span className="text-xs text-white/30">(Primary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="text-sm text-white/60">{day.backup}</span>
                  <span className="text-xs text-white/30">(Backup)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button className="bg-surface border border-white/5 p-4 text-left hover:border-lime/30 transition-colors">
          <Shield className="w-5 h-5 text-lime mb-2" />
          <div className="text-sm font-medium">Request Coordinator Approval</div>
          <div className="text-xs text-white/40 mt-1">For AI confidence {'<'} 90%</div>
        </button>
        <button className="bg-surface border border-white/5 p-4 text-left hover:border-cyan/30 transition-colors">
          <Activity className="w-5 h-5 text-cyan mb-2" />
          <div className="text-sm font-medium">Start Remote Session</div>
          <div className="text-xs text-white/40 mt-1">Secure VM access</div>
        </button>
        <button className="bg-surface border border-white/5 p-4 text-left hover:border-magenta/30 transition-colors">
          <Zap className="w-5 h-5 text-magenta mb-2" />
          <div className="text-sm font-medium">Emergency Override</div>
          <div className="text-xs text-white/40 mt-1">Abort current AI pipeline</div>
        </button>
      </div>
    </div>
  );
}
