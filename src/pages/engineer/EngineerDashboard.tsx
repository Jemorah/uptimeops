// ═══════════════════════════════════════════════════════════════
// ENGINEER ON-CALL DASHBOARD
// My Queue, Active Session, Priority-sorted Incident Queue
// Auto-refresh every 10 seconds
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Terminal, CheckCircle, Shield,
  Users, Zap, RefreshCw,
  FileText, MessageSquare,
  Radio, Timer, PlayCircle, PauseCircle
} from 'lucide-react';
import { useEscalations } from '@/hooks/useEscalations';
import { SeverityBadge, StatusBadge } from '@/components/escalation/EscalationBadge';
import { EscalationSequenceTimeline } from '@/components/escalation/EscalationSequenceTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Priority sort order ──
const PRIORITY_ORDER: Record<string, number> = {
  'P1_CRITICAL': 0,
  'P1': 0,
  'P2_HIGH': 1,
  'P2': 1,
  'P3_MEDIUM': 2,
  'P3': 2,
  'P4_LOW': 3,
  'P4': 3,
};

interface ActiveSessionInfo {
  incidentId: string;
  elapsedSeconds: number;
  isPaused: boolean;
}

export function EngineerDashboard() {
  const navigate = useNavigate();
  const {
    incidents,
    selectedIncident,
    setSelectedIncidentId,
    acknowledgeIncident,
    acceptIncident,
    toggleSimulation,
    isSimulating,
  } = useEscalations();

  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [showSequence, setShowSequence] = useState(false);
  const [filter, setFilter] = useState<'all' | 'p1' | 'mine' | 'pending'>('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>({
    incidentId: 'INC-0641',
    elapsedSeconds: 1245,
    isPaused: false,
  });

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Active session timer
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) return;
    const timer = setInterval(() => {
      setActiveSession(prev => prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.isPaused]);

  // Priority-sorted incidents
  const sortedIncidents = [...incidents].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.severity] ?? 99;
    const pb = PRIORITY_ORDER[b.severity] ?? 99;
    if (pa !== pb) return pa - pb;
    // Then by waiting time (oldest first)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const filteredIncidents = sortedIncidents.filter((inc) => {
    if (filter === 'p1') return inc.severity === 'P1_CRITICAL';
    if (filter === 'mine') return inc.assignedEngineer !== null;
    if (filter === 'pending') return inc.escalationStatus === 'pending_assignment';
    return true;
  });

  // Stats
  const myAssigned = incidents.filter(i => i.assignedEngineer !== null).length;
  const p1Waiting = incidents.filter(i =>
    i.severity === 'P1_CRITICAL' &&
    i.escalationStatus !== 'closed' && i.escalationStatus !== 'deployed'
  ).length;
  const avgWaitMinutes = Math.round(
    incidents.length > 0
      ? incidents.reduce((sum, i) => sum + ((Date.now() - new Date(i.createdAt).getTime()) / 60000), 0) / incidents.length
      : 0
  );

  const stats = {
    myAssigned,
    p1Waiting,
    avgWait: avgWaitMinutes,
    resolvedToday: 12,
  };

  const formatSessionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleManualRefresh = () => {
    setLastRefresh(new Date());
    toast.success('Queue refreshed');
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">MY QUEUE</h2>
          <p className="text-sm text-white/40 mt-1">
            Priority-sorted: P1 → P2 → P3 → P4. Auto-refreshes every 10s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold border bg-white/5 text-white/40 border-white/10 hover:border-white/20 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {lastRefresh.toLocaleTimeString()}
          </button>
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border transition-colors ${
              isSimulating
                ? 'bg-lime/10 text-lime border-lime/30'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            }`}
          >
            <Radio className={`w-3 h-3 ${isSimulating ? 'animate-pulse' : ''}`} />
            {isSimulating ? 'LIVE' : 'SIMULATE'}
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400 font-mono">{stats.p1Waiting} P1</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MY QUEUE STATS ROW
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Assigned to Me',
            value: stats.myAssigned,
            icon: Users,
            color: 'text-cyan',
            sub: 'Active incidents'
          },
          {
            label: 'P1 Waiting',
            value: stats.p1Waiting,
            icon: AlertTriangle,
            color: 'text-red-400',
            sub: 'Needs immediate attention'
          },
          {
            label: 'Avg Wait Time',
            value: `${stats.avgWait}m`,
            icon: Timer,
            color: 'text-lime',
            sub: 'Across all open incidents'
          },
          {
            label: 'Resolved Today',
            value: stats.resolvedToday,
            icon: CheckCircle,
            color: 'text-green-400',
            sub: 'Since 00:00 UTC'
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-2xl font-black font-mono">{stat.value}</div>
            <p className="text-[10px] text-white/30 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          ACTIVE SESSION BANNER
      ═══════════════════════════════════════════ */}
      {activeSession && (
        <div
          className={`border p-4 cursor-pointer transition-all hover:border-lime/30 ${
            activeSession.isPaused
              ? 'bg-yellow-500/[0.03] border-yellow-500/20'
              : 'bg-lime/5 border-lime/20'
          }`}
          onClick={() => navigate(`/engineer/incident/${activeSession.incidentId}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeSession.isPaused ? (
                <PauseCircle className="w-5 h-5 text-yellow-400" />
              ) : (
                <PlayCircle className="w-5 h-5 text-lime animate-pulse" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-white/60">Active Session</span>
                  <span className="text-xs font-mono font-bold text-lime">{activeSession.incidentId}</span>
                  {activeSession.isPaused && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold uppercase">
                      Paused
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">
                  acme-corp.com — DB pool exhaustion — {activeSession.isPaused ? 'Waiting for customer input' : 'Repair in progress'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[9px] text-white/30 uppercase">Time Elapsed</div>
                <div className={`text-lg font-black font-mono tabular-nums ${activeSession.isPaused ? 'text-yellow-400' : 'text-lime'}`}>
                  {formatSessionTime(activeSession.elapsedSeconds)}
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-cyan/10 border border-cyan/30 text-cyan hover:bg-cyan/20 transition-colors">
                <Terminal className="w-4 h-4" />
                <span className="text-xs font-bold">OPEN</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          FILTERS
      ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: 'ALL', count: sortedIncidents.length },
          { key: 'p1', label: 'P1 ONLY', count: sortedIncidents.filter(i => i.severity === 'P1_CRITICAL').length },
          { key: 'mine', label: 'ASSIGNED', count: sortedIncidents.filter(i => i.assignedEngineer !== null).length },
          { key: 'pending', label: 'PENDING', count: sortedIncidents.filter(i => i.escalationStatus === 'pending_assignment').length },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
              filter === f.key
                ? 'bg-lime/10 text-lime border-lime/30'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
        <span className="text-[10px] text-white/20 font-mono ml-auto">
          Sorted: P1 → P2 → P3 → P4
        </span>
      </div>

      {/* ═══════════════════════════════════════════
          INCIDENT QUEUE TABLE
      ═══════════════════════════════════════════ */}
      <div className="bg-surface border border-white/5">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.01] text-[9px] font-bold uppercase tracking-wider text-white/30">
          <div className="col-span-1">ID</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-3">Customer / Site</div>
          <div className="col-span-3">Issue</div>
          <div className="col-span-1 text-center">AI %</div>
          <div className="col-span-1 text-center">Wait Time</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredIncidents.map((incident) => {
            const isExpanded = expandedIncident === incident.id;
            const isP1 = incident.severity === 'P1_CRITICAL';
            const waitMinutes = Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000);

            return (
              <div
                key={incident.id}
                className={`transition-colors ${isP1 ? 'bg-red-500/[0.02]' : 'hover:bg-white/[0.01]'}`}
              >
                {/* Row */}
                <div
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer"
                  onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                >
                  <div className="col-span-1">
                    <span className="text-xs font-mono font-bold text-white/70">{incident.id}</span>
                  </div>
                  <div className="col-span-1">
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs text-white/70 truncate">{incident.websiteUrl}</p>
                    <p className="text-[10px] text-white/30 truncate">{incident.customerEmail}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs text-white/70 truncate">{incident.title}</p>
                    <p className="text-[10px] text-white/30 truncate">{incident.category || incident.escalationTrigger}</p>
                  </div>
                  <div className="col-span-1 text-center">
                    {incident.aiConfidence !== null ? (
                      <span className={`text-xs font-mono font-bold ${
                        incident.aiConfidence >= 90 ? 'text-green-400' :
                        incident.aiConfidence >= 70 ? 'text-lime' :
                        'text-red-400'
                      }`}>
                        {incident.aiConfidence}%
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-mono ${
                      waitMinutes > 30 ? 'text-red-400' :
                      waitMinutes > 15 ? 'text-yellow-400' :
                      'text-white/40'
                    }`}>
                      {waitMinutes}m
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <StatusBadge status={incident.escalationStatus} />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/engineer/incident/${incident.id}`);
                      }}
                      className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 bg-cyan/10 border border-cyan/30 text-cyan text-[9px] font-bold hover:bg-cyan/20 transition-colors"
                    >
                      <Terminal className="w-3 h-3" />
                      OPEN
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* AI Summary */}
                      <div className="bg-black/30 border border-white/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-cyan" />
                          <h5 className="text-xs font-bold uppercase tracking-wider">AI Attempt Summary</h5>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">
                          {incident.aiAttemptSummary}
                        </p>
                        {incident.aiConfidence !== null && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10">
                              <div
                                className={`h-full transition-all ${
                                  incident.aiConfidence >= 90 ? 'bg-green-400' :
                                  incident.aiConfidence >= 70 ? 'bg-lime' :
                                  'bg-red-400'
                                }`}
                                style={{ width: `${incident.aiConfidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold">{incident.aiConfidence}%</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-lime" />
                          <h5 className="text-xs font-bold uppercase tracking-wider">Quick Actions</h5>
                        </div>

                        {incident.escalationStatus === 'pending_assignment' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptIncident(incident.id, 'Alex Chen');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-sm font-bold hover:bg-lime/20 transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            ACCEPT ASSIGNMENT
                          </button>
                        )}

                        {incident.escalationStatus === 'assigned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeIncident(incident.id);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan/10 border border-cyan/30 text-cyan text-sm font-bold hover:bg-cyan/20 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            ACKNOWLEDGE
                          </button>
                        )}

                        {/* Open Incident Workspace (NEW) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/engineer/incident/${incident.id}`);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan/10 border border-cyan/30 text-cyan text-sm font-bold hover:bg-cyan/20 transition-colors"
                        >
                          <Terminal className="w-4 h-4" />
                          OPEN INCIDENT WORKSPACE
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncidentId(incident.id);
                            setShowSequence(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          VIEW ESCALATION SEQUENCE
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredIncidents.length === 0 && (
          <div className="p-8 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-white/40">No incidents match current filter</p>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-white/20">
        <RefreshCw className="w-3 h-3" />
        <span>Auto-refreshes every 10 seconds • Last refresh: {lastRefresh.toLocaleTimeString()}</span>
      </div>

      {/* Sequence Dialog */}
      <Dialog open={showSequence} onOpenChange={setShowSequence}>
        <DialogContent className="max-w-lg bg-surface border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider">
              Escalation Sequence {selectedIncident?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <EscalationSequenceTimeline currentStatus={selectedIncident.escalationStatus} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
