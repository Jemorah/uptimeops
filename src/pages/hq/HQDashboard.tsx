import {
  BarChart3, Activity, AlertTriangle, CheckCircle, Clock,
  Users, Zap, TrendingUp, Globe
} from 'lucide-react';

const systemMetrics = {
  aiPipelinesRunning: 12,
  avgResolutionTime: '1.2m',
  totalSitesProtected: 12400,
  incidentsToday: 47,
  autoResolved: 41,
  escalated: 6,
  engineerUtilization: '78%',
  aiConfidence: '94.2%',
};

const activeIncidents = [
  { id: 'INC-0641', site: 'acme-corp.com', severity: 'high', status: 'repairing', aiConfidence: 72, engineer: 'Alex Chen', time: '14:32' },
  { id: 'INC-0640', site: 'shop.beta.co', severity: 'medium', status: 'validating', aiConfidence: 88, engineer: 'Jordan Smith', time: '13:45' },
  { id: 'INC-0639', site: 'api.startup.io', severity: 'low', status: 'deploying', aiConfidence: 96, engineer: 'Morgan Lee', time: '12:10' },
];

const engineerStatus = [
  { name: 'Alex Chen', status: 'active', session: 'SES-4821', resolved: 5 },
  { name: 'Jordan Smith', status: 'active', session: 'SES-4820', resolved: 3 },
  { name: 'Morgan Lee', status: 'active', session: 'SES-4819', resolved: 4 },
  { name: 'Sam Rivera', status: 'available', session: null, resolved: 0 },
  { name: 'Taylor Park', status: 'offline', session: null, resolved: 0 },
];

export function HQDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">HQ CONTROL CENTER</h2>
          <p className="text-sm text-white/40 mt-1">Coordinator master dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="text-xs font-mono text-lime uppercase">Live</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'AI Pipelines', value: systemMetrics.aiPipelinesRunning, icon: Activity, color: 'text-cyan' },
          { label: 'Incidents Today', value: systemMetrics.incidentsToday, icon: AlertTriangle, color: 'text-yellow-500' },
          { label: 'Auto-Resolved', value: systemMetrics.autoResolved, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Escalated', value: systemMetrics.escalated, icon: TrendingUp, color: 'text-magenta' },
          { label: 'Sites Protected', value: systemMetrics.totalSitesProtected.toLocaleString(), icon: Globe, color: 'text-lime' },
          { label: 'Avg Resolution', value: systemMetrics.avgResolutionTime, icon: Clock, color: 'text-cyan' },
          { label: 'AI Confidence', value: systemMetrics.aiConfidence, icon: Zap, color: 'text-lime' },
          { label: 'Eng. Utilization', value: systemMetrics.engineerUtilization, icon: Users, color: 'text-yellow-500' },
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
        {/* Active Incidents */}
        <div className="lg:col-span-2 bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-magenta" />
              Active Incidents Requiring Attention
            </h3>
            <span className="text-xs font-mono text-white/40">{activeIncidents.length} active</span>
          </div>
          <div className="divide-y divide-white/5">
            {activeIncidents.map((inc) => (
              <div key={inc.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold">{inc.id}</span>
                    <span className="text-sm">{inc.site}</span>
                    <span className={`text-xs font-bold uppercase ${
                      inc.severity === 'critical' ? 'text-red-500' :
                      inc.severity === 'high' ? 'text-orange-500' :
                      'text-yellow-500'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/40">{inc.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-cyan uppercase">{inc.status}</span>
                    <span className="text-xs text-white/40">Engineer: {inc.engineer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">AI Confidence</span>
                    <span className={`text-xs font-mono font-bold ${
                      inc.aiConfidence >= 90 ? 'text-green-500' :
                      inc.aiConfidence >= 70 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {inc.aiConfidence}%
                    </span>
                  </div>
                </div>
                {inc.aiConfidence < 90 && (
                  <div className="mt-2 flex items-center gap-2">
                    <button className="text-xs px-3 py-1 bg-lime/10 text-lime border border-lime/30 hover:bg-lime/20 transition-colors">
                      Approve Deploy
                    </button>
                    <button className="text-xs px-3 py-1 bg-magenta/10 text-magenta border border-magenta/30 hover:bg-magenta/20 transition-colors">
                      Abort & Escalate
                    </button>
                    <button className="text-xs px-3 py-1 bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 transition-colors">
                      Request Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Engineer Status */}
        <div className="bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-lime" />
              Engineers
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {engineerStatus.map((eng) => (
              <div key={eng.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    eng.status === 'active' ? 'bg-cyan animate-pulse' :
                    eng.status === 'available' ? 'bg-green-500' :
                    'bg-white/20'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">{eng.name}</div>
                    <div className="text-xs text-white/40 capitalize">{eng.status}</div>
                  </div>
                </div>
                <div className="text-right">
                  {eng.session && <div className="text-xs font-mono text-cyan">{eng.session}</div>}
                  <div className="text-xs text-white/40">{eng.resolved} today</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="bg-surface border border-white/5 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-6">
          <BarChart3 className="w-4 h-4 text-lime" />
          AI Pipeline Status (24h)
        </h3>
        <div className="grid grid-cols-6 gap-4">
          {['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'].map((agent, i) => (
            <div key={agent} className="text-center">
              <div className="text-xs font-bold text-white/40 mb-2">{agent}</div>
              <div className="h-24 bg-elevated relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all"
                  style={{
                    height: `${[100, 98, 95, 92, 90, 100][i]}%`,
                    backgroundColor: ['#d1ff00', '#00f0ff', '#d1ff00', '#00f0ff', '#d1ff00', '#00f0ff'][i],
                    opacity: 0.3,
                  }}
                />
              </div>
              <div className="text-xs font-mono mt-1 text-lime">
                {[47, 46, 44, 43, 42, 47][i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
