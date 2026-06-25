// ═══════════════════════════════════════════════════════════════
// INCIDENT WORKSPACE — Engineer On-Call Portal
// 5-tab interface: Context | VM Terminal | Credentials | Comms | Submit Fix
// + Session Controls + Audit Panel
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Terminal, KeyRound, MessageSquare, Send,
  ChevronLeft, Clock, Pause,
  ArrowUpRight, LogOut, Play, Square, Radio,
  Eye, Bug, Siren
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Components
import { ContextPanel } from '@/components/engineer/ContextPanel';
import { VmTerminal } from '@/components/engineer/VmTerminal';
import { CodeEditor } from '@/components/engineer/CodeEditor';
import { CredentialsPanel } from '@/components/engineer/CredentialsPanel';
import { CoordinatorChat } from '@/components/engineer/CoordinatorChat';
import { CommTemplates } from '@/components/engineer/CommTemplates';
import { HandoffNotes } from '@/components/engineer/HandoffNotes';
import { SubmitFixPanel } from '@/components/engineer/SubmitFixPanel';
import { AuditPanel } from '@/components/engineer/AuditPanel';
import { useEscalations } from '@/hooks/useEscalations';

type WorkspaceTab = 'context' | 'terminal' | 'credentials' | 'communication' | 'submit';

interface SessionState {
  status: 'idle' | 'active' | 'paused' | 'ended';
  startTime: number | null;
  elapsedSeconds: number;
  pauseReason?: string;
}

const TAB_CONFIG: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: 'context', label: 'Context', icon: FileText },
  { key: 'terminal', label: 'VM Terminal', icon: Terminal },
  { key: 'credentials', label: 'Credentials', icon: KeyRound },
  { key: 'communication', label: 'Communication', icon: MessageSquare },
  { key: 'submit', label: 'Submit Fix', icon: Send },
];

// Mock incident data for demo
const MOCK_INCIDENT = {
  id: 'INC-0641',
  websiteUrl: 'acme-corp.com',
  customerEmail: 'admin@acme-corp.com',
  severity: 'P1' as const,
  status: 'repairing',
  aiConfidence: 72,
  issueType: 'db_pool',
  description: 'Database connection pool exhaustion causing 500 errors',
  assignedAt: '14:30:00',
  waitingSince: '14:28:15',
};

