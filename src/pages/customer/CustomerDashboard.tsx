// ═══════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD — Enhanced: activity feed, health status,
// usage trends, quick actions, audit trail preview
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { PLANS } from '@/lib/constants';
import { useSecurityScore } from '@/hooks/useSecurityScore';
import { SecurityScoreCard } from '@/components/security/SecurityScoreCard';
import {
  AlertTriangle, CheckCircle, Clock, Shield, Zap, ArrowRight,
  Loader2, Activity, FileCheck, Lock, Radio, TrendingUp,
  Server, ChevronRight, Eye, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Incident { id: string; title: string; status: string; priority: string; website_url: string; created_at: string; }
interface AuditEntry { id: string; action: string; table_name: string; created_at: string; details: Record<string, unknown>; }
interface SubscriptionData { plan: string; status: string; price_cents: number; billing_period: string; incidents_used: number; current_period_end: string; }

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { score: securityScore } = useSecurityScore(null, customerId);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!customer) { setLoading(false); return; }
      setCustomerId(customer.id);

      // Incidents
      const { data: incs } = await supabase.from('incidents').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(10);
      setIncidents(incs || []);

      // Subscription
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setSubscription(sub);

      // Audit trail
      const { data: audits } = await supabase.from('audit_logs').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(8);
      setAuditTrail(audits || []);

      setLoading(false);
    }
    load();
    const ch = supabase.channel('dash').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading dashboard...</span>
    </div>
  );

  const open = incidents.filter(i => !['resolved','closed'].includes(i.status)).length;
  const resolved = incidents.filter(i => ['resolved','closed'].includes(i.status)).length;
  const total = incidents.length;
  const planKey = (subscription?.plan?.toLowerCase() || 'guardian') as keyof typeof PLANS;
  const plan = PLANS[planKey] || PLANS.guardian;
  const incUsed = subscription?.incidents_used || 0;
  const incLimit = plan.incidents;
  const incPct = incLimit >= 999 ? 0 : Math.min(100, (incUsed / incLimit) * 100);
  const daysLeft = subscription?.current_period_end ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000)) : 0;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Overview of your infrastructure health</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/customer/vault')} className="border-white/10 hover:bg-white/5 text-white/60">
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Vault
          </Button>
          <Button size="sm" onClick={() => navigate('/customer/incidents')} className="bg-lime text-black hover:bg-lime/90">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Report Issue
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open Issues', value: open, icon: Clock, sub: open > 0 ? `${open} need attention` : 'All clear', accent: open > 0 },
          { label: 'Resolved', value: resolved, icon: CheckCircle, sub: 'This month', accent: false },
          { label: 'Total', value: total, icon: Activity, sub: 'All time', accent: false },
          { label: 'Health Score', value: total === 0 ? '100%' : `${Math.round((resolved / total) * 100)}%`, icon: TrendingUp, sub: 'Resolution rate', accent: false },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 bg-white/[0.02] ${s.accent ? 'border-lime/20' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.accent ? 'text-lime' : 'text-white/30'}`} />
              <span className="text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Incidents & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Incidents */}
          <div className="border border-white/10 rounded-xl bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-lime" /> Recent Incidents</h2>
              <button onClick={() => navigate('/customer/incidents')} className="text-xs text-lime hover:underline flex items-center gap-0.5">View All <ArrowRight className="w-3 h-3" /></button>
            </div>
            {incidents.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3 text-lime/20" />
                <p className="text-sm text-white/50 font-medium">No incidents on record</p>
                <p className="text-xs text-white/30 mt-1">Your infrastructure is running smoothly</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {incidents.slice(0, 5).map(inc => (
                  <button key={inc.id} onClick={() => navigate('/customer/incidents')} className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left group">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${inc.priority === 'P1_CRITICAL' ? 'bg-white/50' : inc.priority === 'P2_HIGH' ? 'bg-white/35' : 'bg-white/20'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-white/80 transition-colors">{inc.title}</div>
                      <div className="text-[11px] text-white/30 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{inc.id?.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{inc.website_url}</span>
                        <span>·</span>
                        <span>{fmtDate(inc.created_at)}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      inc.status === 'resolved' ? 'text-lime border-lime/20 bg-lime/5' :
                      inc.status === 'repairing' ? 'text-white/50 border-white/10 bg-white/5' :
                      'text-white/40 border-white/10'
                    }`}>{inc.status}</span>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="border border-white/10 rounded-xl bg-white/[0.02]">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2"><Eye className="w-4 h-4 text-lime" /> Audit Activity</h2>
              <span className="text-[10px] text-white/20">{auditTrail.length} entries</span>
            </div>
            {auditTrail.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/30">Audit trail will populate as activity occurs</div>
            ) : (
              <div className="divide-y divide-white/5">
                {auditTrail.map(entry => (
                  <div key={entry.id} className="px-5 py-3 flex items-center gap-3">
                    <FileCheck className="w-3.5 h-3.5 text-white/25 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white/50">{entry.action}</span>
                      <span className="text-[10px] text-white/25 ml-2 font-mono">{entry.table_name}</span>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">{fmtDate(entry.created_at)} {fmtTime(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Subscription & Quick Info */}
        <div className="space-y-6">
          {/* Security Score */}
          {securityScore > 0 && (
            <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a3e635]" /> Security Score
                </h3>
              </div>
              <SecurityScoreCard score={securityScore} size="md" />
            </div>
          )}

          {/* No active plan banner */}
          {!subscription || subscription.status !== 'active' ? (
            <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">No Active Protection</span>
              </div>
              <p className="text-[11px] text-white/40 mb-3">Subscribe to get 42-scanner security coverage.</p>
              <button onClick={() => navigate('/customer/billing')} className="w-full px-3 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all">
                View Plans
              </button>
            </div>
          ) : null}

          {/* Subscription Status */}
          <div className="border border-lime/15 rounded-xl p-5 bg-lime/[0.015]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-lime/10 flex items-center justify-center"><Shield className="w-4 h-4 text-lime" /></div>
              <div>
                <div className="text-sm font-black">{plan.name}</div>
                <div className="text-[11px] text-white/40">${plan.price}/month</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-lime/8 border border-lime/15">
                <Radio className="w-2.5 h-2.5 text-lime animate-pulse" />
                <span className="text-[10px] font-bold text-lime uppercase">{subscription?.status || 'active'}</span>
              </div>
            </div>

            {/* Incident usage */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-white/40 flex items-center gap-1"><Server className="w-3 h-3" /> Incidents</span>
                  <span className="font-mono text-white/60">{incUsed}{incLimit < 999 ? `/${incLimit}` : ''}</span>
                </div>
                {incLimit < 999 ? <Progress value={incPct} className="h-1" /> : <div className="h-1 bg-lime/15 rounded-full" />}
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-white/40">Response SLA</span>
                  <span className="font-mono text-white/60">{plan.responseTime}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-lime/30 rounded-full" style={{ width: planKey === 'fortress' ? '100%' : planKey === 'sentinel' ? '60%' : '30%' }} /></div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-white/30">{daysLeft} days left</span>
              <button onClick={() => navigate('/customer/billing')} className="text-[11px] text-lime hover:underline font-bold uppercase tracking-wider">Manage</button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="border border-white/10 rounded-xl bg-white/[0.02]">
            <div className="p-4 border-b border-white/5"><h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Quick Access</h3></div>
            <div className="divide-y divide-white/5">
              {[
                { label: 'Incident History', path: '/customer/incidents', icon: FileCheck, desc: 'View all issues' },
                { label: 'Credential Vault', path: '/customer/vault', icon: Lock, desc: 'Manage access keys' },
                { label: 'Subscription', path: '/customer/billing', icon: Zap, desc: 'Plan & billing' },
                { label: 'Settings', path: '/customer/settings', icon: Server, desc: 'Preferences' },
              ].map(link => (
                <button key={link.path} onClick={() => navigate(link.path)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left group">
                  <link.icon className="w-4 h-4 text-white/30 group-hover:text-lime transition-colors shrink-0" />
                  <div className="flex-1 min-w-0"><div className="text-xs font-medium">{link.label}</div><div className="text-[10px] text-white/25">{link.desc}</div></div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
