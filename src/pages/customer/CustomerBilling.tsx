// ═══════════════════════════════════════════════════════════════
// CUSTOMER BILLING v2.5 — Payment Control Desk
// Subscription card, fix credits, invoice ledger
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Download,
  Plus,
  Hash
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';


const FIX_CREDITS = [
  { id: 'rapid', name: 'Rapid Fix', price: 99, desc: 'Standard 24h response', color: '#22d3ee' },
  { id: 'critical', name: 'Critical Fix', price: 249, desc: 'Priority 4h response', color: '#e879f9' },
  { id: 'catastrophic', name: 'Catastrophic Fix', price: 599, desc: 'Emergency 1h response', color: '#f43f5e' },
];

const INVOICES = [
  { id: 'INV-2024-006', date: '2024-07-01', amount: 249, status: 'paid', description: 'Sentinel Plan — Jul 2024' },
  { id: 'INV-2024-005', date: '2024-06-01', amount: 249, status: 'paid', description: 'Sentinel Plan — Jun 2024' },
  { id: 'INV-2024-004', date: '2024-05-01', amount: 249, status: 'paid', description: 'Sentinel Plan — May 2024' },
  { id: 'INV-2024-003', date: '2024-04-15', amount: 99, status: 'paid', description: 'Rapid Fix Credit' },
  { id: 'INV-2024-002', date: '2024-04-01', amount: 249, status: 'paid', description: 'Sentinel Plan — Apr 2024' },
  { id: 'INV-2024-001', date: '2024-03-01', amount: 99, status: 'paid', description: 'Guardian Plan — Mar 2024' },
];

export function CustomerBilling() {
  const [credits, setCredits] = useState({ rapid: 2, critical: 1, catastrophic: 0 });
  // credits state used by Fix Credit buttons
  void credits;
  const [autoRenew, setAutoRenew] = useState(true);

  const handleBuyCredit = (type: keyof typeof credits) => {
    setCredits(p => ({ ...p, [type]: p[type] + 1 }));
    toast.success(`+1 ${type} fix credit added to your account`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-lime" /> Billing & Payments
      </h1>

      {/* Active Subscription */}
      <div className="bg-white/[0.02] border border-lime/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-lime bg-lime/10 px-2 py-0.5 rounded border border-lime/20">ACTIVE</span>
              <span className="text-[10px] text-white/30">Renews Aug 1, 2024</span>
            </div>
            <h2 className="text-lg font-black text-white">Sentinel Plan</h2>
            <p className="text-xs text-white/40">$249/month · Billed monthly</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-lime">$249<span className="text-sm text-white/30">/mo</span></p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/30">Auto-renew</span>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {['24/7 Monitoring', '42-Scanner Matrix', 'Real-time Dashboard', 'Priority Response'].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/[0.03] rounded-lg px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3 text-lime" /> {f}
            </div>
          ))}
        </div>
        <button onClick={() => toast.info('Stripe Customer Portal redirect')} className="flex items-center gap-2 px-4 py-2 bg-lime/10 text-lime rounded-lg text-[11px] font-bold hover:bg-lime/20 transition-all border border-lime/20">
          <CreditCard className="w-3.5 h-3.5" /> Manage Subscription in Stripe
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Fix Credits */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber" /> One-Time Fix Credits
          </h3>
          {FIX_CREDITS.map(fc => (
            <div key={fc.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${fc.color}15` }}>
                    <Zap className="w-4 h-4" style={{ color: fc.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/70">{fc.name}</p>
                    <p className="text-[10px] text-white/30">{fc.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: fc.color }}>${fc.price}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[10px] text-white/30">Balance: <span className="text-white/60 font-bold">{credits[fc.id as keyof typeof credits]}</span></span>
                <button onClick={() => handleBuyCredit(fc.id as keyof typeof credits)} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold transition-all" style={{ backgroundColor: `${fc.color}15`, color: fc.color, border: `1px solid ${fc.color}30` }}>
                  <Plus className="w-3 h-3" /> Buy Credit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Ledger */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-cyan" /> Invoice History
          </h3>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            {INVOICES.map((inv, i) => (
              <div key={inv.id} className={`flex items-center justify-between p-3 ${i < INVOICES.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/30">{inv.id}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-lime/10 text-lime">{inv.status}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">{inv.description}</p>
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
    </div>
  );
}
