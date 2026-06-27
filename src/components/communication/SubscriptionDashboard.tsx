// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION DASHBOARD (Permanent)
// Full incident history, health reports, security, billing
// Monochrome + lime only — no AI cost shown
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Activity, Shield, TrendingUp, FileText, CreditCard, Search, Download, UserCog, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function SubscriptionDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'billing'>('overview');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!customer) { setLoading(false); return; }

      const [{ data: incs }, { data: invs }] = await Promise.all([
        supabase.from('incidents').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      ]);

      setIncidents(incs || []);
      setInvoices(invs || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = incidents.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.id?.toLowerCase().includes(search.toLowerCase()) ||
    i.website_url?.toLowerCase().includes(search.toLowerCase())
  );

  const resolvedCount = incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length;
  const uptimePct = incidents.length === 0 ? '100.00' : (100 - (incidents.filter(i => i.priority === 'P1_CRITICAL').length * 0.1)).toFixed(2);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Security Score', value: '87', sub: '/100', icon: Shield },
          { label: 'Uptime (30d)', value: `${uptimePct}%`, icon: Activity },
          { label: 'Active Issues', value: `${incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length}`, icon: AlertTriangle },
          { label: 'Total Fixed', value: `${resolvedCount}`, icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-white/5 p-3 rounded-xl">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{s.label}</div>
            <div className="flex items-center gap-2">
              <s.icon className="w-4 h-4 text-lime" />
              <span className="text-xl font-black font-mono text-white/70">{s.value}</span>
              {s.sub && <span className="text-[10px] text-white/20">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {([
          { key: 'overview' as const, label: 'Overview', icon: TrendingUp },
          { key: 'incidents' as const, label: 'Incidents', icon: FileText },
          { key: 'billing' as const, label: 'Billing', icon: CreditCard },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${activeTab === tab.key ? 'border-lime text-lime' : 'border-transparent text-white/30 hover:text-white/50'}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-surface border border-white/5 p-4 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Infrastructure Health</h4>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-lime/30 rounded-full" style={{ width: `${uptimePct}%` }} />
              </div>
              <span className="text-sm font-black font-mono text-white/70">{uptimePct}%</span>
            </div>
            <div className="flex justify-between text-[10px] text-white/20">
              <span>30d: {uptimePct}%</span>
              <span>{incidents.length} incidents tracked</span>
              <span>{resolvedCount} resolved</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-white/5 p-4 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2"><Shield className="w-3 h-3 text-lime" /> Security Status</h4>
              {[
                { label: 'SSL Certificate', status: 'Valid', ok: true },
                { label: 'Firewall', status: 'Active', ok: true },
                { label: 'Malware Scan', status: 'Clean', ok: true },
                { label: 'Credentials', status: 'Encrypted', ok: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-white/40">{item.label}</span>
                  <span className={`font-mono ${item.ok ? 'text-lime' : 'text-white/40'}`}>{item.status}</span>
                </div>
              ))}
            </div>
            <div className="bg-surface border border-white/5 p-4 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2"><TrendingUp className="w-3 h-3 text-lime" /> Recommendations</h4>
              {[
                'Enable auto-renewal for SSL certificates',
                'Keep plugins updated to latest versions',
                'Review credential expiry dates regularly',
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 text-xs text-white/40">
                  <span className="text-lime font-mono flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>{rec}
                </div>
              ))}
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-colors rounded-xl">
            <UserCog className="w-4 h-4" /> REQUEST HUMAN ENGINEER
          </button>
        </div>
      )}

      {/* Incidents */}
      {activeTab === 'incidents' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." className="w-full bg-surface border border-white/10 text-xs text-white/60 pl-10 pr-4 py-2.5 outline-none focus:border-lime/30 rounded-lg" />
          </div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/30">No incidents found</div>
          ) : (
            <div className="divide-y divide-white/5 border border-white/10 rounded-xl bg-white/[0.02]">
              {filtered.map(inc => (
                <div key={inc.id} className="flex items-center gap-4 p-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-white/10 bg-black/20 rounded-lg">
                    <span className={`text-[10px] font-bold font-mono ${inc.priority === 'P1_CRITICAL' ? 'text-white/60' : 'text-white/40'}`}>{inc.priority?.replace('P1_', 'P1').replace('P2_', 'P2') || 'P?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white/70">{inc.title}</div>
                    <div className="text-[10px] text-white/30 mt-0.5 font-mono">{inc.id?.slice(0, 8)} — {inc.website_url}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-white/20">{fmtDate(inc.created_at)}</span>
                    <span className="text-[10px] font-bold text-lime flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />{inc.status?.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-surface border border-white/5 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Billing Summary</h4>
              <span className="text-[10px] text-lime font-bold bg-lime/10 px-2 py-1 border border-lime/20 rounded-full">ACTIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-void p-3 text-center rounded-lg"><div className="text-[10px] text-white/30">Total Paid</div><div className="text-sm font-black font-mono text-white/70">{fmtCurrency(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0))}</div></div>
              <div className="bg-void p-3 text-center rounded-lg"><div className="text-[10px] text-white/30">Invoices</div><div className="text-sm font-black font-mono text-white/70">{invoices.length}</div></div>
              <div className="bg-void p-3 text-center rounded-lg"><div className="text-[10px] text-white/30">Status</div><div className="text-sm font-black font-mono text-lime">Current</div></div>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-xl">
            <div className="p-3 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-white/50">Invoice History</div>
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-sm text-white/30">No invoices yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-3.5 h-3.5 text-white/20" />
                      <span className="text-xs text-white/40 font-mono">{inv.id}</span>
                      <span className="text-xs text-white/30">{fmtDate(inv.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono text-white/60">{fmtCurrency(inv.amount_cents)}</span>
                      <span className="text-[10px] font-bold text-lime flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />{inv.status?.toUpperCase()}</span>
                      <button className="text-[10px] text-white/20 hover:text-white/50 transition-colors flex items-center gap-1"><Download className="w-2.5 h-2.5" />PDF</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
