// UptimeOps v2.1 — Scan Result Timeline
// Chronological list of scanners with status icons

import { Check, X, Loader2, SkipForward, AlertTriangle } from 'lucide-react';
import { useScanResults } from '@/hooks/useScanResults';

interface Props {
  incidentId: string;
  compact?: boolean;
}

const STAGE_ORDER = ['triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;
const STAGE_COLORS: Record<string, string> = {
  triage: '#a3e635', isolate: '#22d3ee', repair: '#f59e0b',
  validate: '#22c55e', deploy: '#3b82f6', audit: '#e879f9',
};

export function ScanResultTimeline({ incidentId, compact = false }: Props) {
  const { scans, loading } = useScanResults(incidentId);

  if (loading) return <div className="text-white/40 text-xs">Loading scanners...</div>;
  if (!scans.length) return <div className="text-white/40 text-xs">No scans yet</div>;

  const byStage = (stage: string) => scans.filter(s => s.agent_stage === stage);

  return (
    <div className="space-y-3">
      {STAGE_ORDER.map(stage => {
        const stageScans = byStage(stage);
        if (!stageScans.length) return null;

        const completed = stageScans.filter(s => s.status === 'completed').length;
        const failed = stageScans.filter(s => s.status === 'failed').length;

        return (
          <div key={stage} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: STAGE_COLORS[stage] }}>
                {stage}
              </span>
              <span className="text-[10px] text-white/30 ml-auto">
                {completed}/{stageScans.length} done {failed > 0 && `(${failed} failed)`}
              </span>
            </div>
            {!compact && (
              <div className="ml-4 space-y-1 border-l border-white/5 pl-3">
                {stageScans.map(scan => (
                  <div key={scan.id} className="flex items-center gap-2 text-xs">
                    <StatusIcon status={scan.status} />
                    <span className="text-white/60 flex-1">{scan.scanner_name}</span>
                    {scan.confidence_score != null && (
                      <span className="text-white/30">{scan.confidence_score}%</span>
                    )}
                    {Object.entries(scan.severity_counts || {}).some(([, v]) => (v as number) > 0) && (
                      <SeverityBadge counts={scan.severity_counts} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <Check className="w-3 h-3 text-[#a3e635]" />;
    case 'failed': return <X className="w-3 h-3 text-red-400" />;
    case 'running': return <Loader2 className="w-3 h-3 text-[#22d3ee] animate-spin" />;
    case 'skipped': return <SkipForward className="w-3 h-3 text-white/30" />;
    default: return <div className="w-3 h-3 rounded-full border border-white/20" />;
  }
}

function SeverityBadge({ counts }: { counts: Record<string, number> }) {
  const critical = (counts.critical || 0) as number;
  const high = (counts.high || 0) as number;
  if (critical > 0) return <span className="text-[10px] px-1 rounded bg-red-500/20 text-red-400">{critical}C</span>;
  if (high > 0) return <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400">{high}H</span>;
  return <AlertTriangle className="w-3 h-3 text-white/30" />;
}
