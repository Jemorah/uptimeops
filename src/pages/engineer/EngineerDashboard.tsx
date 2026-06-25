// ═══════════════════════════════════════════════════════════════
// ENGINEER DASHBOARD (REBUILT)
// P1-priority incident queue with escalation management
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Terminal, CheckCircle, Clock, Shield,
  Users, Zap, TrendingUp, ArrowRight, RefreshCw,
  ChevronDown, ChevronUp, FileText, MessageSquare
} from 'lucide-react';
import { useEscalations } from '@/hooks/useEscalations';
import { SeverityBadge, StatusBadge, TriggerBadge } from '@/components/escalation/EscalationBadge';
import { EscalationSequenceTimeline } from '@/components/escalation/EscalationSequenceTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function EngineerDashboard() {
  const navigate = useNavigate();
  const {
    incidents,
    selectedIncident,
    setSelectedIncidentId,
    pendingP1Count,
    myActiveCount,
    acknowledgeIncident,
    acceptIncident,
    toggleSimulation,
    isSimulating,
  } = useEscalations();

  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [showSequence, setShowSequence] = useState(false);
  const [filter, setFilter] = useState<'all' | 'p1' | 'mine' | 'pending'>('all');

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'p1') return inc.severity === 'P1_CRITICAL';
    if (filter === 'mine') return inc.assignedEngineer !== null;
    if (filter === 'pending') return inc.escalationStatus === 'pending_assignment';
    return true;
  });

  const stats = {
    p1Pending: pendingP1Count,
    myActive: myActiveCount,
    totalQueue: incidents.filter(i => i.escalationStatus !== 'closed' && i.escalationStatus !== 'deployed').length,
    resolvedToday: 12,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">INCIDENT QUEUE</h2>
          <p className="text-sm text-white/40 mt-1">
            P1 prioritized, then FIFO. {stats.totalQueue} active escalations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border transition-colors ${
              isSimulating
                ? 'bg-lime/10 text-lime border-lime/30'
                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'SIM ON' : 'SIMULATE'}
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400 font-mono">{stats.p1Pending} P1</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'P1 Pending', value: stats.p1Pending, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'My Active', value: stats.myActive, icon: Terminal, color: 'text-cyan' },
          { label: 'Queue Total', value: stats.totalQueue, icon: Clock, color: 'text-lime' },
          { label: 'Resolved Today', value: stats.resolvedToday, icon: CheckCircle, color: 'text-green-400' },
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

      {/* Filters */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: 'ALL', count: incidents.length },
          { key: 'p1', label: 'P1 ONLY', count: incidents.filter(i => i.severity === 'P1_CRITICAL').length },
          { key: 'mine', label: 'ASSIGNED', count: incidents.filter(i => i.assignedEngineer !== null).length },
          { key: 'pending', label: 'PENDING', count: incidents.filter(i => i.escalationStatus === 'pending_assignment').length },
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
      </div>

      {/* Incident Queue Table */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-lime" />
            Escalated Incidents
          </h3>
          <span className="text-xs text-white/40 font-mono">{filteredIncidents.length} shown</span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredIncidents.map((incident) => {
            const isExpanded = expandedIncident === incident.id;
            const isP1 = incident.severity === 'P1_CRITICAL';

            return (
              <div
                key={incident.id}
                className={`transition-colors ${isP1 ? 'bg-red-500/[0.02]' : 'hover:bg-white/[0.01]'}`}
              >
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <SeverityBadge severity={incident.severity} />
                        <StatusBadge status={incident.escalationStatus} />
                        <TriggerBadge trigger={incident.escalationTrigger} />
                        {isP1 && (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-bold animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{incident.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                        <span className="font-mono">{incident.id}</span>
                        <span>{incident.websiteUrl}</span>
                        <span>{incident.customerEmail}</span>
                        {incident.requiresSpecialty && (
                          <span className="text-cyan">{incident.requiresSpecialty}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {incident.assignedEngineer ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-white/40" />
                            <span className="text-xs font-medium">{incident.assignedEngineer}</span>
                          </div>
                          {incident.aiConfidence !== null && (
                            <span className={`text-xs font-mono ${
                              incident.aiConfidence >= 90 ? 'text-green-400' :
                              incident.aiConfidence >= 70 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              AI: {incident.aiConfidence}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/20 font-mono">UNASSIGNED</span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* AI Attempt Summary */}
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
                            <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  incident.aiConfidence >= 90 ? 'bg-green-400' :
                                  incident.aiConfidence >= 70 ? 'bg-yellow-400' :
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
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-lime" />
                          <h5 className="text-xs font-bold uppercase tracking-wider">Actions</h5>
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

                        {(incident.escalationStatus === 'acknowledged' || incident.escalationStatus === 'in_progress') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/engineer/workspace/${incident.id}`);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan/10 border border-cyan/30 text-cyan text-sm font-bold hover:bg-cyan/20 transition-colors"
                          >
                            <Terminal className="w-4 h-4" />
                            OPEN WORKSPACE
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncidentId(incident.id);
                            setShowSequence(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          VIEW ESCALATION SEQUENCE
                        </button>

                        <div className="pt-2 border-t border-white/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/engineer/workspace/${incident.id}`);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                          >
                            <span>Full workspace with VM, logs, chat, templates</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
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
