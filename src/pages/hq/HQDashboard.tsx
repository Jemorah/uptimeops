// ═══════════════════════════════════════════════════════════════
// HQ CONTROL CENTER — Coordinator Master Dashboard
// 10 sections: Overview, Incidents, Approvals, Customers,
// Engineers, Subscriptions, Audit, Communications, AI Costs, Settings
// Recharts charts, data tables, real-time widgets
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Users, Zap, TrendingUp,
  Globe, Radio, ShieldCheck, Mail, FileText, Settings, CreditCard,
  Search, Eye, ThumbsUp, ThumbsDown, Pause, ArrowRight,
  DollarSign, HardDrive, Bot, PersonStanding,
  BarChart3, Lock, RefreshCw, Download,
  ArrowDownRight, Star,
  Percent, Wifi, Sparkles, KeyRound
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const REVENUE_DATA = [
  { day: 'Mon', revenue: 1847, aiCost: 342 },
  { day: 'Tue', revenue: 2310, aiCost: 398 },
  { day: 'Wed', revenue: 1956, aiCost: 289 },
  { day: 'Thu', revenue: 2678, aiCost: 445 },
  { day: 'Fri', revenue: 3102, aiCost: 512 },
  { day: 'Sat', revenue: 2456, aiCost: 367 },
  { day: 'Sun', revenue: 1987, aiCost: 298 },
];

const AI_COST_DATA = [
  { name: 'ANTIGRAVITY', value: 35, color: '#00f0ff' },
  { name: 'Claude', value: 42, color: '#d1ff00' },
  { name: 'Jules', value: 23, color: '#a855f7' },
];

const ENGINEER_PERF = [
  { name: 'Alex C', resolved: 12, avgTime: 14, satisfaction: 4.9 },
  { name: 'Jordan S', resolved: 9, avgTime: 18, satisfaction: 4.8 },
  { name: 'Morgan L', resolved: 15, avgTime: 11, satisfaction: 5.0 },
  { name: 'Sam R', resolved: 7, avgTime: 22, satisfaction: 4.7 },
  { name: 'Taylor P', resolved: 10, avgTime: 16, satisfaction: 4.8 },
];

const UPTIME_DATA = [
  { hour: '00', up: 99.9, down: 0.1 },
  { hour: '04', up: 99.8, down: 0.2 },
  { hour: '08', up: 100, down: 0 },
  { hour: '12', up: 99.7, down: 0.3 },
  { hour: '16', up: 99.9, down: 0.1 },
  { hour: '20', up: 100, down: 0 },
  { hour: '23', up: 99.8, down: 0.2 },
];

const ALL_INCIDENTS = [
  { id: 'INC-0641', site: 'acme-corp.com', customer: 'admin@acme.com', severity: 'P1', status: 'repairing', aiConfidence: 72, engineer: 'Alex Chen', time: '14:32', cost: 12.45, type: 'db_pool' },
  { id: 'INC-0640', site: 'shop.beta.co', customer: 'ops@beta.co', severity: 'P1', status: 'validating', aiConfidence: 88, engineer: 'Jordan Smith', time: '13:45', cost: 8.92, type: 'plugin_conflict' },
  { id: 'INC-0639', site: 'api.startup.io', customer: 'dev@startup.io', severity: 'P2', status: 'deploying', aiConfidence: 96, engineer: 'Morgan Lee', time: '12:10', cost: 3.21, type: 'memory_leak' },
  { id: 'INC-0638', site: 'secure.finance.co', customer: 'sec@finance.co', severity: 'P2', status: 'pending_approval', aiConfidence: 85, engineer: 'Morgan Lee', time: '11:30', cost: 6.78, type: 'ssl_expiry' },
  { id: 'INC-0637', site: 'health-portal.med', customer: 'cto@health-portal.med', severity: 'P3', status: 'coordinator_review', aiConfidence: 92, engineer: 'Alex Chen', time: '10:00', cost: 4.56, type: 'customer_request' },
  { id: 'INC-0636', site: 'social.app', customer: 'infra@social.app', severity: 'P2', status: 'closed', aiConfidence: 94, engineer: 'Jordan Smith', time: '09:15', cost: 5.34, type: 'cache_storm' },
  { id: 'INC-0635', site: 'uploads.service.io', customer: 'security@service.io', severity: 'P1', status: 'escalated', aiConfidence: 45, engineer: null, time: '08:30', cost: 18.92, type: 'security' },
  { id: 'INC-0634', site: 'news.blog.co', customer: 'editor@blog.co', severity: 'P3', status: 'closed', aiConfidence: 97, engineer: null, time: '07:00', cost: 1.23, type: 'theme_break' },
];

