// ═══════════════════════════════════════════════════════════════
// INCIDENT WORKSPACE — Engineer On-Call Portal
// 5-tab interface: Context | VM Terminal | Credentials | Comms | Submit Fix
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Terminal, KeyRound, MessageSquare, Send,
  ChevronLeft, Clock, Pause, ArrowUpRight, LogOut,
  Play, Square, Radio, Eye, Siren, Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

import { ContextPanel } from '@/components/engineer/ContextPanel';
import { VmTerminal } from '@/components/engineer/VmTerminal';
import { CodeEditor } from '@/components/engineer/CodeEditor';
import { CredentialsPanel } from '@/components/engineer/CredentialsPanel';
import { CoordinatorChat } from '@/components/engineer/CoordinatorChat';
import { CommTemplates } from '@/components/engineer/CommTemplates';
import { HandoffNotes } from '@/components/engineer/HandoffNotes';
import { SubmitFixPanel } from '@/components/engineer/SubmitFixPanel';
import { AuditPanel } from '@/components/engineer/AuditPanel';

type WorkspaceTab = 'context' | 'terminal' | 'credentials' | 'communication' | 'submit';

interface IncidentData {
  id: string;
  websiteUrl: string;
  customerEmail: string;
  severity: string;
  status: string;
  aiConfidence: number;
  description: string;
}

const TAB_CONFIG: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: 'context', label: 'Context', icon: FileText },
  { key: 'terminal', label: 'VM Terminal', icon: Terminal },
  { key: 'credentials', label: 'Credentials', icon: KeyRound },
  { key: 'communication', label: 'Communication', icon: MessageSquare },
  { key: 'submit', label: 'Submit Fix', icon: Send },
];

