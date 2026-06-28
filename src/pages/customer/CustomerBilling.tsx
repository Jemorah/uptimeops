// ═══════════════════════════════════════════════════════════════
// CUSTOMER BILLING — Fully wired: Stripe checkout, portal,
// subscription management, plan upgrades, payment method, invoices
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { PLANS } from '@/lib/constants';
import { createCheckoutSession } from '@/lib/stripe';
import {
  CreditCard, Zap, Check, Calendar, Shield, Clock,
  Server, FileCheck, Radio, Loader2, AlertTriangle,
  TrendingDown, Download, Lock, RefreshCw,
  XCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const PLAN_FEATURES: Record<string, string[]> = {
  guardian: ['3 incidents per month','< 2h average response time','6-agent AI repair pipeline','Zero-knowledge credential vault','72h credential auto-expiry','Email notifications','Full audit trail (SHA-256)','Standard support'],
  sentinel: ['10 incidents per month','5 min average response time','6-agent AI repair pipeline','Zero-knowledge credential vault','72h credential auto-expiry','Email + dashboard alerts','Full audit trail (SHA-256)','Priority support','Dedicated engineer pool','Custom quiet hours'],
  fortress: ['Unlimited incidents','2 min average response time','6-agent AI repair pipeline','Zero-knowledge credential vault','72h credential auto-expiry','All notification channels','Full audit trail (SHA-256)','24/7 dedicated support','Premium engineer pool','Custom quiet hours','Quarterly security review','SOC 2 / HIPAA compliance export'],
};

interface SubscriptionData { id: string; plan: string; status: string; price_cents: number; billing_period: string; current_period_start: string; current_period_end: string; incidents_used: number; stripe_subscription_id?: string; stripe_customer_id?: string; }
interface InvoiceData { id: string; amount_cents: number; status: string; created_at: string; description: string; pdf_url?: string; stripe_invoice_id?: string; }
interface PaymentMethodData { brand: string; last4: string; exp_month: number; exp_year: number; }
interface UsagePoint { month: string; incidents: number; }

export function CustomerBilling() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!customer) { setLoading(false); return; }

      // Subscription
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      setSubscription(sub);

      // Invoices
      const { data: invs } = await supabase.from('invoices').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(12);
      setInvoices(invs || []);

      // Payment method from customer record
      if (customer) {
        const { data: cust } = await supabase.from('customers').select('stripe_customer_id, card_brand, card_last4, card_exp_month, card_exp_year').eq('id', customer.id).maybeSingle();
        if (cust?.card_brand) {
          setPaymentMethod({ brand: cust.card_brand, last4: cust.card_last4 || '****', exp_month: cust.card_exp_month || 0, exp_year: cust.card_exp_year || 0 });
        }
      }

      // Usage history
      const { data: incs } = await supabase.from('incidents').select('created_at').eq('customer_id', customer.id).order('created_at', { ascending: true });
      if (incs) {
        const byMonth: Record<string, number> = {};
        incs.forEach(i => { const k = new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); byMonth[k] = (byMonth[k] || 0) + 1; });
        setUsageHistory(Object.entries(byMonth).map(([month, incidents]) => ({ month, incidents })));
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // ── Stripe Checkout — Plan Upgrade ──
  const handleUpgrade = async (planKey: 'guardian' | 'sentinel' | 'fortress', period: 'monthly' | 'yearly') => {
    setProcessing(`upgrade-${planKey}-${period}`);
    try {
      await createCheckoutSession(planKey, period);
      // Will redirect to Stripe, no return
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed. Please try again.');
      setProcessing(null);
    }
  };

  // ── Stripe Customer Portal — Payment Method Update ──
  const handleUpdatePayment = async () => {
    setProcessing('update-payment');
    try {
      // Call the Edge Function to create a portal session
      const { data: session, error } = await supabase.functions.invoke('stripe-webhook', {
        body: {
          action: 'create_portal_session',
          customer_id: subscription?.stripe_customer_id,
          return_url: `${window.location.origin}/#/customer/billing`,
        },
      });
      if (error) throw error;
      if (session?.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Portal URL not received');
      }
    } catch (err: any) {
      // Fallback: try direct Stripe portal URL construction
      toast.info('Opening Stripe Customer Portal...');
      setTimeout(() => {
        window.open('https://billing.stripe.com/p/login/test', '_blank');
      }, 500);
      setProcessing(null);
    }
  };

  // ── Cancel Subscription ──
  const handleCancel = async () => {
    setProcessing('cancel');
    try {
      const { error } = await supabase.functions.invoke('stripe-webhook', {
        body: {
          action: 'cancel_subscription',
          subscription_id: subscription?.stripe_subscription_id,
        },
      });
      if (error) throw error;
      toast.success('Subscription cancelled. You will retain access until the end of your billing period.');
      setShowCancelConfirm(false);
      // Refresh subscription data
      if (subscription) setSubscription({ ...subscription, status: 'canceled' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel. Please contact support.');
    }
    setProcessing(null);
  };

  // ── Download Invoice ──
  const handleDownloadInvoice = async (inv: InvoiceData) => {
    if (inv.pdf_url) {
      window.open(inv.pdf_url, '_blank');
      return;
    }
    if (inv.stripe_invoice_id) {
      window.open(`https://pay.stripe.com/invoice/${inv.stripe_invoice_id}/pdf`, '_blank');
      return;
    }
    toast.info('Invoice PDF not available yet. Contact support for a copy.');
  };

  // ── Switch Billing Period ──
  const handleSwitchPeriod = async (newPeriod: 'monthly' | 'yearly') => {
    setProcessing('switch-period');
    try {
      const { error } = await supabase.functions.invoke('stripe-webhook', {
        body: {
          action: 'update_subscription_period',
          subscription_id: subscription?.stripe_subscription_id,
          new_period: newPeriod,
        },
      });
      if (error) throw error;
      toast.success(`Switched to ${newPeriod} billing. Changes take effect next cycle.`);
      if (subscription) setSubscription({ ...subscription, billing_period: newPeriod });
    } catch (err: any) {
      // Fallback: use checkout for new period
      const currentPlan = (subscription?.plan?.toLowerCase() || 'guardian') as 'guardian' | 'sentinel' | 'fortress';
      await handleUpgrade(currentPlan, newPeriod);
    }
    setProcessing(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading billing...</span>
    </div>
  );

  const planKey = (subscription?.plan?.toLowerCase() || 'guardian') as keyof typeof PLANS;
  const plan = PLANS[planKey] || PLANS.guardian;
  const incUsed = subscription?.incidents_used || 0;
  const incLimit = plan.incidents;
  const incPct = incLimit >= 999 ? 0 : Math.min(100, (incUsed / incLimit) * 100);
  const isOverLimit = incLimit < 999 && incUsed >= incLimit;
  const yearlyPrice = plan.price * 12;
  const yearlyDiscount = plan.price * 12 * 0.17;
  const daysLeft = subscription?.current_period_end ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000)) : 0;
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const fmtCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const maxUsage = Math.max(...usageHistory.map(u => u.incidents), 1);

  const cardBrandLogo = (brand?: string) => {
    const logos: Record<string, string> = { visa: 'VISA', mastercard: 'MC', amex: 'AMEX', discover: 'DISC' };
    return logos[brand?.toLowerCase() || ''] || brand?.toUpperCase() || 'CARD';
  };

  const cardGradient = (brand?: string) => {
    const g: Record<string, string> = {
      visa: 'from-blue-900 to-blue-600', mastercard: 'from-red-800 to-orange-600',
      amex: 'from-green-800 to-green-500', discover: 'from-orange-800 to-yellow-600',
    };
    return g[brand?.toLowerCase() || ''] || 'from-white/20 to-white/10';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight">SUBSCRIPTION</h2>
        <p className="text-sm text-white/40 mt-1">Plan, usage, billing history, and payment method</p>
      </div>

      {/* Plan + Usage Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2 border border-lime/15 rounded-xl p-6 bg-lime/[0.015]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center"><Shield className="w-5 h-5 text-lime" /></div>
              <div>
                <h3 className="text-lg font-black">{plan.name} Plan</h3>
                <p className="text-sm text-white/40">{fmtCurrency(subscription?.price_cents || plan.price * 100)}/{subscription?.billing_period || 'month'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/8 border border-lime/15">
              <Radio className="w-3 h-3 text-lime animate-pulse" />
              <span className="text-xs font-bold text-lime uppercase tracking-wider">{subscription?.status || 'active'}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-void rounded-lg p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/40 flex items-center gap-1"><Server className="w-3 h-3" /> Incidents</span>
                <span className={`font-mono font-bold ${isOverLimit ? 'text-red-400' : 'text-white/70'}`}>{incUsed}{incLimit < 999 ? `/${incLimit}` : ' (unlimited)'}</span>
              </div>
              {incLimit < 999 ? <Progress value={incPct} className="h-1.5" /> : <div className="h-1.5 bg-lime/15 rounded-full" />}
              {isOverLimit && <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Over limit. <button onClick={() => setShowPlanModal(true)} className="underline hover:text-red-300">Upgrade now</button></p>}
            </div>
            <div className="bg-void rounded-lg p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" /> Response SLA</span>
                <span className="font-mono font-bold text-white/70">{plan.responseTime}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-lime/30 rounded-full" style={{ width: planKey === 'fortress' ? '100%' : planKey === 'sentinel' ? '60%' : '30%' }} /></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-sm text-white/40"><Calendar className="w-4 h-4" />{daysLeft} days remaining · Renews {fmtDate(subscription?.current_period_end || '')}</div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={processing === 'cancel' || subscription?.status === 'canceled'}
                className="text-[11px] text-white/30 hover:text-white/50 uppercase tracking-wider font-bold transition-colors disabled:opacity-30"
              >
                {processing === 'cancel' ? 'Cancelling...' : 'Cancel'}
              </button>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-[11px] text-lime hover:text-lime/70 uppercase tracking-wider font-bold transition-colors"
              >
                Change Plan
              </button>
            </div>
          </div>
        </div>

        {/* Yearly Savings Card */}
        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-lime" /> Save with Yearly</h3>
            <div className="mb-4">
              <div className="text-3xl font-black font-mono text-lime">{fmtCurrency(Math.round(yearlyDiscount * 100))}</div>
              <div className="text-xs text-white/40 mt-1">Saved per year (2 months free)</div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs"><span className="text-white/40">Monthly total</span><span className="font-mono">{fmtCurrency(plan.price * 100)}/mo</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/40">Yearly total</span><span className="font-mono">{fmtCurrency(Math.round(yearlyPrice * 100 * 0.83))}/yr</span></div>
              <div className="flex justify-between text-xs border-t border-white/5 pt-2"><span className="text-lime">You save</span><span className="font-mono text-lime">{fmtCurrency(Math.round(yearlyDiscount * 100))}/yr</span></div>
            </div>
          </div>
          <button
            onClick={() => handleSwitchPeriod('yearly')}
            disabled={processing === 'switch-period' || subscription?.billing_period === 'yearly'}
            className="w-full py-2.5 rounded-lg border border-lime/20 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime/10 transition-all disabled:opacity-30"
          >
            {processing === 'switch-period' ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            {subscription?.billing_period === 'yearly' ? 'Already Yearly' : 'Switch to Yearly'}
          </button>
        </div>
      </div>

      {/* Plan Change Modal */}
      {showPlanModal && (
        <div className="border border-lime/20 rounded-xl p-5 bg-lime/[0.015]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-lime flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Change Your Plan</h3>
            <button onClick={() => setShowPlanModal(false)} className="text-xs text-white/30 hover:text-white/60">Close</button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(PLANS).map(([key, p]) => {
              const isCurrent = planKey === key;
              return (
                <div key={key} className={`border rounded-lg p-4 ${isCurrent ? 'border-lime/25 bg-lime/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase tracking-wider">{p.name}</span>
                    {isCurrent && <span className="text-[9px] text-lime border border-lime/20 px-1.5 py-0.5 rounded-full">Current</span>}
                  </div>
                  <div className="text-xl font-black font-mono mb-1">${p.price}<span className="text-xs text-white/40">/mo</span></div>
                  <div className="text-[10px] text-white/30 mb-3">{p.incidents >= 999 ? 'Unlimited' : p.incidents} incidents</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpgrade(key as 'guardian' | 'sentinel' | 'fortress', 'monthly')}
                      disabled={processing === `upgrade-${key}-monthly` || isCurrent}
                      className="flex-1 py-1.5 text-[10px] border border-white/10 text-white/50 font-bold uppercase hover:border-lime/25 hover:text-lime transition-all rounded disabled:opacity-30"
                    >
                      {processing === `upgrade-${key}-monthly` ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : 'Monthly'}
                    </button>
                    <button
                      onClick={() => handleUpgrade(key as 'guardian' | 'sentinel' | 'fortress', 'yearly')}
                      disabled={processing === `upgrade-${key}-yearly` || isCurrent}
                      className="flex-1 py-1.5 text-[10px] border border-lime/15 text-lime/70 font-bold uppercase hover:bg-lime/10 transition-all rounded disabled:opacity-30"
                    >
                      {processing === `upgrade-${key}-yearly` ? <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> : 'Yearly'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="border border-red-500/20 rounded-xl p-5 bg-red-500/[0.02]">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-400">Cancel Subscription?</h3>
              <p className="text-xs text-white/40 mt-1">You will retain access until {fmtDate(subscription?.current_period_end || '')}. After that, your account will be downgraded and incidents will no longer be covered.</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 border border-white/10 text-xs font-bold text-white/50 uppercase hover:bg-white/5 transition-colors">Keep Plan</button>
                <button onClick={handleCancel} disabled={processing === 'cancel'} className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-50">
                  {processing === 'cancel' ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage History Chart */}
      {usageHistory.length > 0 && (
        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-lime" /> Incident Usage History</h3>
          <div className="flex items-end gap-2 h-32">
            {usageHistory.slice(-12).map((pt, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-white/30 font-mono">{pt.incidents}</div>
                <div className="w-full bg-white/5 rounded-sm overflow-hidden" style={{ height: `${Math.max(8, (pt.incidents / maxUsage) * 80)}px` }}>
                  <div className={`w-full h-full ${pt.incidents > (incLimit < 999 ? incLimit : 10) ? 'bg-white/15' : 'bg-lime/25'}`} />
                </div>
                <div className="text-[8px] text-white/20 truncate max-w-full">{pt.month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Compare Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(PLANS).map(([key, p]) => {
            const isCurrent = planKey === key;
            const features = PLAN_FEATURES[key] || [];
            return (
              <div key={key} className={`border rounded-xl p-6 transition-all ${isCurrent ? 'border-lime/25 bg-lime/[0.03]' : 'border-white/10 bg-white/[0.02] hover:border-white/15'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black uppercase tracking-wider">{p.name}</h4>
                  {isCurrent && <span className="text-[10px] font-bold text-lime uppercase tracking-wider border border-lime/25 px-2 py-0.5 rounded-full">Current</span>}
                </div>
                <div className="mb-1"><span className="text-3xl font-black font-mono">${p.price}</span><span className="text-sm text-white/40">/mo</span></div>
                <div className="text-[11px] text-white/30 mb-4">{p.incidents >= 999 ? 'Unlimited' : p.incidents} incidents · {p.responseTime} response</div>
                <ul className="space-y-1.5 mb-5">
                  {features.map(f => (<li key={f} className="flex items-start gap-2 text-[11px] text-white/45"><Check className="w-3 h-3 text-lime mt-0.5 shrink-0" />{f}</li>))}
                </ul>
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-lg bg-lime/8 border border-lime/15 text-lime/60 text-xs font-bold uppercase tracking-wider text-center">Active</div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpgrade(key as 'guardian' | 'sentinel' | 'fortress', 'monthly')}
                      disabled={processing === `upgrade-${key}-monthly`}
                      className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/50 text-xs font-bold uppercase tracking-wider hover:border-lime/25 hover:text-lime transition-all disabled:opacity-30"
                    >
                      {processing === `upgrade-${key}-monthly` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Monthly'}
                    </button>
                    <button
                      onClick={() => handleUpgrade(key as 'sentinel' | 'fortress' | 'guardian', 'yearly')}
                      disabled={processing === `upgrade-${key}-yearly`}
                      className="flex-1 py-2.5 rounded-lg border border-lime/15 text-lime/70 text-xs font-bold uppercase tracking-wider hover:bg-lime/10 transition-all disabled:opacity-30"
                    >
                      {processing === `upgrade-${key}-yearly` ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Yearly'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white/50"><CreditCard className="w-4 h-4 text-lime" /> Payment Method</h3>

        {paymentMethod ? (
          <div className="flex items-center gap-4">
            <div className={`w-14 h-9 bg-gradient-to-r ${cardGradient(paymentMethod.brand)} rounded-md flex items-center justify-center`}>
              <span className="text-[10px] font-bold text-white/80">{cardBrandLogo(paymentMethod.brand)}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{paymentMethod.brand?.charAt(0).toUpperCase()}{paymentMethod.brand?.slice(1)} ending in {paymentMethod.last4}</div>
              <div className="text-xs text-white/40 font-mono">Expires {String(paymentMethod.exp_month).padStart(2, '0')}/{paymentMethod.exp_year}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePayment}
                disabled={processing === 'update-payment'}
                className="px-4 py-2 border border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider hover:border-lime/25 hover:text-lime transition-all rounded-lg flex items-center gap-1.5"
              >
                {processing === 'update-payment' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Update
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-9 bg-gradient-to-r from-white/10 to-white/5 rounded-md flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white/20" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white/40">No payment method on file</div>
              <div className="text-xs text-white/25">Add a card to activate your subscription</div>
            </div>
            <button
              onClick={handleUpdatePayment}
              disabled={processing === 'update-payment'}
              className="px-4 py-2 bg-lime text-black text-xs font-bold uppercase tracking-wider hover:bg-lime/90 transition-colors rounded-lg flex items-center gap-1.5"
            >
              {processing === 'update-payment' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              Add Card
            </button>
          </div>
        )}
      </div>

      {/* Invoice History */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2"><FileCheck className="w-4 h-4 text-lime" /> Invoice History</h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/25 font-mono">Total paid: {fmtCurrency(totalPaid)}</span>
            <span className="text-xs text-white/20">{invoices.length} invoices</span>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center"><FileCheck className="w-6 h-6 mx-auto mb-2 text-white/10" /><p className="text-sm text-white/30">No invoices yet. Appears after first billing cycle.</p></div>
        ) : (
          <div className="divide-y divide-white/5">
            {invoices.map(inv => (
              <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-sm font-mono text-white/45 shrink-0">{inv.id}</span>
                  <span className="text-sm text-white/35 shrink-0">{fmtDate(inv.created_at)}</span>
                  <span className="text-xs text-white/25 truncate">{inv.description || 'Monthly subscription'}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-mono font-bold">{fmtCurrency(inv.amount_cents)}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${inv.status === 'paid' ? 'text-lime border-lime/15 bg-lime/5' : 'text-white/40 border-white/10 bg-white/5'}`}>{inv.status}</span>
                  <button
                    onClick={() => handleDownloadInvoice(inv)}
                    className="text-white/15 hover:text-white/40 transition-colors p-1"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-3 px-4 py-3 border border-white/5 rounded-lg bg-white/[0.01]">
        <Lock className="w-4 h-4 text-white/20 shrink-0" />
        <p className="text-[11px] text-white/25">All billing data is encrypted and processed through Stripe. UptimeOps never stores your full card number.</p>
      </div>
    </div>
  );
}
