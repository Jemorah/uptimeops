// ═══════════════════════════════════════════════════════════════
// CUSTOMER BILLING — Subscription management, invoices, usage
// Uses real Supabase data + PLANS from constants
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { PLANS } from '@/lib/constants';
import {
  CreditCard, Zap, Check, Calendar, Shield, Clock,
  Server, FileCheck, Radio, Loader2, AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const PLAN_FEATURES: Record<string, string[]> = {
  guardian: [
    '3 incidents per month',
    '< 2h average response time',
    '6-agent AI repair pipeline',
    'Zero-knowledge credential vault',
    '72h credential auto-expiry',
    'Email notifications',
    'Full audit trail (SHA-256)',
    'Standard support',
  ],
  sentinel: [
    '10 incidents per month',
    '5 min average response time',
    '6-agent AI repair pipeline',
    'Zero-knowledge credential vault',
    '72h credential auto-expiry',
    'Email + dashboard alerts',
    'Full audit trail (SHA-256)',
    'Priority support',
    'Dedicated engineer pool',
    'Custom quiet hours',
  ],
  fortress: [
    'Unlimited incidents',
    '2 min average response time',
    '6-agent AI repair pipeline',
    'Zero-knowledge credential vault',
    '72h credential auto-expiry',
    'All notification channels',
    'Full audit trail (SHA-256)',
    '24/7 dedicated support',
    'Premium engineer pool',
    'Custom quiet hours',
    'Quarterly security review',
    'SOC 2 / HIPAA compliance export',
  ],
};

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  price_cents: number;
  billing_period: string;
  current_period_start: string;
  current_period_end: string;
  incidents_used: number;
  stripe_subscription_id?: string;
}

interface InvoiceData {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  description: string;
}

export function CustomerBilling() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }

      // Find customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) { setLoading(false); return; }

      // Load subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        setSubscription(sub);
        setSelectedPeriod(sub.billing_period === 'yearly' ? 'yearly' : 'monthly');
      }

      // Load invoices
      const { data: invs } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(12);

      setInvoices(invs || []);
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-lime animate-spin" />
        <span className="ml-2 text-sm text-white/40">Loading billing...</span>
      </div>
    );
  }

  const currentPlanKey = (subscription?.plan?.toLowerCase() || 'guardian') as keyof typeof PLANS;
  const currentPlan = PLANS[currentPlanKey] || PLANS.guardian;
  const incidentsUsed = subscription?.incidents_used || 0;
  const incidentsLimit = currentPlan.incidents;
  const incidentsPct = incidentsLimit >= 999 ? 0 : Math.min(100, (incidentsUsed / incidentsLimit) * 100);
  const isOverLimit = incidentsLimit < 999 && incidentsUsed >= incidentsLimit;

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight">SUBSCRIPTION</h2>
        <p className="text-sm text-white/40 mt-1">Manage your plan, usage, and billing history</p>
      </div>

      {/* Current Plan Card */}
      <div className="border border-lime/20 rounded-xl p-6 bg-lime/[0.02]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h3 className="text-lg font-black">{currentPlan.name} Plan</h3>
              <p className="text-sm text-white/40">
                {formatCurrency(subscription?.price_cents || currentPlan.price * 100)}/{subscription?.billing_period || 'month'} — billed {subscription?.billing_period || 'monthly'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/10 border border-lime/20">
              <Radio className="w-3 h-3 text-lime animate-pulse" />
              <span className="text-xs font-bold text-lime uppercase tracking-wider">
                {subscription?.status || 'active'}
              </span>
            </div>
          </div>
        </div>

        {/* Usage Bars */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-void rounded-lg p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40 flex items-center gap-1"><Server className="w-3 h-3" /> Incidents Used</span>
              <span className={`font-mono font-bold ${isOverLimit ? 'text-red-400' : 'text-white/70'}`}>
                {incidentsUsed}{incidentsLimit < 999 ? `/${incidentsLimit}` : ' (unlimited)'}
              </span>
            </div>
            {incidentsLimit < 999 && (
              <Progress value={incidentsPct} className="h-1.5" />
            )}
            {incidentsLimit >= 999 && (
              <div className="h-1.5 bg-lime/20 rounded-full" />
            )}
            {isOverLimit && (
              <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> You have exceeded your monthly incident limit. Upgrade to continue.
              </p>
            )}
          </div>
          <div className="bg-void rounded-lg p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" /> Response Time</span>
              <span className="font-mono font-bold text-white/70">{currentPlan.responseTime}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-lime/40 rounded-full" style={{ width: currentPlanKey === 'fortress' ? '100%' : currentPlanKey === 'sentinel' ? '60%' : '30%' }} />
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Calendar className="w-4 h-4" />
            {subscription?.current_period_end ? (
              <span>Next billing: {formatDate(subscription.current_period_end)}</span>
            ) : (
              <span>Current period active</span>
            )}
          </div>
          {subscription?.current_period_start && (
            <span className="text-xs text-white/20">
              Period: {formatDate(subscription.current_period_start)} — {formatDate(subscription.current_period_end)}
            </span>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-4">Available Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = currentPlanKey === key;
            const features = PLAN_FEATURES[key] || [];
            return (
              <div
                key={key}
                className={`border rounded-xl p-6 transition-all ${
                  isCurrent
                    ? 'border-lime/30 bg-lime/[0.03]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black uppercase tracking-wider">{plan.name}</h4>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-lime uppercase tracking-wider border border-lime/30 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black font-mono">${plan.price}</span>
                  <span className="text-sm text-white/40">/mo</span>
                </div>

                <div className="text-xs text-white/40 mb-4 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-lime" />
                  {plan.incidents >= 999 ? 'Unlimited incidents' : `${plan.incidents} incidents/mo`}
                  <span className="mx-1">·</span>
                  {plan.responseTime} response
                </div>

                <ul className="space-y-2 mb-6">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/50">
                      <Check className="w-3 h-3 text-lime mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled className="w-full py-2.5 rounded-lg bg-lime/10 border border-lime/20 text-lime text-xs font-bold uppercase tracking-wider cursor-default">
                    Active Plan
                  </button>
                ) : (
                  <button className="w-full py-2.5 rounded-lg border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider hover:border-lime/30 hover:text-lime transition-all">
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white/60">
          <CreditCard className="w-4 h-4 text-lime" />
          Payment Method
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gradient-to-r from-yellow-700 to-yellow-500 rounded-md flex items-center justify-center">
            <span className="text-[10px] font-bold text-black/60">VISA</span>
          </div>
          <div>
            <div className="text-sm font-medium">Visa ending in 4242</div>
            <div className="text-xs text-white/40 font-mono">Expires 12/2027</div>
          </div>
          <button className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">
            Update
          </button>
        </div>
      </div>

      {/* Invoice History */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-lime" />
            Invoice History
          </h3>
          <span className="text-xs text-white/20">{invoices.length} total</span>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">
            <FileCheck className="w-6 h-6 mx-auto mb-2 text-white/10" />
            No invoices yet. They will appear here after your first billing cycle.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {invoices.map(inv => (
              <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-white/50">{inv.id}</span>
                  <span className="text-sm text-white/40">{formatDate(inv.created_at)}</span>
                  <span className="text-xs text-white/30">{inv.description || 'Monthly subscription'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono font-bold">{formatCurrency(inv.amount_cents)}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    inv.status === 'paid'
                      ? 'text-lime border-lime/20 bg-lime/5'
                      : inv.status === 'pending'
                      ? 'text-white/40 border-white/10 bg-white/5'
                      : 'text-white/40 border-white/10 bg-white/5'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
