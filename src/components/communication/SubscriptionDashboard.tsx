// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION DASHBOARD (Permanent)
// Full incident history, health reports, security, billing
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Activity, Shield, TrendingUp, FileText, CreditCard, AlertTriangle, Search, Download, UserCog, CheckCircle } from 'lucide-react';

const INCIDENTS = [
  { id: 'ESC-2049', title: 'Database Pool Exhaustion', status: 'resolved', date: '2024-06-25', severity: 'P1', website: 'acme-corp.com' },
  { id: 'ESC-2031', title: 'SSL Certificate Expiry',   status: 'resolved', date: '2024-06-20', severity: 'P2', website: 'secure.finance.co' },
  { id: 'ESC-2011', title: 'Plugin Conflict',          status: 'resolved', date: '2024-05-15', severity: 'P2', website: 'acme-corp.com' },
  { id: 'ESC-1987', title: 'DDoS Attack Mitigation',   status: 'resolved', date: '2024-04-28', severity: 'P1', website: 'api.startup.io' },
  { id: 'ESC-1956', title: 'Memory Leak',              status: 'resolved', date: '2024-04-10', severity: 'P3', website: 'shop.beta.co' },
  { id: 'ESC-1934', title: 'Cache Invalidation Storm',  status: 'resolved', date: '2024-03-22', severity: 'P2', website: 'social.app' },
];

const BILLING = [
  { date: '2024-06-01', amount: 299.00, status: 'paid',   invoice: 'INV-2024-0601' },
  { date: '2024-05-01', amount: 299.00, status: 'paid',   invoice: 'INV-2024-0501' },
  { date: '2024-04-01', amount: 299.00, status: 'paid',   invoice: 'INV-2024-0401' },
  { date: '2024-03-01', amount: 299.00, status: 'paid',   invoice: 'INV-2024-0301' },
];

const UPTIME_DATA = [99.9, 99.8, 99.9, 99.7, 99.9, 99.9, 100, 99.8, 99.9, 99.9, 99.7, 99.9];

export function SubscriptionDashboard() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'billing'>('overview');

  const filtered = INCIDENTS.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    i.website.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface border border-white/5 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Security Score</div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-lime" />
            <span className="text-xl font-black font-mono text-lime">87</span>
            <span className="text-[10px] text-white/20">/100</span>
          </div>
        </div>
        <div className="bg-surface border border-white/5 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Uptime (30d)</div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan" />
            <span className="text-xl font-black font-mono text-cyan">99.87%</span>
          </div>
        </div>
        <div className="bg-surface border border-white/5 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Active Incidents</div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xl font-black font-mono text-yellow-400">1</span>
          </div>
        </div>
        <div className="bg-surface border border-white/5 p-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Fixed</div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-lime" />
            <span className="text-xl font-black font-mono text-lime">6</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {([
          { key: 'overview' as const, label: 'Overview', icon: TrendingUp },
          { key: 'incidents' as const, label: 'Incidents', icon: FileText },
          { key: 'billing' as const, label: 'Billing', icon: CreditCard },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === tab.key ? 'border-lime text-lime' : 'border-transparent text-white/30 hover:text-white/50'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Uptime Graph */}
          <div className="bg-surface border border-white/5 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Uptime (Last 12 Months)</h4>
            <div className="flex items-end gap-1 h-24">
              {UPTIME_DATA.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-lime/30 transition-colors hover:bg-lime/50" style={{ height: `${(val / 100) * 80}px` }} />
                  <span className="text-[8px] text-white/15 font-mono">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-white/20 mt-1">
              <span>30d: 99.87%</span>
              <span>90d: 99.83%</span>
              <span>365d: 99.88%</span>
            </div>
          </div>

          {/* Security + Recommendations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-white/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                <Shield className="w-3 h-3 text-lime" /> Security Status
              </h4>
              {[
                { label: 'SSL Certificate', status: 'Valid (42 days)', ok: true },
                { label: 'Firewall', status: 'Active', ok: true },
                { label: 'Malware Scan', status: 'Clean', ok: true },
                { label: 'Plugins', status: '1 outdated (non-critical)', ok: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-white/40">{item.label}</span>
                  <span className={`font-mono ${item.ok ? 'text-lime' : 'text-yellow-400'}`}>{item.status}</span>
                </div>
              ))}
            </div>
            <div className="bg-surface border border-white/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-cyan" /> Recommendations
              </h4>
              {[
                'Enable auto-renewal for SSL certificates',
                'Update WooCommerce to 8.3.0',
                'Consider Guardian plan for proactive monitoring',
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 text-xs text-white/40">
                  <span className="text-cyan font-mono flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Escalate Button */}
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-magenta/10 border border-magenta/30 text-magenta text-sm font-bold hover:bg-magenta/20 transition-colors">
            <UserCog className="w-4 h-4" />
            REQUEST HUMAN ENGINEER — BYPASS AI
          </button>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." className="w-full bg-surface border border-white/5 text-xs text-white/60 pl-10 pr-4 py-2.5 outline-none focus:border-lime/30" />
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map(inc => (
              <div key={inc.id} className="flex items-center gap-4 p-3 bg-surface border border-white/5 hover:bg-white/[0.01] transition-colors">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-white/10 bg-black/20">
                  <span className={`text-[10px] font-bold font-mono ${inc.severity === 'P1' ? 'text-red-400' : 'text-yellow-400'}`}>{inc.severity}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/70">{inc.title}</div>
                  <div className="text-[10px] text-white/30 mt-0.5 font-mono">{inc.id} — {inc.website}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-white/20">{inc.date}</span>
                  <span className="text-[10px] font-bold text-lime flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" />
                    RESOLVED
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-surface border border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Current Plan</h4>
              <span className="text-[10px] text-lime font-bold bg-lime/10 px-2 py-1 border border-lime/20">SENTINEL</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Monthly</div><div className="text-sm font-black font-mono text-white">$299</div></div>
              <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Renews</div><div className="text-sm font-black font-mono text-cyan">Jul 1</div></div>
              <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Incidents</div><div className="text-sm font-black font-mono text-lime">Unlimited</div></div>
            </div>
          </div>

          <div className="bg-surface border border-white/5">
            <div className="p-3 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-white/50">Invoice History</div>
            <div className="divide-y divide-white/5">
              {BILLING.map(inv => (
                <div key={inv.invoice} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-xs text-white/40 font-mono">{inv.invoice}</span>
                    <span className="text-xs text-white/30">{inv.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-white/60">${inv.amount.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-lime flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      {inv.status.toUpperCase()}
                    </span>
                    <button className="text-[10px] text-cyan hover:text-cyan/70 transition-colors flex items-center gap-1">
                      <Download className="w-2.5 h-2.5" />
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