const CUSTOMERS = [
  { id: 'C-1042', email: 'admin@acme-corp.com', company: 'Acme Commerce', website: 'acme-corp.com', plan: 'Sentinel', mrr: 249, incidents: 3, status: 'active', since: '2024-01-15', credStatus: 'active' },
  { id: 'C-1041', email: 'ops@beta.co', company: 'BetaShop', website: 'shop.beta.co', plan: 'Guardian', mrr: 99, incidents: 5, status: 'active', since: '2023-11-20', credStatus: 'revoked' },
  { id: 'C-1040', email: 'dev@startup.io', company: 'StartUpIO', website: 'api.startup.io', plan: 'Sentinel', mrr: 249, incidents: 2, status: 'active', since: '2024-03-01', credStatus: 'active' },
  { id: 'C-1039', email: 'cto@health-portal.med', company: 'HealthPortal', website: 'health-portal.med', plan: 'Fortress', mrr: 599, incidents: 1, status: 'active', since: '2023-08-10', credStatus: 'active' },
  { id: 'C-1038', email: 'sec@finance.co', company: 'Secure Finance', website: 'secure.finance.co', plan: 'Sentinel', mrr: 249, incidents: 4, status: 'overdue', since: '2024-02-01', credStatus: 'expiring' },
  { id: 'C-1037', email: 'editor@blog.co', company: 'News Blog', website: 'news.blog.co', plan: 'Guardian', mrr: 99, incidents: 8, status: 'churned', since: '2023-06-15', credStatus: 'purged' },
];

const AUDIT_LOGS = [
  { id: 'AL-9821', timestamp: '2024-06-25T14:48:02Z', actor: 'AI:DEPLOY', action: 'deployed_fix', resource: 'ESC-2049 (acme-corp.com)', severity: 'info' },
  { id: 'AL-9820', timestamp: '2024-06-25T14:47:00Z', actor: 'coordinator_sarah', action: 'approved_deploy', resource: 'ESC-2049', severity: 'info' },
  { id: 'AL-9819', timestamp: '2024-06-25T14:38:00Z', actor: 'AI:REPAIR', action: 'modified_file', resource: 'class-checkout.php line 142', severity: 'info' },
  { id: 'AL-9818', timestamp: '2024-06-25T14:35:00Z', actor: 'AI:ISOLATE', action: 'spawned_vm', resource: 'sandbox-7f3a9e2d', severity: 'info' },
  { id: 'AL-9817', timestamp: '2024-06-25T14:32:00Z', actor: 'customer_admin', action: 'submitted_credentials', resource: 'credentials_vault', severity: 'info' },
  { id: 'AL-9816', timestamp: '2024-06-25T14:30:00Z', actor: 'system', action: 'payment_confirmed', resource: 'Stripe pi_3Oxxxx', severity: 'info' },
  { id: 'AL-9815', timestamp: '2024-06-25T14:28:00Z', actor: 'customer_admin', action: 'emergency_form_submitted', resource: 'ESC-2049', severity: 'warning' },
  { id: 'AL-9814', timestamp: '2024-06-25T14:15:00Z', actor: 'system', action: 'auto_escalated', resource: 'ESC-2048 (P1 critical)', severity: 'critical' },
];

