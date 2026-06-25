// ═══════════════════════════════════════════════════════════════
// ENGINEER WORKSPACE
// Integrated workspace: VM Terminal, Code Editor, AI Logs,
// Session Recorder, Coordinator Chat, Comm Templates, Handoff Notes
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Terminal, Code2, Activity, Video, MessageSquare,
  Mail, ClipboardList, ArrowLeft, AlertTriangle,
  Shield, Clock, Zap
} from 'lucide-react';
import { useEscalations } from '@/hooks/useEscalations';
import { VmTerminal } from '@/components/engineer/VmTerminal';
import { CodeEditor } from '@/components/engineer/CodeEditor';
import { AiLogViewer } from '@/components/engineer/AiLogViewer';
import { SessionRecorder } from '@/components/engineer/SessionRecorder';
import { CoordinatorChat } from '@/components/engineer/CoordinatorChat';
import { CommTemplates } from '@/components/engineer/CommTemplates';
import { HandoffNotes } from '@/components/engineer/HandoffNotes';
import { SeverityBadge, StatusBadge } from '@/components/escalation/EscalationBadge';
import { EscalationSequenceTimeline } from '@/components/escalation/EscalationSequenceTimeline';

type WorkspaceTab =
  | 'terminal'
  | 'code'
  | 'ailogs'
  | 'session'
  | 'chat'
  | 'templates'
  | 'handoff'
  | 'sequence';

const TABS: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: 'terminal', label: 'VM Terminal', icon: Terminal },
  { key: 'code', label: 'Code Editor', icon: Code2 },
  { key: 'ailogs', label: 'AI Logs', icon: Activity },
  { key: 'session', label: 'Session', icon: Video },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'templates', label: 'Templates', icon: Mail },
  { key: 'handoff', label: 'Handoff', icon: ClipboardList },
  { key: 'sequence', label: 'Sequence', icon: Zap },
];

export function EngineerWorkspace() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { incidents, updateStatus } = useEscalations();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('terminal');
  const [layoutMode, setLayoutMode] = useState<'single' | 'split'>('single');

  const incident = incidents.find(i => i.id === incidentId);

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-8 h-8 text-yellow-400" />
        <p className="text-sm text-white/40">Incident not found</p>
        <button
          onClick={() => navigate('/engineer')}
          className="flex items-center gap-2 px-4 py-2 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          BACK TO QUEUE
        </button>
      </div>
    );
  }

  const handleSubmitFix = () => {
    updateStatus(incident.id, 'fix_submitted');
  };

  const handleRequestReview = () => {
    updateStatus(incident.id, 'coordinator_review');
  };

  const renderTabContent = (tab: WorkspaceTab) => {
    switch (tab) {
      case 'terminal':
        return <VmTerminal incidentId={incident.id} websiteUrl={incident.websiteUrl} />;
      case 'code':
        return <CodeEditor incidentId={incident.id} />;
      case 'ailogs':
        return <AiLogViewer incidentId={incident.id} />;
      case 'session':
        return <SessionRecorder incidentId={incident.id} />;
      case 'chat':
        return <CoordinatorChat incidentId={incident.id} />;
      case 'templates':
        return <CommTemplates incidentId={incident.id} websiteUrl={incident.websiteUrl} />;
      case 'handoff':
        return <HandoffNotes incidentId={incident.id} />;
      case 'sequence':
        return <EscalationSequenceTimeline currentStatus={incident.escalationStatus} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Incident Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <button
              onClick={() => navigate('/engineer')}
              className="flex items-center gap-1 text-white/40 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs">Queue</span>
            </button>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.escalationStatus} />
          </div>
          <h2 className="text-lg font-black tracking-tight">{incident.title}</h2>
          <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
            <span className="font-mono">{incident.id}</span>
            <span>{incident.websiteUrl}</span>
            {incident.assignedEngineer && (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan" />
                {incident.assignedEngineer}
              </span>
            )}
            {incident.requiresSpecialty && (
              <span className="text-cyan">{incident.requiresSpecialty}</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSubmitFix}
            className="flex items-center gap-2 px-4 py-2 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors"
          >
            <Shield className="w-3 h-3" />
            SUBMIT FIX
          </button>
          <button
            onClick={handleRequestReview}
            className="flex items-center gap-2 px-4 py-2 bg-purple/10 border border-purple/30 text-purple-400 text-xs font-bold hover:bg-purple/20 transition-colors"
          >
            <Clock className="w-3 h-3" />
            REQUEST REVIEW
          </button>
        </div>
      </div>

      {/* AI Context Bar */}
      {incident.aiAttemptSummary && (
        <div className="bg-cyan/5 border border-cyan/10 p-3 flex items-start gap-3">
          <Activity className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] text-cyan font-bold uppercase tracking-wider mb-1">AI Attempt Summary</div>
            <p className="text-xs text-white/50 leading-relaxed">{incident.aiAttemptSummary}</p>
            {incident.aiConfidence !== null && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-white/30">AI Confidence:</span>
                <div className="w-24 h-1.5 bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${
                      incident.aiConfidence >= 90 ? 'bg-green-400' :
                      incident.aiConfidence >= 70 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${incident.aiConfidence}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono font-bold ${
                  incident.aiConfidence >= 90 ? 'text-green-400' :
                  incident.aiConfidence >= 70 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {incident.aiConfidence}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center justify-between border-b border-white/5">
        <div className="flex items-center overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-lime text-lime bg-lime/[0.03]'
                  : 'border-transparent text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3">
          <button
            onClick={() => setLayoutMode('single')}
            className={`text-[10px] px-2 py-1 border transition-colors ${
              layoutMode === 'single'
                ? 'bg-white/5 text-white/60 border-white/20'
                : 'text-white/20 border-transparent hover:border-white/10'
            }`}
          >
            SINGLE
          </button>
          <button
            onClick={() => setLayoutMode('split')}
            className={`text-[10px] px-2 py-1 border transition-colors ${
              layoutMode === 'split'
                ? 'bg-white/5 text-white/60 border-white/20'
                : 'text-white/20 border-transparent hover:border-white/10'
            }`}
          >
            SPLIT
          </button>
        </div>
      </div>

      {/* Content Area */}
      {layoutMode === 'single' ? (
        <div className="flex-1 min-h-0">
          {renderTabContent(activeTab)}
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
          <div>{renderTabContent(activeTab)}</div>
          <div>{renderTabContent(activeTab === 'terminal' ? 'code' : 'terminal')}</div>
        </div>
      )}
    </div>
  );
}
