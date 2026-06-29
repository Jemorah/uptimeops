// ═══════════════════════════════════════════════════════════════
// CONTEXT PANEL — v2.1
// Shows real incident data, scan results, and pipeline state.
// No mock data. Fetches from Supabase.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Globe, AlertTriangle, Bot, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Shield, Camera, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ContextPanelProps {
  incidentId: string;
  websiteUrl: string;
  customerEmail?: string;
}

interface ScanSummary {
  stage: string;
  scanner_name: string;
  status: string;
  confidence_score: number | null;
  findings_count: number;
  created_at: string;
}

export function ContextPanel({ incidentId, websiteUrl, customerEmail }: ContextPanelProps) {
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [incident, setIncident] = useState<any>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: inc } = await supabase.from('incidents').select('*').eq('id', incidentId).single();
      setIncident(inc);

      const { data: scanData } = await supabase
        .from('scan_results')
        .select('agent_stage, scanner_name, status, confidence_score, findings, created_at')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      setScans((scanData || []).map((s: any) => ({
        stage: s.agent_stage,
        scanner_name: s.scanner_name,
        status: s.status,
        confidence_score: s.confidence_score,
        findings_count: Array.isArray(s.findings) ? s.findings.length : 0,
        created_at: s.created_at,
      })));

      const { data: pipe } = await supabase.from('pipeline_states').select('*').eq('incident_id', incidentId).maybeSingle();
      setPipeline(pipe);
      if (pipe) setExpandedReport(pipe.current_step);
    } catch (e) {
      /* ignore */
    }
    setLoading(false);
  }, [incidentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageOrder = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'];
  const scansByStage = scans.reduce((acc: Record<string, ScanSummary[]>, s) => {
    acc[s.stage] = acc[s.stage] || [];
    acc[s.stage].push(s);
    return acc;
  }, {});

  const stageStatus = (stage: string) => {
    const stageScans = scansByStage[stage] || [];
    if (stageScans.length === 0) return 'pending' as const;
    if (stageScans.every(s => s.status === 'completed')) return 'success' as const;
    if (stageScans.some(s => s.status === 'failed')) return 'error' as const;
    if (stageScans.some(s => s.status === 'running')) return 'info' as const;
    return 'warning' as const;
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    if (status === 'info') return <Clock className="w-3.5 h-3.5 text-cyan" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
  };

  const statusColor = (status: string) => {
    if (status === 'success') return 'text-green-400';
    if (status === 'error') return 'text-red-400';
    if (status === 'info') return 'text-cyan';
    return 'text-yellow-400';
  };

  const avgConfidence = pipeline?.confidence || 0;

  return (
    <div className="space-y-4">
      {/* ── Customer & Issue Header ── */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan" />
              <a href={`https://${websiteUrl}`} target="_blank" rel="noopener noreferrer"
                className="text-sm font-mono text-cyan hover:underline">
                {websiteUrl}
              </a>
              <span className="px-1.5 py-0.5 text-[9px] bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase">LIVE</span>
            </div>
            <p className="text-xs text-white/40">{customerEmail || 'No email on file'}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30 uppercase tracking-wider">Incident</div>
            <div className="text-sm font-mono font-bold text-lime">{incidentId.slice(0, 8)}</div>
          </div>
        </div>

        {/* Issue Description */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Issue Description</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">
            {incident?.title || 'Loading incident details...'}
          </p>
          {incident?.description && (
            <p className="text-xs text-white/50 mt-2 leading-relaxed">{incident.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-white/30 font-mono">
            <span>Priority: <span className={incident?.priority === 'critical' ? 'text-red-400' : 'text-yellow-400'}>{incident?.priority || 'unknown'}</span></span>
            <span>Status: <span className="text-cyan">{incident?.status || 'unknown'}</span></span>
          </div>
        </div>
      </div>

      {/* ── Screenshots Placeholder ── */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Screenshots & Evidence</span>
        </div>
        <div className="text-center py-6 text-[10px] text-white/20">
          <Eye className="w-5 h-5 mx-auto mb-2 text-white/10" />
          Screenshots will be attached when available from scan results.
        </div>
      </div>

      {/* ── AI Pipeline Reports ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Bot className="w-3.5 h-3.5 text-lime" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">AI Pipeline Reports</span>
          <span className="text-[9px] text-white/30 ml-auto font-mono">{loading ? 'Loading...' : `${scans.length} scans`}</span>
        </div>

        {scans.length === 0 && !loading && (
          <div className="text-center py-4 text-[10px] text-white/20">No scan results yet. Pipeline may not have started.</div>
        )}

        {stageOrder.map(stage => {
          const stageScans = scansByStage[stage] || [];
          if (stageScans.length === 0) return null;
          const s = stageStatus(stage);
          const isExpanded = expandedReport === stage;
          const stageConfidence = stageScans.reduce((sum, sc) => sum + (sc.confidence_score || 0), 0) / stageScans.length;

          return (
            <div key={stage} className="bg-surface border border-white/5 overflow-hidden">
              <button
                onClick={() => setExpandedReport(isExpanded ? null : stage)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
                <Shield className={`w-4 h-4 ${statusColor(s)}`} />
                <span className="text-xs font-bold uppercase tracking-wider flex-1 text-left">{stage}</span>
                <StatusIcon status={s} />
                <span className={`text-[10px] font-mono ${statusColor(s)}`}>{s.toUpperCase()}</span>
                <span className="text-[10px] text-white/30 font-mono ml-2">{Math.round(stageConfidence)}%</span>
              </button>
              {isExpanded && (
                <div className="border-t border-white/5 px-3 pb-3">
                  <ul className="space-y-1.5 mt-3">
                    {stageScans.map((scan, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                        <span className="text-white/20 mt-0.5">-</span>
                        <span>{scan.scanner_name}: {scan.status} {scan.confidence_score != null ? `(${scan.confidence_score}%)` : ''} {scan.findings_count > 0 ? `- ${scan.findings_count} findings` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Escalation Reason (dynamic) ── */}
      {pipeline && avgConfidence > 0 && avgConfidence < 90 && (
        <div className="bg-red-500/[0.03] border border-red-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Escalation Reason</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            AI pipeline achieved {Math.round(avgConfidence)}% confidence — below the 90% auto-deploy threshold.
            {scans.filter(s => s.status === 'failed').length > 0 && ` ${scans.filter(s => s.status === 'failed').length} scanner(s) failed.`}
            {' '}Human engineer required for review and deployment approval.
          </p>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-white/30 font-mono">
            <span>AI Confidence: <span className={avgConfidence >= 80 ? 'text-yellow-400' : 'text-red-400'}>{Math.round(avgConfidence)}%</span></span>
            <span>Scans: <span className="text-cyan">{scans.filter(s => s.status === 'completed').length}/{scans.length}</span></span>
            <span>Threshold: <span className="text-green-400">90%</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