const SUBS_DATA = [
  { plan: 'Guardian', count: 142, mrr: 14058, color: '#00f0ff' },
  { plan: 'Sentinel', count: 89, mrr: 22161, color: '#d1ff00' },
  { plan: 'Fortress', count: 23, mrr: 13777, color: '#ff0055' },
];

const SEVERITY_COLORS: Record<string, string> = {
  P1: 'text-red-400 bg-red-400/10 border-red-400/20',
  P2: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  P3: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  info: 'text-cyan bg-cyan/10 border-cyan/20',
  warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
};

const STATUS_COLORS: Record<string, string> = {
  repairing: 'text-lime',
  validating: 'text-green-400',
  deploying: 'text-orange-400',
  pending_approval: 'text-purple-400',
  coordinator_review: 'text-cyan',
  closed: 'text-white/30',
  escalated: 'text-red-400',
};

export function HQDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  // Stats
  const p1Count = ALL_INCIDENTS.filter(i => i.severity === 'P1' && i.status !== 'closed').length;
  const p2Count = ALL_INCIDENTS.filter(i => i.severity === 'P2' && i.status !== 'closed').length;
  const p3Count = ALL_INCIDENTS.filter(i => i.severity === 'P3' && i.status !== 'closed').length;
  const totalMrr = SUBS_DATA.reduce((s, d) => s + d.mrr, 0);
  const aiCostToday = REVENUE_DATA.reduce((s, d) => s + d.aiCost, 0);
  const revenueToday = REVENUE_DATA.reduce((s, d) => s + d.revenue, 0);

  const filteredIncidents = useMemo(() => {
    let f = ALL_INCIDENTS;
    if (incidentFilter !== 'all') f = f.filter(i => i.status === incidentFilter);
    if (search) f = f.filter(i => i.site.includes(search) || i.id.includes(search) || i.customer.includes(search));
    return f;
  }, [incidentFilter, search]);

  const filteredCustomers = useMemo(() => {
    let f = CUSTOMERS;
    if (customerFilter !== 'all') f = f.filter(c => c.status === customerFilter);
    if (search) f = f.filter(c => c.email.includes(search) || c.company.includes(search) || c.website.includes(search));
    return f;
  }, [customerFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">HQ CONTROL CENTER</h2>
          <p className="text-sm text-white/40 mt-1">Coordinator master dashboard — real-time system overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything..." className="pl-9 w-56 bg-black/30 border-white/10 text-xs text-white placeholder:text-white/15 h-8" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-lime/5 border border-lime/20">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-xs font-mono text-lime">LIVE</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-surface border border-white/5 h-auto flex-wrap gap-1 p-1 w-full">
          {[
            { key: 'overview', label: 'Dashboard', icon: BarChart3 },
            { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
            { key: 'approvals', label: 'Approvals', icon: ShieldCheck },
            { key: 'customers', label: 'Customers', icon: Users },
            { key: 'engineers', label: 'Engineers', icon: PersonStanding },
            { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { key: 'audit', label: 'Audit Log', icon: FileText },
            { key: 'communications', label: 'Communications', icon: Mail },
            { key: 'ai-costs', label: 'AI Costs', icon: Bot },
            { key: 'settings', label: 'Settings', icon: Settings },
          ].map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-lime/10 data-[state=active]:text-lime data-[state=active]:border-lime/30 border border-transparent px-3 py-1.5 gap-1.5">
              <t.icon className="w-3 h-3" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════════════════════════════════════ OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Top KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <OverviewCard icon={AlertTriangle} label="Active Incidents" value={ALL_INCIDENTS.filter(i => i.status !== 'closed').length.toString()} sub={`P1: ${p1Count} | P2: ${p2Count} | P3: ${p3Count}`} color="text-red-400" />
            <OverviewCard icon={Zap} label="AI Success Rate" value="95.4%" sub="Avg Fix: 18m | Queue: 3" color="text-lime" />
            <OverviewCard icon={DollarSign} label="Revenue Today" value={`$${revenueToday.toLocaleString()}`} sub={`MRR: $${totalMrr.toLocaleString()} | Churn: 2.1%`} color="text-green-400" />
            <OverviewCard icon={Users} label="Engineers" value="5 Online" sub="On-Call: 3 | Busy: 3 | Esc: 1" color="text-cyan" />
            <OverviewCard icon={Bot} label="AI Costs Today" value={`$${aiCostToday.toLocaleString()}`} sub="Margin: 82.3%" color="text-purple-400" />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue vs AI Cost */}
            <div className="lg:col-span-2 bg-surface border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Revenue vs AI Costs (This Week)</h3>
                <span className="text-[10px] text-green-400 font-mono">+$2,478 net</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={REVENUE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="revenue" fill="#d1ff00" name="Revenue" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="aiCost" fill="#a855f7" name="AI Cost" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Cost Breakdown Pie */}
            <div className="bg-surface border border-white/5 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">AI Cost Split</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={AI_COST_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                    {AI_COST_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {AI_COST_DATA.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2"><div className="w-2 h-2" style={{ backgroundColor: d.color }} />{d.name}</span>
                    <span className="text-white/30 font-mono">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Second Row: Engineer Performance + Uptime */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-white/5 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Engineer Performance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ENGINEER_PERF} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#ffffff50' }} axisLine={{ stroke: '#ffffff10' }} width={60} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                  <Bar dataKey="resolved" fill="#00f0ff" name="Resolved" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface border border-white/5 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Uptime Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={UPTIME_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <YAxis domain={[99, 100]} tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                  <Area type="monotone" dataKey="up" stroke="#d1ff00" fill="#d1ff0010" strokeWidth={2} name="Uptime %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-surface border border-white/5 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Subscription Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              {SUBS_DATA.map(s => (
                <div key={s.plan} className="text-center p-4 border" style={{ borderColor: `${s.color}20`, backgroundColor: `${s.color}05` }}>
                  <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.count}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.plan}</div>
                  <div className="text-xs text-white/40 font-mono mt-1">${s.mrr.toLocaleString()}/mo</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ INCIDENTS */}
        <TabsContent value="incidents" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'repairing', 'validating', 'deploying', 'pending_approval', 'escalated', 'closed'].map(f => (
              <button key={f} onClick={() => setIncidentFilter(f)} className={`px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors ${incidentFilter === f ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}>
                {f === 'all' ? 'ALL' : f === 'pending_approval' ? 'PENDING' : f}
              </button>
            ))}
            <span className="text-[10px] text-white/20 font-mono ml-auto">{filteredIncidents.length} incidents</span>
          </div>

          <div className="bg-surface border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    {['ID', 'Site', 'Customer', 'Severity', 'Status', 'AI Conf.', 'Engineer', 'AI Cost', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-bold text-white/70">{inc.id}</td>
                      <td className="p-3 text-white/60">{inc.site}</td>
                      <td className="p-3 text-white/40">{inc.customer}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 border ${SEVERITY_COLORS[inc.severity]}`}>{inc.severity}</span></td>
                      <td className="p-3"><span className={`text-[10px] font-bold uppercase ${STATUS_COLORS[inc.status] || 'text-white/30'}`}>{inc.status}</span></td>
                      <td className="p-3 font-mono font-bold" style={{ color: inc.aiConfidence >= 90 ? '#4ade80' : inc.aiConfidence >= 70 ? '#facc15' : '#f87171' }}>{inc.aiConfidence}%</td>
                      <td className="p-3 text-white/40">{inc.engineer || '—'}</td>
                      <td className="p-3 font-mono text-white/30">${inc.cost}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1 text-white/20 hover:text-cyan transition-colors" title="View"><Eye className="w-3 h-3" /></button>
                          {inc.status !== 'closed' && <button className="p-1 text-white/20 hover:text-red-400 transition-colors" title="Escalate"><AlertTriangle className="w-3 h-3" /></button>}
                          {inc.status !== 'closed' && <button className="p-1 text-white/20 hover:text-yellow-400 transition-colors" title="Pause"><Pause className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ APPROVALS */}
        <TabsContent value="approvals" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Pending Deployment Approvals</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/20 font-mono">Auto-refresh: 30s</span>
              <button onClick={() => toast.success('Queue refreshed')} className="p-1.5 text-white/20 hover:text-lime transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {ALL_INCIDENTS.filter(i => i.status === 'pending_approval' || i.status === 'coordinator_review').map(inc => (
            <div key={inc.id} className="bg-surface border border-white/5 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono font-bold text-white/70 text-sm">{inc.id}</span>
                    <span className="text-xs text-white/40">{inc.site}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 border ${SEVERITY_COLORS[inc.severity]}`}>{inc.severity}</span>
                    <span className="text-[10px] font-mono text-cyan bg-cyan/5 border border-cyan/20 px-2 py-0.5">AI: {inc.aiConfidence}%</span>
                  </div>
                  <p className="text-xs text-white/40 mb-3">Root cause identified. Fix applied in isolated VM. Smoke tests: 8/8 passed. Ready for deployment.</p>
                  <div className="flex items-center gap-4 text-[10px] text-white/20">
                    <span>Customer: {inc.customer}</span>
                    <span>Engineer: {inc.engineer}</span>
                    <span>AI Cost: ${inc.cost}</span>
                    <span className="text-red-400 animate-pulse flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Waiting 12m</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toast.success(`${inc.id} approved for deployment`)} className="flex items-center gap-1.5 px-4 py-2 bg-lime/10 border border-lime/30 text-lime text-xs font-bold hover:bg-lime/20 transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => toast.error(`${inc.id} rejected — returned to AI`)} className="flex items-center gap-1.5 px-4 py-2 bg-red/10 border border-red/20 text-red-400 text-xs font-bold hover:bg-red/20 transition-colors">
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button className="p-2 bg-white/5 border border-white/10 text-white/30 hover:text-white/60 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {ALL_INCIDENTS.filter(i => i.status === 'pending_approval' || i.status === 'coordinator_review').length === 0 && (
            <div className="p-8 text-center bg-surface border border-white/5">
              <CheckCircle className="w-8 h-8 text-lime mx-auto mb-2" />
              <p className="text-sm text-white/40">No pending approvals</p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════ CUSTOMERS */}
        <TabsContent value="customers" className="space-y-4 mt-6">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'active', 'overdue', 'churned'].map(f => (
              <button key={f} onClick={() => setCustomerFilter(f)} className={`px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors ${customerFilter === f ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}>{f === 'all' ? 'ALL' : f}</button>
            ))}
            <span className="text-[10px] text-white/20 font-mono ml-auto">{filteredCustomers.length} customers</span>
          </div>

          <div className="bg-surface border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">{['ID', 'Company', 'Website', 'Plan', 'MRR', 'Incidents', 'Status', 'Since', 'Credentials', 'Actions'].map(h => <th key={h} className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono font-bold text-white/70">{c.id}</td>
                      <td className="p-3"><div className="text-white/70 font-medium">{c.company}</div><div className="text-[10px] text-white/30">{c.email}</div></td>
                      <td className="p-3 text-white/40">{c.website}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 border ${c.plan === 'Fortress' ? 'bg-magenta/10 text-magenta border-magenta/20' : c.plan === 'Sentinel' ? 'bg-lime/10 text-lime border-lime/20' : 'bg-cyan/10 text-cyan border-cyan/20'}`}>{c.plan}</span></td>
                      <td className="p-3 font-mono text-white/60">${c.mrr}</td>
                      <td className="p-3 text-white/40">{c.incidents}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold uppercase ${c.status === 'active' ? 'text-green-400' : c.status === 'overdue' ? 'text-red-400' : 'text-white/30'}`}>{c.status}</span></td>
                      <td className="p-3 text-white/20 font-mono">{c.since}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold ${c.credStatus === 'active' ? 'text-lime' : c.credStatus === 'expiring' ? 'text-yellow-400' : 'text-white/30'}`}>{c.credStatus}</span></td>
                      <td className="p-3"><div className="flex gap-1"><button className="p-1 text-white/20 hover:text-cyan"><Eye className="w-3 h-3" /></button><button className="p-1 text-white/20 hover:text-yellow-400"><KeyRound className="w-3 h-3" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ ENGINEERS */}
        <TabsContent value="engineers" className="space-y-6 mt-6">
          {/* Presence Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface border border-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1"><Wifi className="w-4 h-4 text-green-400" /><span className="text-2xl font-black font-mono text-green-400">5</span></div>
              <div className="text-[10px] text-white/30 uppercase">Online</div>
            </div>
            <div className="bg-surface border border-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1"><Radio className="w-4 h-4 text-cyan" /><span className="text-2xl font-black font-mono text-cyan">3</span></div>
              <div className="text-[10px] text-white/30 uppercase">On-Call</div>
            </div>
            <div className="bg-surface border border-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1"><HardDrive className="w-4 h-4 text-orange-400" /><span className="text-2xl font-black font-mono text-orange-400">3</span></div>
              <div className="text-[10px] text-white/30 uppercase">Busy</div>
            </div>
            <div className="bg-surface border border-white/5 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-2xl font-black font-mono text-red-400">1</span></div>
              <div className="text-[10px] text-white/30 uppercase">Escalated</div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="bg-surface border border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Engineer Performance</h3>
              <span className="text-[10px] text-white/20 font-mono">This Week</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">{['Engineer', 'Status', 'Resolved', 'Avg Time', 'Satisfaction', 'Current'].map(h => <th key={h} className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: 'Alex Chen', status: 'busy', resolved: 12, avgTime: 14, satisfaction: 4.9, current: 'INC-0641' },
                    { name: 'Jordan Smith', status: 'busy', resolved: 9, avgTime: 18, satisfaction: 4.8, current: 'INC-0640' },
                    { name: 'Morgan Lee', status: 'busy', resolved: 15, avgTime: 11, satisfaction: 5.0, current: 'INC-0639 + 0638' },
                    { name: 'Sam Rivera', status: 'on-call', resolved: 7, avgTime: 22, satisfaction: 4.7, current: '—' },
                    { name: 'Taylor Park', status: 'offline', resolved: 10, avgTime: 16, satisfaction: 4.8, current: 'Off duty' },
                  ].map(eng => (
                    <tr key={eng.name} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${eng.status === 'busy' ? 'bg-orange-400 animate-pulse' : eng.status === 'on-call' ? 'bg-cyan' : 'bg-white/20'}`} /><span className="font-medium text-white/70">{eng.name}</span></div></td>
                      <td className="p-3"><span className={`text-[10px] font-bold uppercase ${eng.status === 'busy' ? 'text-orange-400' : eng.status === 'on-call' ? 'text-cyan' : 'text-white/30'}`}>{eng.status}</span></td>
                      <td className="p-3 font-mono text-white/60">{eng.resolved}</td>
                      <td className="p-3 font-mono text-white/40">{eng.avgTime}m</td>
                      <td className="p-3"><div className="flex items-center gap-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(eng.satisfaction) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} />)}<span className="text-[10px] text-white/30 ml-1">{eng.satisfaction}</span></div></td>
                      <td className="p-3 font-mono text-cyan text-[10px]">{eng.current}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Perf Chart */}
          <div className="bg-surface border border-white/5 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Resolution Time Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={ENGINEER_PERF}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                <YAxis tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                <Line type="monotone" dataKey="avgTime" stroke="#00f0ff" strokeWidth={2} dot={{ fill: '#00f0ff', r: 3 }} name="Avg Time (min)" />
                <Line type="monotone" dataKey="resolved" stroke="#d1ff00" strokeWidth={2} dot={{ fill: '#d1ff00', r: 3 }} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ SUBSCRIPTIONS */}
        <TabsContent value="subscriptions" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard icon={CreditCard} label="Total MRR" value={`$${totalMrr.toLocaleString()}`} sub="254 active subscribers" color="text-green-400" />
            <OverviewCard icon={TrendingUp} label="Growth (MoM)" value="+12.3%" sub="+31 new this month" color="text-lime" />
            <OverviewCard icon={ArrowDownRight} label="Churn Rate" value="2.1%" sub="6 churned / 254 total" color="text-red-400" />
            <OverviewCard icon={Sparkles} label="LTV (avg)" value="$4,892" sub="18.2 month avg lifetime" color="text-cyan" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-white/5 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Plan Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={SUBS_DATA} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ plan, count }: { plan: string; count: number }) => `${plan}: ${count}`}>
                    {SUBS_DATA.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface border border-white/5 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">MRR by Plan</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SUBS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="plan" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                  <Bar dataKey="mrr" fill="#d1ff00" name="MRR ($)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ AUDIT LOG */}
        <TabsContent value="audit" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/30 font-mono uppercase tracking-wider">Immutable — Append Only — No Delete/Edit</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toast.success('Audit log exported as CSV')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase hover:border-white/20 transition-colors">
                <Download className="w-3 h-3" /> Export CSV
              </button>
              <button onClick={() => toast.success('Audit log exported as PDF')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase hover:border-white/20 transition-colors">
                <FileText className="w-3 h-3" /> Export PDF
              </button>
            </div>
          </div>

          <div className="bg-surface border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">{['ID', 'Timestamp', 'Actor', 'Action', 'Resource', 'Severity'].map(h => <th key={h} className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {AUDIT_LOGS.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 font-mono text-white/30">{log.id}</td>
                      <td className="p-3 font-mono text-white/40">{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold ${log.actor.startsWith('AI') ? 'text-lime' : log.actor.startsWith('system') ? 'text-white/30' : 'text-cyan'}`}>{log.actor}</span></td>
                      <td className="p-3 text-white/50">{log.action}</td>
                      <td className="p-3 text-white/40 font-mono">{log.resource}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 border ${SEVERITY_COLORS[log.severity]}`}>{log.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ COMMUNICATIONS */}
        <TabsContent value="communications" className="mt-6">
          <div className="bg-surface border border-white/5 p-8 text-center">
            <Mail className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-2">Communications Management</p>
            <p className="text-xs text-white/20 mb-4">View templates, delivery logs, and automation rules</p>
            <Link to="/hq/communications">
              <Button className="bg-lime/10 border border-lime/30 text-lime hover:bg-lime/20 text-xs font-bold uppercase">
                Open Communications HQ <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ AI COSTS */}
        <TabsContent value="ai-costs" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard icon={Bot} label="ANTIGRAVITY" value="$892" sub="$0.42/orchestration" color="text-cyan" />
            <OverviewCard icon={Sparkles} label="Claude (Anthropic)" value="$1,247" sub="$0.003/1K tokens" color="text-lime" />
            <OverviewCard icon={HardDrive} label="Jules (Compute)" value="$456" sub="$0.12/minute" color="text-purple-400" />
            <OverviewCard icon={Percent} label="Avg per Incident" value="$5.82" sub="Margin: 82.3%" color="text-green-400" />
          </div>

          {/* Cost by Tier */}
          <div className="bg-surface border border-white/5 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">AI Cost & Margin by Service Tier</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/5">{['Tier', 'Price', 'Avg AI Cost', 'Margin', 'Margin %', 'Alert'].map(h => <th key={h} className="text-left p-3 text-[10px] text-white/30 uppercase tracking-wider font-bold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { tier: 'Rapid Fix', price: 149, aiCost: 4.12, margin: 144.88, pct: 97.2 },
                    { tier: 'Critical Fix', price: 349, aiCost: 12.45, margin: 336.55, pct: 96.4 },
                    { tier: 'Catastrophic Fix', price: 799, aiCost: 28.92, margin: 770.08, pct: 96.4 },
                    { tier: 'Guardian (mo)', price: 99, aiCost: 18.50, margin: 80.50, pct: 81.3 },
                    { tier: 'Sentinel (mo)', price: 249, aiCost: 42.10, margin: 206.90, pct: 83.1 },
                    { tier: 'Fortress (mo)', price: 599, aiCost: 89.30, margin: 509.70, pct: 85.1 },
                  ].map(row => (
                    <tr key={row.tier} className={`hover:bg-white/[0.02] transition-colors ${row.pct < 85 ? 'bg-yellow-400/[0.02]' : ''}`}>
                      <td className="p-3 font-medium text-white/70">{row.tier}</td>
                      <td className="p-3 font-mono text-white/60">${row.price}</td>
                      <td className="p-3 font-mono text-purple-400">${row.aiCost.toFixed(2)}</td>
                      <td className="p-3 font-mono text-green-400">${row.margin.toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold" style={{ color: row.pct >= 90 ? '#4ade80' : row.pct >= 85 ? '#facc15' : '#f87171' }}>{row.pct}%</td>
                      <td className="p-3">{row.pct < 85 ? <span className="text-[10px] text-yellow-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Below target</span> : <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Healthy</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Trend Chart */}
          <div className="bg-surface border border-white/5 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">AI Cost per Incident Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={[
                { day: 'Mon', cost: 4.2 }, { day: 'Tue', cost: 5.8 }, { day: 'Wed', cost: 3.9 },
                { day: 'Thu', cost: 7.1 }, { day: 'Fri', cost: 6.3 }, { day: 'Sat', cost: 4.8 }, { day: 'Sun', cost: 5.2 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                <YAxis tick={{ fontSize: 10, fill: '#ffffff30' }} axisLine={{ stroke: '#ffffff10' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }} />
                <Line type="monotone" dataKey="cost" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} name="AI Cost ($)" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ SETTINGS */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              { title: 'Team Management', icon: Users, desc: 'Add/remove coordinators, set permissions, manage access levels.', items: ['5 active coordinators', '2 pending invites', 'Role-based access'] },
              { title: 'Billing & Invoicing', icon: CreditCard, desc: 'Stripe integration, invoice settings, tax configuration.', items: ['Stripe connected', 'Auto-invoicing enabled', 'Tax: US + EU VAT'] },
              { title: 'AI Configuration', icon: Bot, desc: 'Model selection, confidence thresholds, cost caps.', items: ['Claude 4 Sonnet (default)', 'Min confidence: 90%', 'Cost cap: $50/incident'] },
              { title: 'Notifications', icon: Mail, desc: 'Alert routing, escalation rules, quiet hours.', items: ['PagerDuty integrated', 'Slack: #incidents', 'SMS: coordinators only'] },
              { title: 'Security', icon: Lock, desc: '2FA, API keys, audit retention, compliance.', items: ['2FA: required for all', 'API keys: 3 active', 'Retention: 7 years'] },
              { title: 'Integrations', icon: Globe, desc: 'Third-party tools and webhooks.', items: ['Stripe: connected', 'Slack: connected', 'PagerDuty: connected', 'GitHub: not connected'] },
            ].map(section => (
              <div key={section.title} className="bg-surface border border-white/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <section.icon className="w-5 h-5 text-lime" />
                  <h3 className="text-sm font-bold text-white/70">{section.title}</h3>
                </div>
                <p className="text-xs text-white/30 mb-3">{section.desc}</p>
                <div className="space-y-1.5">
                  {section.items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                      <CheckCircle className="w-3 h-3 text-lime/50 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview Card Component ──
function OverviewCard({ icon: Icon, label, value, sub, color }: { icon: typeof Activity; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-surface border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-black font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-white/20 mt-1">{sub}</div>
    </div>
  );
}
