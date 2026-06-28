// ═══════════════════════════════════════════════════════════════
// HQ APPROVAL QUEUE — Coordinator Gate Management
// Fetches pending approvals from Supabase. No mock data.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, Clock, FileText, ThumbsUp, ThumbsDown, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SeverityBadge, StatusBadge } from '@/components/escalation/EscalationBadge';
import { CoordinatorGate } from '@/components/lifecycle/CoordinatorGate';

interface ApprovalItem {
  id: string;
  incident_id: string;
  title: string;
  website_url: string;
  severity: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
  submitted_by: string;
  confidence: number;
  tests_passed: string;
  files_modified: number;
  submitted_at: string;
  ai_summary: string;
}

export function HQApprovals() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'p1' | 'high_confidence' | 'waiting'>('all');
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  // Fetch real approvals from pipeline_states awaiting approval
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('pipeline_states')
        .select('pipeline_id, incident_id, status, confidence, step_results, created_at')
        .eq('status', 'awaiting_approval')
        .order('created_at', { ascending: false });

      if (data) {
        const items: ApprovalItem[] = data.map((p: any) => ({
          id: p.pipeline_id,
          incident_id: p.incident_id,
          title: p.step_results?.stage_status || 'Pending Approval',
          website_url: '',
          severity: 'P2_HIGH' as const,
          submitted_by: 'AI:VALIDATE',
          confidence: p.confidence || 0,
          tests_passed: '0/0',
          files_modified: 0,
          submitted_at: p.created_at,
          ai_summary: `Pipeline awaiting approval. Confidence: ${p.confidence || 0}%`,
        }));
        setApprovals(items);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = approvals.filter(a => {
    if (approvedIds.has(a.id) || rejectedIds.has(a.id)) return false;
    if (filter === 'p1') return a.severity === 'P1_CRITICAL';
    if (filter === 'high_confidence') return a.confidence >= 90;
    return true;
  });

  const selected = approvals.find(a => a.id === selectedApproval);

  const handleApprove = async (id: string) => {
    await supabase.from('pipeline_states').update({ status: 'approved' }).eq('pipeline_id', id);
    setApprovedIds(prev => new Set([...prev, id]));
    setSelectedApproval(null);
  };

  const handleReject = async (id: string) => {
    await supabase.from('pipeline_states').update({ status: 'rejected' }).eq('pipeline_id', id);
    setRejectedIds(prev => new Set([...prev, id]));
    setSelectedApproval(null);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#a3e635] animate-spin" />
        <span className="text-xs text-white/40 ml-2">Loading approvals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">APPROVAL QUEUE</h2>
          <p className="text-sm text-white/40 mt-1">
            {filtered.length} pending{approvedIds.size > 0 ? ` — ${approvedIds.size} approved` : ''}{rejectedIds.size > 0 ? ` — ${rejectedIds.size} rejected` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'p1', 'high_confidence'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${filter === f ? 'bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]/30' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}>
              {f === 'all' ? 'ALL' : f === 'high_confidence' ? '≥90%' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {filtered.map((approval) => (
            <button key={approval.id} onClick={() => setSelectedApproval(selectedApproval === approval.id ? null : approval.id)}
              className={`w-full text-left p-4 border transition-colors ${selectedApproval === approval.id ? 'bg-[#a3e635]/[0.03] border-[#a3e635]/20' : 'bg-[#0e0e14] border-white/5 hover:border-white/10'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={approval.severity} />
                  <StatusBadge status="pending_assignment" />
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${approval.confidence >= 90 ? 'bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]/20' : approval.confidence >= 75 ? 'bg-white/10 text-white/60 border-white/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                    {approval.confidence}%
                  </span>
                </div>
                <span className="text-[10px] text-white/20 font-mono flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5" />{new Date(approval.submitted_at).toLocaleTimeString()}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{approval.title}</h4>
              <div className="flex items-center gap-3 text-xs text-white/30 font-mono mb-2">
                <span>{approval.incident_id}</span>
                {approval.website_url && <span>{approval.website_url}</span>}
              </div>
              <p className="text-xs text-white/40 mb-3">{approval.ai_summary}</p>
              <div className="flex items-center gap-4 text-[10px] text-white/20">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{approval.files_modified} file{approval.files_modified !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{approval.tests_passed} tests</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{approval.submitted_by}</span>
              </div>
              {selectedApproval === approval.id && (
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
                  <button onClick={(e) => { e.stopPropagation(); handleApprove(approval.id); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-xs font-bold hover:bg-[#a3e635]/20 transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" />APPROVE
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleReject(approval.id); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 transition-colors">
                    <ThumbsDown className="w-3.5 h-3.5" />REJECT
                  </button>
                </div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center bg-[#0e0e14] border border-white/5">
              <CheckCircle className="w-8 h-8 text-[#a3e635] mx-auto mb-2" />
              <p className="text-sm text-white/40">No pending approvals</p>
            </div>
          )}
        </div>
        <div>
          {selected ? (
            <CoordinatorGate
              lifecycle={{
                id: selected.incident_id, currentStage: 'coordinator_gate', status: 'pending_approval',
                lead: null, serviceSelection: null, credentialSubmission: null,
                deploymentState: null, customerVerification: null, auditReport: null,
                followUpEmails: [], monitoringState: null,
                createdAt: selected.submitted_at, updatedAt: selected.submitted_at,
                completedAt: null, history: [],
              }}
              onApprove={() => handleApprove(selected.id)}
              onReject={() => handleReject(selected.id)}
            />
          ) : (
            <div className="bg-[#0e0e14] border border-white/5 p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Select an approval to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
