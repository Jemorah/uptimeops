// UptimeOps v2.1 — Scanner Registry Grid
// Grid of 42 scanner cards. Filter by category.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ScanLine, Check, X } from 'lucide-react';

interface Scanner {
  id: string;
  name: string;
  category: string;
  tool_type: string;
  version: string;
  command_template: string;
  output_format: string;
  is_active: boolean;
  severity_rules: Record<string, string[]>;
}

const CATEGORIES = ['all', 'triage', 'isolate', 'repair', 'validate', 'deploy', 'audit'] as const;
const CAT_COLORS: Record<string, string> = {
  triage: '#a3e635', isolate: '#22d3ee', repair: '#f59e0b',
  validate: '#22c55e', deploy: '#3b82f6', audit: '#e879f9',
};

export function ScannerRegistry({ compact = false }: { compact?: boolean }) {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Scanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('scanner_registry').select('*').order('category').then(({ data }) => {
      setScanners(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? scanners : scanners.filter(s => s.category === filter);
  const byCat = (cat: string) => scanners.filter(s => s.category === cat).length;

  if (loading) return <div className="text-white/40 text-xs">Loading scanners...</div>;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <ScanLine className="w-4 h-4 text-[#a3e635]" />
            <span className="font-bold text-white">{scanners.length}</span> scanners
            <span className="text-white/30">|</span>
            <span className="text-[#a3e635]">{scanners.filter(s => s.is_active).length}</span> active
          </div>
          <div className="flex gap-1.5 ml-auto">
            {CATEGORIES.filter(c => c !== 'all').map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? 'all' : cat)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  filter === cat ? 'text-black' : 'text-white/50 hover:text-white'
                }`}
                style={filter === cat ? { backgroundColor: CAT_COLORS[cat] } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                {cat} ({byCat(cat)})
              </button>
            ))}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-[10px] text-white/30 hover:text-white underline">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {filtered.map(scanner => (
          <button
            key={scanner.id}
            onClick={() => setSelected(selected?.id === scanner.id ? null : scanner)}
            className={`text-left p-3 rounded-lg border transition-all hover:border-white/10 ${
              selected?.id === scanner.id
                ? 'bg-white/5 border-white/20'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CAT_COLORS[scanner.category] }} />
              <span className="text-xs font-bold text-white/90 truncate flex-1">{scanner.name}</span>
              {scanner.is_active ? (
                <Check className="w-3 h-3 text-[#a3e635] shrink-0" />
              ) : (
                <X className="w-3 h-3 text-white/30 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${CAT_COLORS[scanner.category]}15`, color: CAT_COLORS[scanner.category] }}
              >
                {scanner.category}
              </span>
              <span className="text-[10px] text-white/30">{scanner.tool_type}</span>
            </div>
            {selected?.id === scanner.id && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                <p className="text-[10px] text-white/40">Format: <span className="text-white/60">{scanner.output_format}</span></p>
                <p className="text-[10px] text-white/40 font-mono break-all">{scanner.command_template}</p>
                {Object.keys(scanner.severity_rules || {}).length > 0 && (
                  <p className="text-[10px] text-white/40">
                    Rules: <span className="text-white/60">{Object.keys(scanner.severity_rules).join(', ')}</span>
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
