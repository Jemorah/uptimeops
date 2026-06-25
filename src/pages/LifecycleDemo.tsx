// ═══════════════════════════════════════════════════════════════
// LIFECYCLE DEMO PAGE
// Full 12-stage incident lifecycle with state machine,
// all components integrated, auto-simulation mode
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Play, RotateCcw, Zap, Activity, ChevronDown, ChevronUp,
  
  ShieldCheck, Rocket, CheckCircle, FileText, Mail
} from 'lucide-react';
import { useIncidentLifecycle } from '@/hooks/useIncidentLifecycle';
import { LifecycleTimeline } from '@/components/lifecycle/LifecycleTimeline';
import { StatusTracker } from '@/components/lifecycle/StatusTracker';
import { CoordinatorGate } from '@/components/lifecycle/CoordinatorGate';
import { DeploymentTracker } from '@/components/lifecycle/DeploymentTracker';
import { CustomerVerificationPanel } from '@/components/lifecycle/CustomerVerification';
import { AuditReportPanel } from '@/components/lifecycle/AuditReport';
import { FollowUpSystem } from '@/components/lifecycle/FollowUpSystem';
import { MonitoringDashboard } from '@/components/lifecycle/MonitoringDashboard';
import { AutomationTriggers } from '@/components/lifecycle/AutomationTriggers';
import { LIFECYCLE_STAGE_CONFIG, STAGE_ORDER } from '@/components/lifecycle/types';

type ActivePanel =
  | 'timeline'
  | 'coordinator'
  | 'deployment'
  | 'verification'
  | 'audit'
  | 'followup'
  | 'monitoring'
  | 'automation';

const PANEL_TABS: { key: ActivePanel; label: string; icon: React.ElementType; stage?: number }[] = [
  { key: 'timeline',    label: 'Timeline',    icon: Activity },
  { key: 'coordinator', label: 'Coordinator', icon: ShieldCheck, stage: 7 },
  { key: 'deployment',  label: 'Deploy',      icon: Rocket, stage: 8 },
  { key: 'verification',label: 'Verify',      icon: CheckCircle, stage: 9 },
  { key: 'audit',       label: 'Audit',       icon: FileText, stage: 10 },
  { key: 'followup',    label: 'Follow-up',   icon: Mail, stage: 11 },
  { key: 'monitoring',  label: 'Monitor',     icon: Activity, stage: 12 },
  { key: 'automation',  label: 'Automation',  icon: Zap },
];

export function LifecycleDemo() {
  const lifecycle = useIncidentLifecycle();
  const [activePanel, setActivePanel] = useState<ActivePanel>('timeline');
  const [showHistory, setShowHistory] = useState(true);

  const currentStageNum = STAGE_ORDER.indexOf(lifecycle.lifecycle.currentStage) + 1;

  const renderPanel = () => {
    switch (activePanel) {
      case 'timeline':
        return (
          <div className="space-y-6">
            <LifecycleTimeline lifecycle={lifecycle.lifecycle} />
            {showHistory && <StatusTracker lifecycle={lifecycle.lifecycle} />}
          </div>
        );
      case 'coordinator':
        return (
          <CoordinatorGate
            lifecycle={lifecycle.lifecycle}
            onApprove={lifecycle.coordinatorApprove}
            onReject={lifecycle.coordinatorReject}
          />
        );
      case 'deployment':
        return (
          <DeploymentTracker
            deployment={lifecycle.lifecycle.deploymentState}
            onDeploy={lifecycle.startDeployment}
            onRollback={() => {}}
            onSmokeTestComplete={lifecycle.completeDeployment}
          />
        );
      case 'verification':
        return (
          <CustomerVerificationPanel
            verification={lifecycle.lifecycle.customerVerification}
            onRequestVerify={lifecycle.requestCustomerVerification}
            onResponse={lifecycle.customerVerifyResponse}
          />
        );
      case 'audit':
        return <AuditReportPanel report={lifecycle.lifecycle.auditReport} />;
      case 'followup':
        return (
          <FollowUpSystem
            emails={lifecycle.lifecycle.followUpEmails}
            serviceType={lifecycle.lifecycle.serviceSelection?.type || null}
          />
        );
      case 'monitoring':
        return <MonitoringDashboard monitoring={lifecycle.lifecycle.monitoringState} />;
      case 'automation':
        return <AutomationTriggers />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="h-16 bg-surface/80 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-lime" />
          <div>
            <h1 className="text-sm font-bold tracking-tight">INCIDENT LIFECYCLE</h1>
            <p className="text-[10px] text-white/30 font-mono">
              {lifecycle.lifecycle.id} — Stage {currentStageNum}/12
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              lifecycle.isAutoAdvancing ? 'bg-lime animate-pulse' :
              lifecycle.lifecycle.status === 'closed' ? 'bg-lime' :
              'bg-cyan'
            }`} />
            <span className="text-xs text-white/30 font-mono">
              {lifecycle.isAutoAdvancing ? 'SIMULATING' :
               lifecycle.lifecycle.status === 'closed' ? 'COMPLETE' :
               lifecycle.lifecycle.status}
            </span>
          </div>
          <button
            onClick={() => {
              if (lifecycle.lifecycle.status === 'new' || lifecycle.lifecycle.history.length === 0) {
                lifecycle.runFullSimulation();
              }
            }}
            disabled={lifecycle.isAutoAdvancing}
            className="flex items-center gap-2 px-4 py-2 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors disabled:opacity-30"
          >
            <Play className="w-3 h-3" />
            RUN SIMULATION
          </button>
          <button
            onClick={lifecycle.resetLifecycle}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:border-white/20 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            RESET
          </button>
        </div>
      </header>

      {/* Mini Timeline */}
      <div className="bg-surface/50 border-b border-white/5 px-4 lg:px-8 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGE_ORDER.map((stage, i) => {
            const config = LIFECYCLE_STAGE_CONFIG[stage];
            const isCompleted = i < currentStageNum - 1;
            const isCurrent = i === currentStageNum - 1;

            return (
              <div key={stage} className="flex items-center flex-shrink-0">
                {i > 0 && (
                  <div className={`w-3 h-px ${isCompleted ? 'bg-lime/30' : 'bg-white/5'}`} />
                )}
                <div className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase ${
                  isCompleted ? 'text-lime' :
                  isCurrent ? 'text-cyan bg-cyan/5 border border-cyan/20' :
                  'text-white/15'
                }`}>
                  <span>{String(config.number).padStart(2, '0')}</span>
                  <span className="hidden sm:inline">{config.label.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Tabs */}
        <aside className="w-48 bg-surface/30 border-r border-white/5 flex-shrink-0 min-h-[calc(100vh-7rem)]">
          <nav className="py-2">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors text-left ${
                  activePanel === tab.key
                    ? 'bg-lime/5 text-lime border-r-2 border-r-lime'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label.toUpperCase()}
              </button>
            ))}
          </nav>

          <div className="mt-6 px-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-white/40 transition-colors mb-2"
            >
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              HISTORY LOG
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 max-w-4xl">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
