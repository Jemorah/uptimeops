// ═══════════════════════════════════════════════════════════════
// AI LOG VIEWER — v2.1
// Shows AI pipeline logs from scan_results. No mock data.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Search, Terminal, BrainCircuit, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { AILogEntry } from './types';

interface AiLogViewerProps {
  incidentId: string;
}

const categoryIcons: Record<string, typeof Terminal> = {
  infrastructure: Terminal,
  reasoning: BrainCircuit,
  analysis: Clock,
  planning: BrainCircuit,
  recovery: AlertTriangle,
};

const categoryColors: Record<string, string> = {
  infrastructure: '#a3e635', reasoning: '#22d3ee', analysis: '#eab308',
  planning: '#a855f7', recovery: '#e879f9',
};

export function AiLogViewer({ incidentId }: AiLogViewerProps) {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('scan_results')
          .select('scanner_name, agent_stage, status, findings, confidence_score, execution_time_ms, created_at')
          .eq('incident_id', incidentId)
          .order('created_at', { ascending: true });

        if (dbError) throw dbError;

        const mapped: AILogEntry[] = (data || []).map((s: any, i: number) => ({
          id: `ailog-${i}`,
          timestamp: s.created_at,
          category: s.agent_stage || 'infrastructure',
          agent: s.scanner_name || 'Unknown',
          message: `${s.scanner_name} scan ${s.status}${s.confidence_score ? ` (${s.confidence_score}%)` : ''}`,
          details: JSON.stringify(s.findings || {}, null, 2).slice(0, 200),
          severity: s.status === 'failed' ? 'error' : s.confidence_score && s.confidence_score < 50 ? 'warning' : 'info',
        }));

        setLogs(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AI logs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [incidentId]);

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    return log.message.toLowerCase().includes(q) || log.agent.toLowerCase().includes(q) || log.details.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white/80">AI AGENT LOGS</h3>
          <span className="text-xs text-white/30">Loading...</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#a3e635] animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white/80">AI AGENT LOGS</h3>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/80">AI AGENT LOGS</h3>
        <span className="text-xs text-white/30">{filteredLogs.length} entries</span>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-xs pl-7 pr-2 py-1.5 font-mono placeholder-white/20 focus:outline-none focus:border-[#a3e635]/30"
        />
      </div>

      {filteredLogs.length === 0 && (
        <p className="text-xs text-white/30 py-4 text-center">
          {search ? 'No logs match your search.' : 'No AI logs yet. Run a scan to generate logs.'}
        </p>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredLogs.map((log, index) => {
          const Icon = categoryIcons[log.category] || Terminal;
          const color = categoryColors[log.category] || '#a3e635';
          const sevBorder = log.severity === 'error' ? 'border-red-500/30' : log.severity === 'warning' ? 'border-yellow-500/30' : 'border-white/5';
          return (
            <div key={log.id} className={`p-2 bg-black/30 border ${sevBorder} hover:bg-white/[0.02] transition-colors`}>
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-white/20 font-mono mt-0.5 w-6 text-right">{index + 1}</span>
                <Icon className="w-3 h-3 mt-0.5" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-white/30 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[10px] font-bold" style={{ color }}>{log.agent}</span>
                    {log.severity === 'error' && <span className="text-[9px] text-red-400 font-bold">ERROR</span>}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 font-mono">{log.message}</p>
                  {log.details && <p className="text-[10px] text-white/30 mt-1 font-mono truncate">{log.details}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