export function IncidentWorkspace() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('context');
  const [showAudit, setShowAudit] = useState(false);
  const [incident, setIncident] = useState<IncidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState({
    status: 'idle' as 'idle' | 'active' | 'paused' | 'ended',
    startTime: null as number | null,
    elapsedSeconds: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch incident data from Supabase
  useEffect(() => {
    if (!incidentId) { setLoading(false); return; }
    supabase
      .from('incidents')
      .select('id, title, description, priority, status, customer_id, customers(website, user_id)')
      .eq('id', incidentId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIncident({
            id: data.id,
            websiteUrl: (data as any).customers?.website || '',
            customerEmail: '',
            severity: data.priority || 'P3',
            status: data.status || 'open',
            aiConfidence: 0,
            description: data.description || '',
          });
        }
        setLoading(false);
      });
  }, [incidentId]);

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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status, session.startTime]);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startSession = () => setSession({ status: 'active', startTime: Date.now(), elapsedSeconds: 0 });
  const endSession = () => setSession({ status: 'ended', startTime: null, elapsedSeconds: 0 });
  const pauseSession = () => setSession(prev => ({ ...prev, status: 'paused' }));
  const resumeSession = () => setSession(prev => ({ ...prev, status: 'active' }));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#a3e635] animate-spin" />
        <span className="text-xs text-white/40 ml-2">Loading incident...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <FileText className="w-8 h-8 text-white/10" />
        <p className="text-xs text-white/40">Incident not found</p>
        <button onClick={() => navigate('/engineer')} className="text-xs text-[#a3e635] hover:underline">Back to workspace</button>
      </div>
    );
  }

  const sevColor = incident.severity === 'P1' ? 'text-red-400 bg-red-400/10 border-red-400/20'
    : incident.severity === 'P2' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="shrink-0 border-b border-white/5 bg-[#0e0e14]">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/engineer')} className="p-1.5 hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white/40" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-[#a3e635]">{incident.id}</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-bold border ${sevColor} uppercase`}>
                {incident.severity}
              </span>
              {incident.websiteUrl && (
                <span className="text-xs text-white/40 font-mono">{incident.websiteUrl}</span>
              )}
            </div>
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-4">
            {session.status === 'idle' && (
              <Button onClick={startSession} size="sm" className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90 text-xs font-bold h-7">
                <Play className="w-3 h-3 mr-1" />Start Session
              </Button>
            )}
            {session.status === 'active' && (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-[#a3e635]/5 border border-[#a3e635]/10">
                  <Radio className="w-3 h-3 text-[#a3e635] animate-pulse" />
                  <Clock className="w-3 h-3 text-[#a3e635]" />
                  <span className="text-xs font-mono font-bold text-[#a3e635] tabular-nums">
                    {formatElapsed(session.elapsedSeconds)}
                  </span>
                </div>
                <Button onClick={pauseSession} size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs h-7">
                  <Pause className="w-3 h-3 mr-1" />Pause
                </Button>
                <Button onClick={endSession} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7">
                  <Square className="w-3 h-3 mr-1" />End
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-yellow-500/5 border border-yellow-500/10">
                  <Pause className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-mono text-yellow-400">PAUSED</span>
                </div>
                <Button onClick={resumeSession} size="sm" className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90 text-xs h-7">
                  <Play className="w-3 h-3 mr-1" />Resume
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

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowAudit(!showAudit)} className={`p-1.5 transition-colors ${showAudit ? 'bg-[#22d3ee]/10 text-[#22d3ee]' : 'hover:bg-white/5 text-white/30'}`}>
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={async () => {
              if (!incident) return;
              try {
                const { error } = await supabase.from('human_escalations').insert({
                  incident_id: incident.id,
                  status: 'pending_assignment',
                  reason: 'Manual escalation from engineer workspace',
                  trigger_reason: 'engineer_manual',
                });
                if (error) throw error;
                toast.success('Escalation created — coordinator notified');
              } catch {
                toast.error('Failed to create escalation');
              }
            }} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase bg-white/5 border border-white/10 text-white/40 hover:text-orange-400 transition-colors">
              <ArrowUpRight className="w-3 h-3" />Escalate
            </button>
            <button onClick={async () => {
              if (!incident) return;
              try {
                const { error } = await supabase.from('human_escalations').insert({
                  incident_id: incident.id,
                  status: 'pending_assignment',
                  reason: 'Security incident flagged by engineer',
                  trigger_reason: 'security_finding',
                });
                if (error) throw error;
                toast.success('Security incident reported — P1 escalated');
              } catch {
                toast.error('Failed to report security incident');
              }
            }} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
              <Siren className="w-3 h-3" />Emergency
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto ${showAudit ? 'border-r border-white/5' : ''}`}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkspaceTab)} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-black/20 border-b border-white/5 h-9 px-2 gap-0">
              {TAB_CONFIG.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key}
                  className="text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-[#a3e635]/10 data-[state=active]:text-[#a3e635] data-[state=active]:border-b-2 data-[state=active]:border-[#a3e635] rounded-none px-3 h-full gap-1.5"
                >
                  <tab.icon className="w-3 h-3" />{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="context" className="m-0 p-4 overflow-auto">
              <ContextPanel incidentId={incident.id} websiteUrl={incident.websiteUrl} customerEmail={incident.customerEmail} />
            </TabsContent>
            <TabsContent value="terminal" className="m-0 h-[calc(100vh-220px)]">
              <div className="h-full flex">
                <div className="flex-1 min-w-0 border-r border-white/5">
                  <VmTerminal incidentId={incident.id} websiteUrl={incident.websiteUrl} />
                </div>
                <div className="w-[400px] shrink-0 bg-[#0e0e14]">
                  <CodeEditor incidentId={incident.id} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="credentials" className="m-0 p-4 overflow-auto">
              <CredentialsPanel incidentId={incident.id} customerEmail={incident.customerEmail} />
            </TabsContent>
            <TabsContent value="communication" className="m-0 p-4 overflow-auto">
              <div className="space-y-4">
                <CoordinatorChat incidentId={incident.id} />
                <div className="grid grid-cols-2 gap-4">
                  <CommTemplates incidentId={incident.id} websiteUrl={incident.websiteUrl} />
                  <HandoffNotes incidentId={incident.id} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="submit" className="m-0 p-4 overflow-auto">
              <SubmitFixPanel incidentId={incident.id} onSubmit={() => toast.success('Fix submitted')} />
            </TabsContent>
          </Tabs>
        </div>
        {showAudit && (
          <div className="w-[380px] shrink-0 overflow-auto bg-black/30">
            <AuditPanel incidentId={incident.id} />
          </div>
        )}
      </div>
    </div>
  );
}
