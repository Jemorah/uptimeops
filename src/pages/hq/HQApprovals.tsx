// ═══════════════════════════════════════════════════════════════
// HQ APPROVAL QUEUE — Coordinator Gate Management
// All pending approvals, review, approve/reject with notes
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  ShieldCheck, CheckCircle, Clock, FileText,
  ThumbsUp, ThumbsDown, Zap
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/escalation/EscalationBadge';
import { CoordinatorGate } from '@/components/lifecycle/CoordinatorGate';

const MOCK_APPROVALS = [
  {
    id: 'APP-2049',
    incidentId: 'ESC-2049',
    title: 'Database Connection Pool Exhaustion',
    websiteUrl: 'acme-corp.com',
    severity: 'P1_CRITICAL' as const,
    submittedBy: 'AI:VALIDATE',
    confidence: 94,
    testsPassed: '8/8',
    filesModified: 1,
    submittedAt: '2024-06-25T14:45:00Z',
    waitingMinutes: 12,
    aiSummary: 'Patched connection release in error handler. All 8 tests pass. 94% confidence.',
  },
  {
    id: 'APP-2046',
    incidentId: 'ESC-2046',
    title: 'SSL Certificate Expiry Warning',
    websiteUrl: 'secure.finance.co',
    severity: 'P2_HIGH' as const,
    submittedBy: 'AI:VALIDATE',
    confidence: 85,
    testsPassed: '6/6',
    filesModified: 1,
    submittedAt: '2024-06-25T14:30:00Z',
    waitingMinutes: 27,
    aiSummary: 'Manual renewal with HTTP-01 challenge. SSL Labs A+ rating. 6/6 tests pass.',
  },
  {
    id: 'APP-2045',
    incidentId: 'ESC-2045',
    title: 'Customer Requested Engineer Review',
    websiteUrl: 'health-portal.med',
    severity: 'P3_MEDIUM' as const,
    submittedBy: 'AI:VALIDATE',
    confidence: 92,
    testsPassed: '10/10',
    filesModified: 3,
    submittedAt: '2024-06-25T14:50:00Z',
    waitingMinutes: 7,
    aiSummary: 'Scheduled maintenance window patch. All 10 tests pass. Customer explicitly requested review.',
  },
];

export function HQApprovals() {
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'p1' | 'high_confidence' | 'waiting'>('all');
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  const filtered = MOCK_APPROVALS.filter(a => {
    if (approvedIds.has(a.id) || rejectedIds.has(a.id)) return false;
    if (filter === 'p1') return a.severity === 'P1_CRITICAL';
    if (filter === 'high_confidence') return a.confidence >= 90;
    if (filter === 'waiting') return a.waitingMinutes > 15;
    return true;
  });

  const selected = MOCK_APPROVALS.find(a => a.id === selectedApproval);

  const handleApprove = (id: string) => {
    setApprovedIds(prev => new Set([...prev, id]));
    setSelectedApproval(null);
  };

  const handleReject = (id: string) => {
    setRejectedIds(prev => new Set([...prev, id]));
    setSelectedApproval(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">APPROVAL QUEUE</h2>
          <p className="text-sm text-white/40 mt-1">
            {filtered.length} pending — {approvedIds.size} approved today — {rejectedIds.size} rejected
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'p1', 'high_confidence', 'waiting'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                filter === f
                  ? 'bg-lime/10 text-lime border-lime/30'
                  : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
              }`}
            >
              {f === 'all' ? 'ALL' : f === 'high_confidence' ? '≥90%' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Approval List */}
        <div className="space-y-3">
          {filtered.map((approval) => (
            <button
              key={approval.id}
              onClick={() => setSelectedApproval(selectedApproval === approval.id ? null : approval.id)}
              className={`w-full text-left p-4 border transition-colors ${
                selectedApproval === approval.id
                  ? 'bg-lime/[0.03] border-lime/20'
                  : 'bg-surface border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={approval.severity} />
                  <StatusBadge status="pending_assignment" />
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                    approval.confidence >= 90 ? 'bg-green/10 text-green-400 border-green/20' :
                    approval.confidence >= 75 ? 'bg-yellow/10 text-yellow-400 border-yellow/20' :
                    'bg-red/10 text-red-400 border-red/20'
                  }`}>
                    {approval.confidence}%
                  </span>
                </div>
                <span className="text-[10px] text-white/20 font-mono flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  {approval.waitingMinutes}m
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-1">{approval.title}</h4>
              <div className="flex items-center gap-3 text-xs text-white/30 font-mono mb-2">
                <span>{approval.incidentId}</span>
                <span>{approval.websiteUrl}</span>
              </div>

              <p className="text-xs text-white/40 mb-3">{approval.aiSummary}</p>

              <div className="flex items-center gap-4 text-[10px] text-white/20">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {approval.filesModified} file{approval.filesModified > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {approval.testsPassed} tests
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {approval.submittedBy}
                </span>
              </div>

              {/* Quick Actions */}
              {selectedApproval === approval.id && (
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleApprove(approval.id); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    APPROVE
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReject(approval.id); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red/10 border border-red/20 text-red-400 text-xs font-bold hover:bg-red/20 transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    REJECT
                  </button>
                </div>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center bg-surface border border-white/5">
              <CheckCircle className="w-8 h-8 text-lime mx-auto mb-2" />
              <p className="text-sm text-white/40">No pending approvals</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selected ? (
            <CoordinatorGate
              lifecycle={{
                id: selected.incidentId,
                currentStage: 'coordinator_gate',
                status: 'pending_approval',
                lead: null,
                serviceSelection: null,
                credentialSubmission: null,
                deploymentState: null,
                customerVerification: null,
                auditReport: null,
                followUpEmails: [],
                monitoringState: null,
                createdAt: selected.submittedAt,
                updatedAt: selected.submittedAt,
                completedAt: null,
                history: [],
              }}
              onApprove={() => handleApprove(selected.id)}
              onReject={() => handleReject(selected.id)}
            />
          ) : (
            <div className="bg-surface border border-white/5 p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Select an approval to review details</p>
              <p className="text-xs text-white/20 mt-1">Review validation report, test results, and AI logs before deciding</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
