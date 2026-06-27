// ═══════════════════════════════════════════════════════════════
// ENGINEER DASHBOARD — Active incidents, workload, quick actions
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, Radio, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EngineerDashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState({ critical: 0, high: 0, myAssigned: 0 });
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Active incidents
      const { data: incs } = await supabase
        .from('incidents')
        .select('*')
        .not('status', 'in', '(resolved,closed)')
        .order('created_at', { ascending: false });

      setIncidents(incs || []);
      setStats({
        critical: (incs || []).filter(i => i.priority === 'P1_CRITICAL').length,
        high: (incs || []).filter(i => i.priority === 'P2_HIGH').length,
        myAssigned: (incs || []).filter(i => i.assigned_engineer_id !== null).length,
      });

      // Engineer profiles
      const { data: engs } = await supabase
        .from('engineer_profiles')
        .select('id, name, is_on_call, active_incident_count, total_resolved')
        .order('is_on_call', { ascending: false });

      setEngineers(engs || []);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('engineer-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/40 text-sm animate-pulse">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Engineer Workspace</h1>
          <p className="text-sm text-white/40 mt-1">Active incidents and assignments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/engineer/oncall')} variant="outline" className="border-white/10 hover:bg-white/5">
            <Radio className="w-4 h-4 mr-2" /> On-Call Status
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'P1 Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'P2 High', value: stats.high, icon: Clock, color: 'text-amber-400' },
          { label: 'Assigned', value: stats.myAssigned, icon: User, color: 'text-[#22d3ee]' },
        ].map(s => (
          <div key={s.label} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Incidents */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold">Active Incidents</h2>
        </div>
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#a3e635]" />
            All clear! No active incidents.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {incidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => navigate(`/engineer/workspace/${inc.id}`)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  inc.priority === 'P1_CRITICAL' ? 'bg-red-500' :
                  inc.priority === 'P2_HIGH' ? 'bg-amber-400' : 'bg-[#22d3ee]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{inc.title}</div>
                  <div className="text-xs text-white/40">{inc.status} — {inc.website_url}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Engineers */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-bold">Engineer Team</h2>
        </div>
        <div className="divide-y divide-white/5">
          {engineers.map(eng => (
            <div key={eng.id} className="px-5 py-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${eng.is_on_call ? 'bg-[#a3e635]' : 'bg-white/20'}`} />
              <div className="flex-1">
                <div className="text-sm">{eng.name || 'Unnamed'}</div>
                <div className="text-xs text-white/40">
                  {eng.is_on_call ? 'On-call' : 'Off-duty'} — {eng.active_incident_count} active — {eng.total_resolved} resolved
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
