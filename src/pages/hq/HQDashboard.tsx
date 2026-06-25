import { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Users, Zap, TrendingUp, Globe, Radio
} from 'lucide-react';
import { useAgentPipeline } from '@/hooks/useAgentPipeline';
import { AgentPipeline } from '@/components/orchestration/AgentPipeline';
import { AgentLogViewer } from '@/components/orchestration/AgentLogViewer';
import { ConfidenceGauge } from '@/components/orchestration/ConfidenceGauge';
import { TimeoutTimer } from '@/components/orchestration/TimeoutTimer';
import { CostTracker } from '@/components/orchestration/CostTracker';
import { EscalationPanel } from '@/components/orchestration/EscalationPanel';
import { ManualControls } from '@/components/orchestration/ManualControls';
import type { AgentName } from '@/components/orchestration/types';

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
  const {
    incident,
    isSimulating,
    startSimulation,
    escalateAgent,
    pauseAgent,
    resumeAgent,
    triggerRollback,
  } = useAgentPipeline({ autoSimulate: false, simulationSpeed: 2 });

  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">HQ CONTROL CENTER</h2>
          <p className="text-sm text-white/40 mt-1">Coordinator master dashboard — AI orchestration control</p>
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

      {/* ═══════ AI ORCHESTRATION PIPELINE ═══════ */}
      {incident && (
        <>
          {/* Pipeline Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-lime animate-pulse" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-lime">
                  Live Agent Pipeline
                </h3>
                <p className="text-xs text-white/40 font-mono">
                  {incident.id} — {incident.title.substring(0, 60)}...
                </p>
              </div>
            </div>
            {!isSimulating && (
              <button
                onClick={startSimulation}
                className="btn-lime text-xs px-4 py-2 rounded-sm flex items-center gap-2 self-start"
              >
                <Zap className="w-3.5 h-3.5" />
                Start Pipeline Demo
              </button>
            )}
          </div>

          {/* Escalation Alerts */}
          <EscalationPanel incident={incident} />

          {/* Main Pipeline + Sidebar */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Pipeline + Logs */}
            <div className="lg:col-span-2 space-y-6">
              <AgentPipeline
                incident={incident}
                onSelectAgent={(agent) => setSelectedAgent(agent as AgentName)}
                selectedAgent={selectedAgent}
              />
              <AgentLogViewer
                agents={incident.agents}
                selectedAgent={selectedAgent}
              />
            </div>

            {/* Right Column: Controls + Metrics */}
            <div className="space-y-6">
              {/* Confidence Gauge */}
              {incident.agents.VALIDATE.confidence !== null && (
                <ConfidenceGauge score={incident.agents.VALIDATE.confidence} />
              )}

              {/* Timeout Timers */}
              <TimeoutTimer agents={incident.agents} />

              {/* Cost Tracker */}
              <CostTracker incident={incident} />

              {/* Manual Controls */}
              <ManualControls
                incident={incident}
                onEscalate={escalateAgent}
                onPause={pauseAgent}
                onResume={resumeAgent}
                onRollback={triggerRollback}
              />
            </div>
          </div>
        </>
      )}

      {/* Active Incidents Table */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-magenta" />
            Active Incidents
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
                  }`}>{inc.severity}</span>
                </div>
                <span className="text-xs font-mono text-white/40">{inc.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-cyan uppercase">{inc.status}</span>
                  <span className="text-xs text-white/40">Engineer: {inc.engineer}</span>
                </div>
                <span className={`text-xs font-mono font-bold ${
                  inc.aiConfidence >= 90 ? 'text-green-500' :
                  inc.aiConfidence >= 70 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>AI: {inc.aiConfidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineers */}
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
  );
}
