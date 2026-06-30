// ═══════════════════════════════════════════════════════════════
// HQ SETTINGS v2.4 — Multi-panel Configuration Center
// Sub-nav: Operational Thresholds / API Keys / Billing / Security / Profile
// All settings wired to localStorage for persistence (Supabase sync ready)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Sliders, Key, CreditCard, Shield, User, Save,
  Copy, RefreshCw, Eye, EyeOff,
  Clock, Zap, Globe, Database, Lock,
  Trash2, Plus, Terminal,
  TrendingUp, HardDrive, Activity
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type SettingsTab = 'operational' | 'apikeys' | 'billing' | 'security' | 'profile';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  created: string;
  lastUsed: string;
  active: boolean;
}

const TAB_CONFIG: { key: SettingsTab; label: string; icon: typeof Sliders }[] = [
  { key: 'operational', label: 'Operational', icon: Sliders },
  { key: 'apikeys', label: 'API Keys', icon: Key },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'profile', label: 'Profile', icon: User },
];

// ── Load/Save helpers ──
const loadSettings = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(`hq_settings_${key}`); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};
const saveSettings = (key: string, value: unknown) => {
  localStorage.setItem(`hq_settings_${key}`, JSON.stringify(value));
};

export function HQSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('operational');

  // ── Operational Thresholds ──
  const [thresholds, setThresholds] = useState(() => loadSettings('thresholds', {
    autoEscalateMinutes: 15,
    maxRetries: 3,
    sandboxTTLMinutes: 60,
    notificationBatchSize: 50,
    p1ResponseSLA: 5,
    p2ResponseSLA: 15,
    p3ResponseSLA: 60,
    p4ResponseSLA: 240,
    maxConcurrentSandboxes: 10,
    autoArchiveDays: 30,
  }));

  // ── API Keys ──
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => loadSettings('apikeys', [
    { id: 'key-1', name: 'Production API', key: 'sk_prod_a1b2c3d4e5f6789012345678901234567890abcd', prefix: 'sk_prod', created: '2024-06-01', lastUsed: '2 min ago', active: true },
    { id: 'key-2', name: 'Staging API', key: 'sk_stag_x9y8z7w6v5u4t3s2r1q0987654321098765fedcba', prefix: 'sk_stag', created: '2024-05-15', lastUsed: '1 hr ago', active: true },
    { id: 'key-3', name: 'Monitoring Webhook', key: 'sk_mon_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', prefix: 'sk_mon', created: '2024-04-20', lastUsed: '5 min ago', active: false },
  ]));
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');

  // ── Billing ──
  const [billing] = useState(() => loadSettings('billing', {
    plan: 'Enterprise',
    mrr: 2847,
    incidentsUsed: 1847,
    incidentsLimit: 5000,
    sandboxesUsed: 284,
    sandboxesLimit: 1000,
    storageUsed: 47.3,
    storageLimit: 100,
    apiCallsUsed: 2847000,
    apiCallsLimit: 10000000,
    alertContacts: 12,
    alertContactsLimit: 50,
  }));

  // ── Security ──
  const [security, setSecurity] = useState(() => loadSettings('security', {
    mfaEnabled: true,
    sessionTimeout: 30,
    requireMFAForAdmin: true,
    passwordMinLength: 12,
    passwordRequireSpecial: true,
    auditRetentionDays: 365,
    ipAllowlist: '',
    enforceHTTPS: true,
  }));

  // ── Profile ──
  const [profile, setProfile] = useState(() => loadSettings('profile', {
    fullName: user?.user_metadata?.full_name || 'Admin User',
    email: user?.email || 'admin@uptimeops.io',
    timezone: 'America/New_York',
    notifications: { email: true, push: false, criticalOnly: false, digest: true },
  }));

  // Persist on change
  useEffect(() => { saveSettings('thresholds', thresholds); }, [thresholds]);
  useEffect(() => { saveSettings('apikeys', apiKeys); }, [apiKeys]);
  useEffect(() => { saveSettings('billing', billing); }, [billing]);
  useEffect(() => { saveSettings('security', security); }, [security]);
  useEffect(() => { saveSettings('profile', profile); }, [profile]);

  // ── Handlers ──
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const handleRegenerateKey = (id: string) => {
    const newKey = 'sk_' + Math.random().toString(36).substring(2, 6) + '_' + Array(40).fill(0).map(() => Math.random().toString(36)[2]).join('');
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, key: newKey, created: new Date().toISOString().split('T')[0] } : k));
    toast.success('API key regenerated');
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast.success('API key revoked');
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) { toast.error('Enter a key name'); return; }
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substring(2, 6)}_${Array(40).fill(0).map(() => Math.random().toString(36)[2]).join('')}`,
      prefix: 'sk_custom',
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      active: true,
    };
    setApiKeys(prev => [...prev, newKey]);
    setNewKeyName('');
    toast.success(`Created API key: ${newKeyName}`);
  };

  const handleSave = (section: string) => {
    toast.success(`${section} settings saved`);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Threshold input helper ──
  const ThresholdField = ({ label, value, unit, min, max, onChange }: { label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void }) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-white/60">{label}</span>
        <span className="text-[10px] font-mono text-lime">{value} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-lime"
      />
    </div>
  );

  // ── Usage bar helper ──
  const UsageBar = ({ label, used, limit, unit, color = '#a3e635' }: { label: string; used: number; limit: number; unit: string; color?: string }) => {
    const pct = Math.min((used / limit) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40">{label}</span>
          <span className="font-mono text-white/50">{used.toLocaleString()} / {limit.toLocaleString()} {unit}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#f43f5e' : pct > 70 ? '#fbbf24' : color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">SETTINGS</h1>
        <p className="text-xs text-white/40 mt-0.5">HQ configuration center — operational thresholds, API keys, billing, and security</p>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1 overflow-x-auto">
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════ OPERATIONAL THRESHOLDS ═══════ */}
      {activeTab === 'operational' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-lime" /> Operational Thresholds
            </h2>
            <button onClick={() => handleSave('Operational')} className="flex items-center gap-1.5 px-4 py-2 bg-lime text-black text-[11px] font-bold rounded hover:bg-lime/90 transition-all">
              <Save className="w-3.5 h-3.5" /> Save Thresholds
            </button>
          </div>

          {/* SLA Response Times */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan" /> Response SLA (minutes)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'P1 Critical', key: 'p1ResponseSLA', color: '#f43f5e' },
                { label: 'P2 High', key: 'p2ResponseSLA', color: '#fb923c' },
                { label: 'P3 Medium', key: 'p3ResponseSLA', color: '#fbbf24' },
                { label: 'P4 Low', key: 'p4ResponseSLA', color: '#a3e635' },
              ].map(sla => (
                <div key={sla.key} className="bg-white/[0.03] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sla.color }} />
                    <span className="text-[10px] font-bold text-white/50">{sla.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={thresholds[sla.key as keyof typeof thresholds]}
                      onChange={e => setThresholds(prev => ({ ...prev, [sla.key]: Number(e.target.value) }))}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm font-mono text-white text-center focus:border-lime/30 outline-none"
                    />
                  </div>
                  <span className="text-[9px] text-white/20 mt-1 block text-center">minutes</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Thresholds */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-lime" /> Pipeline & Automation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ThresholdField label="Auto-Escalation Timer" value={thresholds.autoEscalateMinutes} unit="min" min={1} max={60} onChange={v => setThresholds(prev => ({ ...prev, autoEscalateMinutes: v }))} />
              <ThresholdField label="Max Retry Attempts" value={thresholds.maxRetries} unit="x" min={1} max={10} onChange={v => setThresholds(prev => ({ ...prev, maxRetries: v }))} />
              <ThresholdField label="Sandbox TTL" value={thresholds.sandboxTTLMinutes} unit="min" min={5} max={180} onChange={v => setThresholds(prev => ({ ...prev, sandboxTTLMinutes: v }))} />
              <ThresholdField label="Notif. Batch Size" value={thresholds.notificationBatchSize} unit="msgs" min={1} max={200} onChange={v => setThresholds(prev => ({ ...prev, notificationBatchSize: v }))} />
              <ThresholdField label="Max Concurrent SBX" value={thresholds.maxConcurrentSandboxes} unit="sbx" min={1} max={50} onChange={v => setThresholds(prev => ({ ...prev, maxConcurrentSandboxes: v }))} />
              <ThresholdField label="Auto-Archive After" value={thresholds.autoArchiveDays} unit="days" min={7} max={365} onChange={v => setThresholds(prev => ({ ...prev, autoArchiveDays: v }))} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ API KEYS ═══════ */}
      {activeTab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Key className="w-4 h-4 text-lime" /> API Keys
            </h2>
            <div className="flex items-center gap-2">
              <Input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="New key name..."
                className="w-48 bg-surface border-white/10 text-white text-xs placeholder:text-white/20"
              />
              <button onClick={handleCreateKey} className="flex items-center gap-1.5 px-3 py-2 bg-lime text-black text-[11px] font-bold rounded hover:bg-lime/90 transition-all">
                <Plus className="w-3.5 h-3.5" /> Create Key
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {apiKeys.map(apiKey => (
              <div key={apiKey.id} className={`bg-white/[0.02] border rounded-xl p-4 transition-all ${apiKey.active ? 'border-white/5' : 'border-white/5 opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan" />
                    <span className="text-xs font-bold text-white/80">{apiKey.name}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${apiKey.active ? 'bg-lime/10 text-lime' : 'bg-white/5 text-white/30'}`}>
                      {apiKey.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleKeyVisibility(apiKey.id)} className="p-1.5 text-white/30 hover:text-white/60 transition-all">
                      {showKeyMap[apiKey.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleCopyKey(apiKey.key)} className="p-1.5 text-white/30 hover:text-cyan transition-all">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRegenerateKey(apiKey.id)} className="p-1.5 text-white/30 hover:text-amber transition-all">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteKey(apiKey.id)} className="p-1.5 text-white/30 hover:text-rose transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 mb-2">
                  <code className="text-[10px] font-mono text-white/40 flex-1 truncate">
                    {showKeyMap[apiKey.id] ? apiKey.key : `${apiKey.prefix}_****${apiKey.key.slice(-8)}`}
                  </code>
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/25">
                  <span>Created: {apiKey.created}</span>
                  <span>Last used: {apiKey.lastUsed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ BILLING ═══════ */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-lime" /> Billing & Quotas
            </h2>
            <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-lime/10 text-lime rounded-lg border border-lime/20">
              {billing.plan} Plan
            </span>
          </div>

          {/* MRR Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Monthly Recurring Revenue</p>
                <p className="text-3xl font-black text-lime">${billing.mrr.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-lime/20" />
            </div>
            <div className="h-8 flex items-end gap-1">
              {[65, 72, 68, 80, 85, 78, 90, 88, 95, 92, 98, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-lime/20 rounded-sm hover:bg-lime/40 transition-all" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-[9px] text-white/20 mt-1 text-center">Jan – Dec 2024</p>
          </div>

          {/* Usage Quotas */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan" /> Usage Quotas
            </h3>
            <UsageBar label="Incidents" used={billing.incidentsUsed} limit={billing.incidentsLimit} unit="/mo" />
            <UsageBar label="Sandboxes" used={billing.sandboxesUsed} limit={billing.sandboxesLimit} unit="/mo" color="#22d3ee" />
            <UsageBar label="Storage" used={billing.storageUsed} limit={billing.storageLimit} unit="GB" color="#e879f9" />
            <UsageBar label="API Calls" used={billing.apiCallsUsed} limit={billing.apiCallsLimit} unit="/mo" color="#fbbf24" />
            <UsageBar label="Alert Contacts" used={billing.alertContacts} limit={billing.alertContactsLimit} unit="seats" color="#34d399" />
          </div>
        </div>
      )}

      {/* ═══════ SECURITY ═══════ */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Shield className="w-4 h-4 text-lime" /> Security Policy
            </h2>
            <button onClick={() => handleSave('Security')} className="flex items-center gap-1.5 px-4 py-2 bg-lime text-black text-[11px] font-bold rounded hover:bg-lime/90 transition-all">
              <Save className="w-3.5 h-3.5" /> Save Policy
            </button>
          </div>

          <div className="space-y-3">
            {/* MFA */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-lime" />
                <div>
                  <p className="text-xs font-bold text-white/80">Multi-Factor Authentication</p>
                  <p className="text-[10px] text-white/30">Require TOTP for all admin accounts</p>
                </div>
              </div>
              <Switch checked={security.mfaEnabled} onCheckedChange={v => setSecurity(prev => ({ ...prev, mfaEnabled: v }))} />
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-cyan" />
                <div>
                  <p className="text-xs font-bold text-white/80">MFA Required for Admin</p>
                  <p className="text-[10px] text-white/30">Admins cannot disable their own MFA</p>
                </div>
              </div>
              <Switch checked={security.requireMFAForAdmin} onCheckedChange={v => setSecurity(prev => ({ ...prev, requireMFAForAdmin: v }))} />
            </div>

            {/* Session timeout */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber" />
                  <div>
                    <p className="text-xs font-bold text-white/80">Session Timeout</p>
                    <p className="text-[10px] text-white/30">Auto-logout after inactivity</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-lime">{security.sessionTimeout} min</span>
              </div>
              <input
                type="range" min={5} max={120} step={5} value={security.sessionTimeout}
                onChange={e => setSecurity(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-lime"
              />
            </div>

            {/* Password policy */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-rose" />
                <p className="text-xs font-bold text-white/80">Password Policy</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Minimum Length</label>
                  <input
                    type="number" min={8} max={32} value={security.passwordMinLength}
                    onChange={e => setSecurity(prev => ({ ...prev, passwordMinLength: Number(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white text-center focus:border-lime/30 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={security.passwordRequireSpecial} onCheckedChange={v => setSecurity(prev => ({ ...prev, passwordRequireSpecial: v }))} />
                  <span className="text-[11px] text-white/50">Require special characters</span>
                </div>
              </div>
            </div>

            {/* Audit retention */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-magenta" />
                  <div>
                    <p className="text-xs font-bold text-white/80">Audit Log Retention</p>
                    <p className="text-[10px] text-white/30">SHA-256 hashed ledger retention period</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-magenta">{security.auditRetentionDays} days</span>
              </div>
              <input
                type="range" min={30} max={2555} step={30} value={security.auditRetentionDays}
                onChange={e => setSecurity(prev => ({ ...prev, auditRetentionDays: Number(e.target.value) }))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#e879f9' }}
              />
            </div>

            {/* HTTPS enforcement */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-cyan" />
                <div>
                  <p className="text-xs font-bold text-white/80">Enforce HTTPS</p>
                  <p className="text-[10px] text-white/30">Redirect all HTTP traffic to TLS</p>
                </div>
              </div>
              <Switch checked={security.enforceHTTPS} onCheckedChange={v => setSecurity(prev => ({ ...prev, enforceHTTPS: v }))} />
            </div>

            {/* IP Allowlist */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-xs font-bold text-white/80">IP Allowlist</p>
                  <p className="text-[10px] text-white/30">Comma-separated CIDR blocks (empty = allow all)</p>
                </div>
              </div>
              <textarea
                value={security.ipAllowlist}
                onChange={e => setSecurity(prev => ({ ...prev, ipAllowlist: e.target.value }))}
                placeholder="10.0.0.0/8, 192.168.1.0/24"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:border-lime/30 outline-none resize-none h-16"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PROFILE ═══════ */}
      {activeTab === 'profile' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
              <User className="w-4 h-4 text-lime" /> Profile
            </h2>
            <button onClick={() => handleSave('Profile')} className="flex items-center gap-1.5 px-4 py-2 bg-lime text-black text-[11px] font-bold rounded hover:bg-lime/90 transition-all">
              <Save className="w-3.5 h-3.5" /> Save Profile
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Full Name</label>
              <Input value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} className="bg-black/30 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Email</label>
              <Input value={profile.email} disabled className="bg-black/30 border-white/10 text-white/50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded focus:border-lime/30 outline-none">
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Denver</option>
                <option>America/Los_Angeles</option>
                <option>UTC</option>
                <option>Europe/London</option>
                <option>Europe/Paris</option>
                <option>Asia/Tokyo</option>
                <option>Asia/Singapore</option>
              </select>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan" /> Notification Preferences
            </h3>
            {[
              { key: 'email', label: 'Email Alerts', desc: 'Incident and system alerts via email' },
              { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
              { key: 'criticalOnly', label: 'Critical Only', desc: 'Only notify for P1/P2 severity incidents' },
              { key: 'digest', label: 'Daily Digest', desc: 'Summary of all activity in the last 24h' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-xs font-medium text-white/70">{item.label}</p>
                  <p className="text-[10px] text-white/30">{item.desc}</p>
                </div>
                <Switch
                  checked={profile.notifications[item.key as keyof typeof profile.notifications]}
                  onCheckedChange={checked => setProfile(p => ({ ...p, notifications: { ...p.notifications, [item.key]: checked } }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
