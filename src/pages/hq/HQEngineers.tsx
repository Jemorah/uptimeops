// ═══════════════════════════════════════════════════════════════
// HQ ENGINEERS — Real engineer profiles from Supabase
// Monochrome + lime palette
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Terminal, Loader2, Radio, Clock, Users } from 'lucide-react';

interface Engineer {
  id: string;
  name: string;
  email: string;
  specialization: string[];
  is_on_call: boolean;
  status: string;
  created_at: string;
}

export function HQEngineers() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('engineer_profiles').select('*').order('created_at', { ascending: false });
      setEngineers(data || []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel('hq-eng').on('postgres_changes', { event: '*', schema: 'public', table: 'engineer_profiles' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = engineers.filter(e => filter === 'all' || e.status === filter || (filter === 'on_call' && e.is_on_call));
  const onCallCount = engineers.filter(e => e.is_on_call).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading engineers...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">ENGINEERS</h2>
          <p className="text-sm text-white/40 mt-1">{engineers.length} total · {onCallCount} on call</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/8 border border-lime/15">
          <Radio className="w-3 h-3 text-lime animate-pulse" />
          <span className="text-xs font-bold text-lime uppercase tracking-wider">{onCallCount} on call</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'available', 'on_call'].map(status => (
          <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${filter === status ? 'border-lime text-lime bg-lime/10' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
            {status === 'on_call' ? 'On Call' : status}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(eng => (
          <div key={eng.id} className="bg-surface border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-white/40">{(eng.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${eng.is_on_call ? 'bg-lime' : 'bg-white/20'}`} />
                    <h3 className="text-sm font-bold">{eng.name || 'Unnamed'}</h3>
                  </div>
                  <p className="text-xs text-white/40 font-mono">{eng.email}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-white/30">{eng.id?.slice(0, 8)}</span>
            </div>

            {eng.is_on_call && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-lime/5 border border-lime/15 rounded-lg">
                <Terminal className="w-3 h-3 text-lime" />
                <span className="text-xs font-mono text-lime">Currently On Call</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mb-4">
              {(eng.specialization || []).map(spec => (
                <span key={spec} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 border border-white/5 rounded-full">{spec}</span>
              ))}
              {(!eng.specialization || eng.specialization.length === 0) && <span className="text-[10px] text-white/20">No specializations</span>}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-xs text-white/25 flex items-center gap-1"><Clock className="w-3 h-3" />{eng.status || 'active'}</span>
              <button className="text-xs text-lime hover:underline font-bold">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-10 text-center">
          <Users className="w-8 h-8 mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/30">No engineers match the filter</p>
        </div>
      )}
    </div>
  );
}
