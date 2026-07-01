// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PAYMENTS v2.5 — Billing Management
// Current plan, usage meter, Stripe portal, invoices, emergency credits
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  CreditCard,
  Shield,
  Zap,
  Crown,
  CheckCircle2,
  Download,
  Plus,
  Hash,
  Calendar,
  X
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const TIERS = [
  { id: 'guardian', name: 'Guardian', price: 99, period: 'mo', yearlyPrice: 990, color: '#22d3ee', icon: Shield, incidents: 5 },
  { id: 'sentinel', name: 'Sentinel', price: 249, period: 'mo', yearlyPrice: 2490, color: '#e879f9', icon: Zap, incidents: 20, recommended: true },
  { id: 'fortress', name: 'Fortress', price: 599, period: 'mo', yearlyPrice: 5990, color: '#fbbf24', icon: Crown, incidents: Infinity },
];

const CREDITS = [
  { id: 'rapid', name: 'Rapid Fix', price: 99, desc: '24h response SLA', color: '#22d3ee' },
  { id: 'critical', name: 'Critical Fix', price: 249, desc: '4h response SLA', color: '#e879f9' },
  { id: 'catastrophic', name: 'Catastrophic Fix', price: 599, desc: '1h response SLA', color: '#f43f5e' },
];

const INVOICES = [
  { id: 'INV-2024-007', date: '2025-07-01', amount: 249, status: 'paid', desc: 'Sentinel Plan — Jul 2025' },
  { id: 'INV-2024-006', date: '2025-06-01', amount: 249, status: 'paid', desc: 'Sentinel Plan — Jun 2025' },
  { id: 'INV-2024-005', date: '2025-05-01', amount: 249, status: 'paid', desc: 'Sentinel Plan — May 2025' },
  { id: 'INV-2024-004', date: '2025-04-15', amount: 99, status: 'paid', desc: 'Rapid Fix Credit' },
  { id: 'INV-2024-003', date: '2025-04-01', amount: 249, status: 'paid', desc: 'Sentinel Plan — Apr 2025' },
  { id: 'INV-2024-002', date: '2025-03-01', amount: 249, status: 'paid', desc: 'Sentinel Plan — Mar 2025' },
];

export function CustomerPayments() {
  const [yearly, setYearly] = useState(false);
  const [credits, setCredits] = useState({ rapid: 2, critical: 1, catastrophic: 0 });
  const [autoRenew, setAutoRenew] = useState(true);
  const [showCancel, setShowCancel] = useState(false);

  const currentPlan = TIERS[1]; // Sentinel
  const incidentsUsed = 7;
  const incidentsLimit = currentPlan.incidents === Infinity ? 'Unlimited' : currentPlan.incidents;
  const usagePct = currentPlan.incidents === Infinity ? 0 : (incidentsUsed / currentPlan.incidents) * 100;

  const handleBuyCredit = (type: keyof typeof credits) => {
    setCredits(p => ({ ...p, [type]: p[type] + 1 }));
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} credit purchased`);
  };

  const handleStripePortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: `${window.location.origin}/#/customer/payments` }),
      });
      const { url } = await resp.json();
      if (url) window.location.href = url;
    } catch {
      toast.info('Stripe Customer Portal (demo mode)');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-lime" /> Payments
      </h1>

      {/* Current Plan Card */}
      <div className="bg-elevated/80 backdrop-blur-xl border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-lime bg-lime/10 px-2 py-0.5 rounded border border-lime/20">ACTIVE</span>
              <span className="text-[10px] text-white/30 flex items-center gap-1"><Calendar className="w-3 h-3" /> Renews Aug 1, 2025</span>
            </div>
            <h2 className="text-lg font-black text-white">{currentPlan.name} Plan</h2>
            <p className="text-xs text-white/40">${yearly ? currentPlan.yearlyPrice : currentPlan.price}/{yearly ? 'year' : 'month'} · Billed {yearly ? 'annually' : 'monthly'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: currentPlan.color }}>${yearly ? currentPlan.yearlyPrice : currentPlan.price}<span className="text-sm text-white/30">/{yearly ? 'yr' : 'mo'}</span></p>
          </div>
        </div>

        {/* Usage Meter */}
        <div className="mb-4 p-3 bg-white/[0.02] rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Incident Usage</span>
            <span className="text-[10px] font-mono text-white/60">{incidentsUsed} / {incidentsLimit} used</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, backgroundColor: usagePct > 80 ? '#f43f5e' : usagePct > 50 ? '#fbbf24' : '#a3e635' }} />
          </div>
          {usagePct > 80 && <p className="text-[9px] text-rose mt-1">Approaching incident limit — consider upgrading</p>}
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {['24/7 Monitoring', '42-Scanner Matrix', 'Real-time Dashboard', 'Priority Response'].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/[0.03] rounded-lg px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3 text-lime" /> {f}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleStripePortal} className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all">
            <CreditCard className="w-3.5 h-3.5" /> Manage in Stripe
          </button>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span>Auto-renew</span>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>
          <button onClick={() => setShowCancel(true)} className="text-[10px] text-rose/60 hover:text-rose ml-auto transition-colors">
            Cancel Subscription
          </button>
        </div>

        {/* Yearly toggle */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
          <span className={`text-[10px] font-bold ${!yearly ? 'text-white' : 'text-white/30'}`}>Monthly</span>
          <button onClick={() => setYearly(!yearly)} className={`w-10 h-5 rounded-full transition-all ${yearly ? 'bg-lime' : 'bg-white/10'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-all ${yearly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-[10px] font-bold ${yearly ? 'text-white' : 'text-white/30'}`}>Yearly <span className="text-lime">Save 17%</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Emergency Credits */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber" /> Emergency Fix Credits
          </h3>
          {CREDITS.map(c => (
            <div key={c.id} className="bg-elevated/80 backdrop-blur-xl border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
                    <Zap className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/70">{c.name}</p>
                    <p className="text-[10px] text-white/30">{c.desc}</p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: c.color }}>${c.price}</p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[10px] text-white/30">Balance: <span className="text-white/60 font-bold">{credits[c.id as keyof typeof credits]}</span></span>
                <button onClick={() => handleBuyCredit(c.id as keyof typeof credits)} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold transition-all" style={{ backgroundColor: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30` }}>
                  <Plus className="w-3 h-3" /> Buy
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice History */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-cyan" /> Invoice History
          </h3>
          <div className="bg-elevated/80 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            {INVOICES.map((inv, i) => (
              <div key={inv.id} className={`flex items-center justify-between p-3 ${i < INVOICES.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/30">{inv.id}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-lime/10 text-lime">{inv.status}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">{inv.desc}</p>
                  <span className="text-[9px] text-white/20">{inv.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-white/70">${inv.amount}</span>
                  <button onClick={() => toast.success(`Invoice ${inv.id} downloaded`)} className="p-1.5 text-white/30 hover:text-lime transition-all">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancel(false)}>
          <div className="bg-elevated border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-rose">Cancel Subscription</h3>
              <button onClick={() => setShowCancel(false)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-white/50 mb-4">Your infrastructure will be unprotected. All monitoring and scanner coverage will stop immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCancel(false); toast.success('Redirecting to Stripe cancellation...'); }} className="flex-1 py-2 bg-rose text-white rounded-lg text-xs font-black hover:bg-rose/90 transition-all">
                Proceed to Cancel
              </button>
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">
                Keep Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
