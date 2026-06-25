import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Radio, Zap, Shield, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAgentPipeline } from '@/hooks/useAgentPipeline';
import { AgentPipeline } from '@/components/orchestration/AgentPipeline';
import { AgentLogViewer } from '@/components/orchestration/AgentLogViewer';
import { ConfidenceGauge } from '@/components/orchestration/ConfidenceGauge';
import { TimeoutTimer } from '@/components/orchestration/TimeoutTimer';
import { CostTracker } from '@/components/orchestration/CostTracker';
import { EscalationPanel } from '@/components/orchestration/EscalationPanel';
import type { AgentName } from '@/components/orchestration/types';

export function FixAIProgress() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const {
    incident,
    isSimulating,
    startSimulation,
  } = useAgentPipeline({ autoSimulate: true, simulationSpeed: 3 });

  return (
    <div className="min-h-screen bg-void p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/fix/${ticketId}`}
              className="text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-lime animate-pulse" />
                <span className="text-xs font-mono text-lime uppercase tracking-widest">
                  Live AI Pipeline
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">AI ORCHESTRATION</h1>
              <p className="text-xs text-white/40 font-mono mt-1">
                {ticketId} — {incident?.title.substring(0, 50)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-lime/5 border border-lime/20 px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-lime" />
              <span className="text-xs text-lime font-medium">Zero-Knowledge</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {incident && (
          <>
            {/* Escalation Alerts */}
            <EscalationPanel incident={incident} />

            {/* Main Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Pipeline + Logs */}
              <div className="lg:col-span-2 space-y-6">
                {!isSimulating && (
                  <div className="bg-surface border border-white/5 p-8 text-center">
                    <Zap className="w-10 h-10 text-lime mx-auto mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold mb-2">AI Multi-Agent Pipeline</h3>
                    <p className="text-sm text-white/40 mb-4 max-w-md mx-auto">
                      Watch 6 AI agents work in concert: TRIAGE → ISOLATE → REPAIR → VALIDATE → DEPLOY → AUDIT
                    </p>
                    <button
                      onClick={startSimulation}
                      className="btn-lime text-sm px-6 py-2 rounded-sm"
                    >
                      Start Pipeline Demo
                    </button>
                  </div>
                )}

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

              {/* Right: Metrics */}
              <div className="space-y-6">
                {incident.agents.VALIDATE.confidence !== null && (
                  <ConfidenceGauge score={incident.agents.VALIDATE.confidence} />
                )}
                <TimeoutTimer agents={incident.agents} />
                <CostTracker incident={incident} />

                {/* Security Notice */}
                <div className="bg-surface border border-white/5 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-lime" />
                    Security Status
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Credentials</span>
                      <span className="text-green-500 font-bold">ENCRYPTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">VM Isolation</span>
                      <span className="text-green-500 font-bold">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Audit Trail</span>
                      <span className="text-green-500 font-bold">LOGGING</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Key Location</span>
                      <span className="text-lime font-bold">BROWSER ONLY</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
