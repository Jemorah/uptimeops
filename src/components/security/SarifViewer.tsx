// UptimeOps v2.1 — SARIF Viewer
// Renders SARIF findings with file/line annotations

import { FileWarning, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SarifResult {
  ruleId: string;
  message: { text: string };
  level: string;
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri?: string };
      region?: { startLine?: number; startColumn?: number };
    };
  }>;
}

interface Props {
  results: SarifResult[];
}

const LEVEL_COLORS: Record<string, string> = {
  error: '#ef4444', warning: '#eab308', note: '#22d3ee', none: '#666',
};

export function SarifViewer({ results }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!results?.length) return <p className="text-xs text-white/30">No SARIF results</p>;

  const toggle = (i: number) => {
    const next = new Set(expanded);
    next.has(i) ? next.delete(i) : next.add(i);
    setExpanded(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <FileWarning className="w-4 h-4 text-[#e879f9]" />
        <span className="text-xs font-bold text-white/80">{results.length} Findings</span>
      </div>
      {results.map((r, i) => {
        const loc = r.locations?.[0]?.physicalLocation;
        const file = loc?.artifactLocation?.uri;
        const line = loc?.region?.startLine;
        const color = LEVEL_COLORS[r.level] || '#666';

        return (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggle(i)} className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-white/[0.02] transition-all">
              {expanded.has(i) ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-mono text-white/40 shrink-0">{r.ruleId}</span>
              <span className="text-xs text-white/70 flex-1 truncate">{r.message.text}</span>
              {file && <span className="text-[10px] text-white/30 font-mono shrink-0">{file}:{line}</span>}
            </button>
            {expanded.has(i) && (
              <div className="px-4 pb-3 border-t border-white/5">
                <p className="text-xs text-white/60 mt-2">{r.message.text}</p>
                {file && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg">
                    <p className="text-[10px] text-white/40 font-mono">{file}{line ? `:${line}` : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