export function IncidentWorkspace() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { incidents, updateStatus } = useEscalations();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('context');
  const [showAudit, setShowAudit] = useState(false);
  const [session, setSession] = useState<SessionState>({
    status: 'idle',
    startTime: null,
    elapsedSeconds: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  useEffect(() => {
    if (session.status === 'active' && session.startTime) {
      timerRef.current = setInterval(() => {
        setSession(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000),
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.status, session.startTime]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Session controls
  const startSession = () => {
    setSession({ status: 'active', startTime: Date.now(), elapsedSeconds: 0 });
    toast.success('Session started — timer running');
  };

  const endSession = () => {
    setSession({ status: 'ended', startTime: null, elapsedSeconds: 0 });
    toast.info('Session ended — logged');
  };

  const pauseSession = () => {
    setSession(prev => ({ ...prev, status: 'paused', pauseReason: 'Waiting for customer input' }));
    toast.info('Session paused — VM state saved');
  };

  const resumeSession = () => {
    setSession(prev => ({ ...prev, status: 'active', pauseReason: undefined }));
    toast.success('Session resumed');
  };

  const handleEscalate = () => {
    toast.warning('Escalation request sent to L2/L3 team');
  };

  const handleSecurity = () => {
    toast.error('Security incident reported — bypassing normal flow');
  };

  const handleEmergencyCall = () => {
    toast.error('Emergency coordinator call triggered — SMS sent');
  };

  const handleSubmitFix = () => {
    if (incidentId) {
      updateStatus(incidentId, 'fix_submitted');
    }
  };

  const incident = incidents.find(i => i.id === incidentId) || MOCK_INCIDENT;

  const severityColor = incident.severity === 'P1' ? 'text-red-400 bg-red-400/10 border-red-400/20'
    : incident.severity === 'P2_HIGH' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';

  return (
    <div className="h-full flex flex-col">
      {/* ═══════════════════════════════════════════
          TOP BAR: Incident Header + Session Controls
      ═══════════════════════════════════════════ */}
      <div className="shrink-0 border-b border-white/5 bg-surface">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Back + Incident Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/engineer')}
              className="p-1.5 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white/40" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-lime">{incident.id || incidentId}</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold border ${severityColor} uppercase`}>
                {incident.severity || 'P1'}
              </span>
              <span className="text-xs text-white/40 font-mono">
                {incident.websiteUrl || MOCK_INCIDENT.websiteUrl}
              </span>
            </div>
          </div>

          {/* Center: Session Timer */}
          <div className="flex items-center gap-4">
            {session.status === 'idle' && (
              <Button onClick={startSession} size="sm" className="bg-lime text-black hover:bg-lime/90 text-xs font-bold h-7">
                <Play className="w-3 h-3 mr-1" />
                Start Session
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-lime/5 border border-lime/10">
                  <Radio className="w-3 h-3 text-lime animate-pulse" />
                  <Clock className="w-3 h-3 text-lime" />
                  <span className="text-xs font-mono font-bold text-lime tabular-nums">
                    {formatElapsed(session.elapsedSeconds)}
                  </span>
                </div>
                <Button onClick={pauseSession} size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs h-7">
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
                <Button onClick={endSession} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7">
                  <Square className="w-3 h-3 mr-1" />
                  End
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-yellow-500/5 border border-yellow-500/10">
                  <Pause className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-mono text-yellow-400">PAUSED</span>
                  <span className="text-[9px] text-white/30">{session.pauseReason}</span>
                </div>
                <Button onClick={resumeSession} size="sm" className="bg-lime text-black hover:bg-lime/90 text-xs h-7">
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
                <Button onClick={endSession} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7">
                  <Square className="w-3 h-3 mr-1" />
                  End
                </Button>
              </>
            )}
            {session.status === 'ended' && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10">
                <LogOut className="w-3 h-3 text-white/30" />
                <span className="text-xs text-white/30">Session ended</span>
              </div>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className={`p-1.5 transition-colors ${showAudit ? 'bg-cyan/10 text-cyan' : 'hover:bg-white/5 text-white/30'}`}
              title="Toggle Audit Panel"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEscalate}
              className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase bg-white/5 border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-400/30 transition-colors"
            >
              <ArrowUpRight className="w-3 h-3" />
              Escalate
            </button>
            <button
              onClick={handleSecurity}
              className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              <Bug className="w-3 h-3" />
              Security
            </button>
            <button
              onClick={handleEmergencyCall}
              className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Siren className="w-3 h-3" />
              Emergency
            </button>
          </div>
        </div>

        {/* AI Confidence Bar */}
        <div className="flex items-center gap-3 px-4 py-1.5 border-t border-white/5 bg-white/[0.01]">
          <span className="text-[9px] text-white/30 uppercase font-bold">AI Confidence</span>
          <div className="flex-1 h-1.5 bg-white/5 max-w-[200px]">
            <div
              className="h-full transition-all"
              style={{
                width: `${incident.aiConfidence || 72}%`,
                backgroundColor: (incident.aiConfidence || 72) >= 90 ? '#22c55e' :
                  (incident.aiConfidence || 72) >= 70 ? '#d1ff00' : '#ef4444',
              }}
            />
          </div>
          <span className={`text-[10px] font-mono font-bold ${
            (incident.aiConfidence || 72) >= 90 ? 'text-green-400' :
            (incident.aiConfidence || 72) >= 70 ? 'text-lime' : 'text-red-400'
          }`}>
            {incident.aiConfidence || 72}%
          </span>
          <span className="text-[9px] text-white/20 ml-2">
            {(incident.aiConfidence || 72) < 90 ? 'Below auto-deploy threshold — human required' : 'Auto-deploy eligible'}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MAIN CONTENT: Tabs + Audit Panel
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Content */}
        <div className={`flex-1 overflow-auto ${showAudit ? 'border-r border-white/5' : ''}`}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkspaceTab)} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-black/20 border-b border-white/5 h-9 px-2 gap-0">
              {TAB_CONFIG.map(tab => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-lime/10 data-[state=active]:text-lime data-[state=active]:border-b-2 data-[state=active]:border-lime rounded-none px-3 h-full gap-1.5"
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* TAB 1: CONTEXT */}
            <TabsContent value="context" className="m-0 p-4 overflow-auto">
              <ContextPanel
                incidentId={incidentId || 'INC-0641'}
                websiteUrl={incident.websiteUrl || MOCK_INCIDENT.websiteUrl}
                customerEmail={incident.customerEmail || MOCK_INCIDENT.customerEmail}
              />
            </TabsContent>

            {/* TAB 2: VM TERMINAL (Primary Work Area) */}
            <TabsContent value="terminal" className="m-0 h-[calc(100vh-220px)]">
              <div className="h-full flex">
                {/* Terminal */}
                <div className="flex-1 min-w-0 border-r border-white/5">
                  <VmTerminal
                    incidentId={incidentId || 'INC-0641'}
                    websiteUrl={incident.websiteUrl || MOCK_INCIDENT.websiteUrl}
                  />
                </div>
                {/* Code Editor Sidebar */}
                <div className="w-[400px] shrink-0 bg-surface">
                  <CodeEditor incidentId={incidentId || 'INC-0641'} />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: CREDENTIALS */}
            <TabsContent value="credentials" className="m-0 p-4 overflow-auto">
              <CredentialsPanel
                incidentId={incidentId || 'INC-0641'}
                customerEmail={incident.customerEmail || MOCK_INCIDENT.customerEmail}
              />
            </TabsContent>

            {/* TAB 4: COMMUNICATION */}
            <TabsContent value="communication" className="m-0 p-4 overflow-auto">
              <div className="space-y-4">
                {/* Internal Chat with Coordinator */}
                <CoordinatorChat incidentId={incidentId || 'INC-0641'} />
                {/* Templates + Handoff in grid */}
                <div className="grid grid-cols-2 gap-4">
                  <CommTemplates
                    incidentId={incidentId || 'INC-0641'}
                    websiteUrl={incident.websiteUrl || MOCK_INCIDENT.websiteUrl}
                  />
                  <HandoffNotes incidentId={incidentId || 'INC-0641'} />
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: SUBMIT FIX */}
            <TabsContent value="submit" className="m-0 p-4 overflow-auto">
              <SubmitFixPanel
                incidentId={incidentId || 'INC-0641'}
                onSubmit={handleSubmitFix}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Audit Panel (toggleable sidebar) */}
        {showAudit && (
          <div className="w-[380px] shrink-0 overflow-auto bg-black/30">
            <AuditPanel incidentId={incidentId || 'INC-0641'} />
          </div>
        )}
      </div>
    </div>
  );
}
