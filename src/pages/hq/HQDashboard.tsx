// ═══════════════════════════════════════════════════════════════
// HQ CONTROL CENTER — Coordinator/Admin overview
// Real-time analytics, incident queue, engineer status
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import {
  AlertTriangle, CheckCircle, Users, Zap,
  TrendingUp, DollarSign, ArrowRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HQDashboard() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    open: 0, critical: 0, customers: 0, mrr: 0,
    onCall: 0, resolved24h: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Run all queries in parallel for speed
        const [incResult, custResult, engResult] = await Promise.all([
          supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('customers').select('*').limit(100),
          supabase.from('engineer_profiles').select('*'),
        ]);

        if (cancelled) return;

        const incs = incResult.data || [];
        const custs = custResult.data || [];
        const engs = engResult.data || [];

        // Log any errors for debugging
        if (incResult.error) console.error('[HQDashboard] incidents error:', incResult.error.message);
        if (custResult.error) console.error('[HQDashboard] customers error:', custResult.error.message);
        if (engResult.error) console.error('[HQDashboard] engineers error:', engResult.error.message);

        const activeIncs = incs.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed');
        const totalMrr = custs.reduce((sum: number, c: any) => sum + (c.mrr || 0), 0);

        setIncidents(activeIncs);
        setCustomers(custs);
        setEngineers(engs);
        setStats({
          open: activeIncs.length,
          critical: activeIncs.filter((i: any) => i.priority === 'P1_CRITICAL').length,
          customers: custs.length,
          mrr: totalMrr,
          onCall: engs.filter((e: any) => e.is_on_call).length,
          resolved24h: incs.filter((i: any) => i.resolved_at && new Date(i.resolved_at) > new Date(Date.now() - 86400000)).length,
        });
        setError(null);
      } catch (err: any) {
        console.error('[HQDashboard] load exception:', err?.message);
        if (!cancelled) setError(err?.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Real-time updates for incidents
    const channel = supabase
      .channel('hq-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs text-[#a3e635] hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Zap className="w-6 h-6 text-[#a3e635] animate-pulse mx-auto" />
          <p className="text-white/40 text-sm animate-pulse">Loading control center...</p>
        </div>
      </div>
    );
  }

  // Dashboard content
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Control Center</h1>
          <p className="text-sm text-white/40 mt-1">Real-time operations overview</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/hq/approvals')} variant="outline" className="border-white/10 hover:bg-white/5">
            <Shield className="w-4 h-4 mr-2" /> Approvals
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Open Incidents', value: stats.open, icon: AlertTriangle, color: 'text-white/40' },
          { label: 'P1 Critical', value: stats.critical, icon: Zap, color: 'text-white/60' },
          { label: 'Customers', value: stats.customers, icon: Users, color: 'text-[#22d3ee]' },
          { label: 'MRR', value: `$${stats.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-[#a3e635]' },
          { label: 'Engineers On-Call', value: stats.onCall, icon: TrendingUp, color: 'text-[#a3e635]' },
          { label: 'Resolved 24h', value: stats.resolved24h, icon: CheckCircle, color: 'text-[#22d3ee]' },
        ].map(s => (
          <div key={s.label} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Incidents */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold">Active Incidents</h2>
          <button onClick={() => navigate('/hq/incidents')} className="text-xs text-[#a3e635] hover:underline">
            View All
          </button>
        </div>
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#a3e635]" />
            All systems operational.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {incidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => navigate('/hq/incidents')}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  inc.priority === 'P1_CRITICAL' ? 'bg-white/50' :
                  inc.priority === 'P2_HIGH' ? 'bg-white/35' : 'bg-white/20'
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

      {/* Engineer Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-white/10 rounded-xl bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold">Engineer Status</h2>
          </div>
          <div className="divide-y divide-white/5">
            {engineers.map(eng => (
              <div key={eng.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${eng.is_on_call ? 'bg-[#a3e635]' : 'bg-white/20'}`} />
                <div className="flex-1">
                  <div className="text-sm">{eng.name || 'Unnamed'}</div>
                  <div className="text-xs text-white/40">
                    {eng.active_incident_count || 0} active — {eng.total_resolved || 0} resolved
                  </div>
                </div>
              </div>
            ))}
            {engineers.length === 0 && (
              <div className="p-4 text-xs text-white/20 text-center">No engineers yet</div>
            )}
          </div>
        </div>

        <div className="border border-white/10 rounded-xl bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold">Customers</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {customers.slice(0, 10).map(c => (
              <div key={c.id} className="px-5 py-3">
                <div className="text-sm">{c.company_name || c.email}</div>
                <div className="text-xs text-white/40">{c.plan} — ${c.mrr}/mo — {c.status}</div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="p-4 text-xs text-white/20 text-center">No customers yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
