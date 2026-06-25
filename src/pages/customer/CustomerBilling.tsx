import { useState } from 'react';
import { CreditCard, Zap, Check, ArrowRight, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const plans = [
  { name: 'Starter', price: '$49', sites: 3, incidents: 5 },
  { name: 'Pro', price: '$149', sites: 10, incidents: 25 },
  { name: 'Enterprise', price: 'Custom', sites: Infinity, incidents: Infinity },
];

const invoices = [
  { id: 'INV-2026-06', date: '2026-06-01', amount: '$149.00', status: 'paid' },
  { id: 'INV-2026-05', date: '2026-05-01', amount: '$149.00', status: 'paid' },
  { id: 'INV-2026-04', date: '2026-04-01', amount: '$149.00', status: 'paid' },
  { id: 'INV-2026-03', date: '2026-03-01', amount: '$149.00', status: 'paid' },
];

export function CustomerBilling() {
  const [currentPlan] = useState('Pro');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SUBSCRIPTION</h2>
        <p className="text-sm text-white/40 mt-1">Manage your plan and billing</p>
      </div>

      {/* Current Plan */}
      <div className="bg-surface border border-lime/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-lime" />
            <div>
              <h3 className="text-lg font-bold">Pro Plan</h3>
              <p className="text-sm text-white/40">$149/month, billed monthly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-500 font-medium">Active</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-void p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40">Sites Used</span>
              <span className="font-mono">3/10</span>
            </div>
            <Progress value={30} className="h-1.5" />
          </div>
          <div className="bg-void p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40">Incidents Used</span>
              <span className="font-mono">8/25</span>
            </div>
            <Progress value={32} className="h-1.5" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Calendar className="w-4 h-4" />
            Next billing: July 1, 2026
          </div>
          <button className="text-sm text-lime hover:underline">Change Plan</button>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`border p-6 ${
              plan.name === currentPlan ? 'border-lime/30 bg-lime/5' : 'border-white/5 bg-surface'
            }`}
          >
            <h4 className="text-sm font-bold uppercase tracking-wider mb-2">{plan.name}</h4>
            <div className="text-2xl font-black font-mono mb-4">{plan.price}<span className="text-sm text-white/40 font-normal">{plan.price !== 'Custom' ? '/mo' : ''}</span></div>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-lime" />{plan.sites === Infinity ? 'Unlimited' : plan.sites} sites</li>
              <li className="flex items-center gap-2"><Check className="w-3 h-3 text-lime" />{plan.incidents === Infinity ? 'Unlimited' : plan.incidents} incidents/mo</li>
            </ul>
            {plan.name === currentPlan ? (
              <div className="mt-4 text-xs font-bold text-lime uppercase tracking-wider">Current Plan</div>
            ) : (
              <button className="mt-4 text-sm text-lime hover:underline flex items-center gap-1">
                Switch <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment Method */}
      <div className="bg-surface border border-white/5 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-lime" />
          Payment Method
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-sm" />
          <div>
            <div className="text-sm font-medium">Visa ending in 4242</div>
            <div className="text-xs text-white/40 font-mono">Expires 12/2027</div>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider">Invoice History</h3>
        </div>
        <div className="divide-y divide-white/5">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-white/60">{inv.id}</span>
                <span className="text-sm text-white/40">{inv.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono font-bold">{inv.amount}</span>
                <span className="text-xs font-bold text-green-500 uppercase">{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
