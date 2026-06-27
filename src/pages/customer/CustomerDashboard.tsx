// ═══════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD — Overview of incidents, subscription, status
// Monochrome + lime accent palette only
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle, Clock, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, total: 0 });
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) { setLoading(false); return; }

      const { data: incs } = await supabase
        .from('incidents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setIncidents(incs || []);
      setStats({
        open: (incs || []).filter(i => !['resolved', 'closed'].includes(i.status)).length,
        resolved: (incs || []).filter(i => ['resolved', 'closed'].includes(i.status)).length,
        total: (incs || []).length,
      });

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(sub);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel('customer-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-lime animate-spin" />
        <span className="ml-2 text-sm text-white/40">Loading dashboard...</span>
      </div>
    );
  }

  const planName = subscription?.plan || 'Guardian';
  const planPrice = subscription ? `$${(subscription.price_cents / 100).toFixed(0)}/mo` : 'Free';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Welcome back, {user?.email}</p>
        </div>
        <Button onClick={() => navigate('/customer/incidents')} className="bg-lime text-black hover:bg-lime/90">
          <AlertTriangle className="w-4 h-4 mr-2" /> Report Incident
        </Button>
      </div>

      {/* Stats — monochrome + lime only */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: stats.open, icon: Clock },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle },
          { label: 'Total', value: stats.total, icon: Zap },
        ].map(s => (
          <div key={s.label} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            <s.icon className="w-5 h-5 text-white/40 mb-2" />
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subscription */}
      <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-lime" />
            <div>
              <div className="text-sm font-bold">{planName} Plan</div>
              <div className="text-xs text-white/40">{planPrice} — {subscription?.status || 'active'}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/customer/billing')} className="border-white/10 hover:bg-white/5 text-white/60">
            Manage <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold">Recent Incidents</h2>
          <button onClick={() => navigate('/customer/incidents')} className="text-xs text-lime hover:underline">
            View All
          </button>
        </div>
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">
            <Zap className="w-8 h-8 mx-auto mb-2 text-white/10" />
            No incidents yet. That is great news!
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {incidents.map(inc => (
              <button
                key={inc.id}
                onClick={() => navigate('/customer/incidents')}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  inc.priority === 'P1_CRITICAL' ? 'bg-white/60' :
                  inc.priority === 'P2_HIGH' ? 'bg-white/40' :
                  'bg-white/20'
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
    </div>
  );
}
