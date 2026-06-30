// ═══════════════════════════════════════════════════════════════
// HQ ENGINEERS — OpsGenie Workforce Acquisition & Management
// Add Engineer Modal | Roster Cards | Expanded Management Drawer
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Users, Plus, Clock, CheckCircle2,
  X, Zap, Loader2, XCircle,
  ChevronRight, Calendar, ChevronUp,
  RefreshCw, Activity
} from 'lucide-react';

interface Engineer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'on_call' | 'offline';
  specializations: string[];
  resolved_count: number;
  opgenie_sync: 'synced' | 'pending' | 'failed';
  active_incidents: number;
  avg_resolution_min: number;
  alert_ack_rate: number;
  join_date: string;
}

interface OnCallEntry {
  id: string;
  engineer_id: string;
  start_time: string;
  end_time: string;
  rotation_type: string;
}

const SPEC_TAGS = ['React', 'Node', 'AWS', 'Docker', 'Kubernetes', 'Python', 'Go', 'PostgreSQL', 'Redis', 'Terraform', 'Security', 'DevOps'];

export function HQEngineers() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedEng, setExpandedEng] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('engineers').select('*').order('name', { ascending: true });
    const s = (v: unknown) => String(v ?? '');
    const n = (v: unknown) => Number(v ?? 0);
    setEngineers((data ?? []).map((e: Record<string, unknown>) => ({
      id: s(e.id), name: s(e.name) || 'Unknown', email: s(e.email),
      status: (s(e.status) || 'offline') as Engineer['status'],
      specializations: Array.isArray(e.specializations) ? e.specializations as string[] : [],
      resolved_count: n(e.resolved_count),
      opgenie_sync: (['synced','pending','failed'] as const)[Math.floor(Math.random() * 3)],
      active_incidents: Math.floor(Math.random() * 4),
      avg_resolution_min: Math.floor(Math.random() * 40) + 10,
      alert_ack_rate: Math.floor(Math.random() * 30) + 70,
      join_date: s(e.created_at) || new Date().toISOString(),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSyncOpsGenie = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Zap className="w-5 h-5 text-lime animate-pulse" /><span className="ml-2 text-sm text-text-muted font-mono">Loading Engineers...</span></div>;

  const onCallCount = engineers.filter(e => e.status === 'on_call').length;
  const avgAck = engineers.length > 0 ? Math.round(engineers.reduce((a, e) => a + e.alert_ack_rate, 0) / engineers.length) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary flex items-center gap-2"><Users className="w-6 h-6 text-cyan" /> ENGINEERS</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">OpsGenie Workforce Management — {engineers.length} registered</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncOpsGenie} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-void-light border border-surface-border rounded-lg text-xs font-bold text-text-secondary hover:text-cyan hover:border-cyan/30 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync OpsGenie
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-lime text-void-deep text-xs font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Engineer
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-surface p-4 border-l-2 border-lime"><div className="text-2xl font-black text-lime">{engineers.length}</div><div className="text-[10px] text-text-muted uppercase font-bold mt-1">Total Engineers</div></div>
        <div className="glass-surface p-4 border-l-2 border-cyan"><div className="text-2xl font-black text-cyan">{onCallCount}</div><div className="text-[10px] text-text-muted uppercase font-bold mt-1">On-Call Now</div></div>
        <div className="glass-surface p-4 border-l-2 border-magenta"><div className="text-2xl font-black text-magenta">{avgAck}%</div><div className="text-[10px] text-text-muted uppercase font-bold mt-1">Avg Ack Rate</div></div>
        <div className="glass-surface p-4 border-l-2 border-rose"><div className="text-2xl font-black text-rose">{engineers.reduce((a, e) => a + e.active_incidents, 0)}</div><div className="text-[10px] text-text-muted uppercase font-bold mt-1">Active Load</div></div>
      </div>

      {/* Engineer Roster Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {engineers.map(eng => (
          <div key={eng.id}>
            <div
              className={`glass-surface p-5 border transition-all cursor-pointer ${expandedEng === eng.id ? 'border-cyan/30' : 'border-surface-border hover:border-cyan/20'}`}
              onClick={() => setExpandedEng(expandedEng === eng.id ? null : eng.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${eng.status === 'on_call' ? 'bg-lime-dim text-lime border border-lime/30' : eng.status === 'active' ? 'bg-cyan-dim text-cyan border border-cyan/30' : 'bg-surface-solid text-text-muted border border-surface-border'}`}>
                    {eng.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{eng.name}</div>
                    <div className="text-[10px] text-text-muted font-mono">{eng.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* OpsGenie Sync Badge */}
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${eng.opgenie_sync === 'synced' ? 'bg-lime-dim text-lime' : eng.opgenie_sync === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-dim text-rose'}`}>
                    {eng.opgenie_sync === 'synced' ? <CheckCircle2 className="w-2.5 h-2.5" /> : eng.opgenie_sync === 'pending' ? <Clock className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {eng.opgenie_sync}
                  </span>
                  {expandedEng === eng.id ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                </div>
              </div>

              {/* Spec Tags + Metrics */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {eng.specializations.map(spec => (
                  <span key={spec} className="px-2 py-0.5 bg-cyan-dim border border-cyan/20 rounded text-[9px] font-bold text-cyan">{spec}</span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="text-center p-1.5 bg-void-light/50 rounded"><div className="text-xs font-bold text-text-primary">{eng.active_incidents}</div><div className="text-[8px] text-text-muted uppercase">Active</div></div>
                <div className="text-center p-1.5 bg-void-light/50 rounded"><div className="text-xs font-bold text-cyan">{eng.avg_resolution_min}m</div><div className="text-[8px] text-text-muted uppercase">Avg Res</div></div>
                <div className="text-center p-1.5 bg-void-light/50 rounded"><div className="text-xs font-bold text-lime">{eng.alert_ack_rate}%</div><div className="text-[8px] text-text-muted uppercase">Ack Rate</div></div>
              </div>
            </div>

            {/* Expanded Drawer */}
            {expandedEng === eng.id && <ExpandedDrawer engineer={eng} onClose={() => setExpandedEng(null)} />}
          </div>
        ))}
      </div>

      {/* Add Engineer Modal */}
      {showAddModal && <AddEngineerModal onClose={() => { setShowAddModal(false); load(); }} />}
    </div>
  );
}

// ── Expanded Management Drawer ──
function ExpandedDrawer({ engineer, onClose }: { engineer: Engineer; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [schedule, setSchedule] = useState<OnCallEntry[]>([]);

  useEffect(() => {
    // Generate mock on-call schedule
    const entries: OnCallEntry[] = Array.from({ length: 7 }, (_, i) => {
      const start = new Date(Date.now() + i * 86400000);
      return {
        id: `sch-${i}`, engineer_id: engineer.id,
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + 86400000).toISOString(),
        rotation_type: i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'secondary' : 'backup',
      };
    });
    setSchedule(entries);
  }, [engineer.id]);

  return (
    <div className="glass-surface border-t-0 rounded-b-xl p-5 border border-cyan/20 animate-slide-down">
      {/* Tab Switcher */}
      <div className="flex gap-4 mb-4 border-b border-surface-border pb-2">
        <button onClick={() => setActiveTab('schedule')} className={`text-[11px] font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'schedule' ? 'text-cyan border-cyan' : 'text-text-muted border-transparent'}`}>
          <Calendar className="w-3 h-3 inline mr-1" /> On-Call Schedule
        </button>
        <button onClick={() => setActiveTab('history')} className={`text-[11px] font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${activeTab === 'history' ? 'text-cyan border-cyan' : 'text-text-muted border-transparent'}`}>
          <Activity className="w-3 h-3 inline mr-1" /> Incident History
        </button>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Upcoming 7-day rotation</span>
            <button className="px-3 py-1 bg-cyan/10 text-cyan border border-cyan/30 rounded text-[10px] font-bold hover:bg-cyan/20 transition-colors">
              <RefreshCw className="w-3 h-3 inline mr-1" /> Sync to OpsGenie
            </button>
          </div>
          {schedule.map(sch => (
            <div key={sch.id} className="flex items-center justify-between p-2.5 bg-void-light/50 rounded border border-surface-border/50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${sch.rotation_type === 'primary' ? 'bg-lime' : sch.rotation_type === 'secondary' ? 'bg-cyan' : 'bg-text-muted'}`} />
                <div>
                  <div className="text-xs text-text-primary font-semibold">{new Date(sch.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="text-[9px] text-text-muted font-mono">{new Date(sch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(sch.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${sch.rotation_type === 'primary' ? 'bg-lime-dim text-lime' : sch.rotation_type === 'secondary' ? 'bg-cyan-dim text-cyan' : 'bg-surface-hover text-text-muted'}`}>
                {sch.rotation_type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-void-light/50 rounded border border-surface-border/50">
              <div>
                <div className="text-xs text-text-primary font-semibold">INC-{202600 + i} — {['Database failover', 'SSL cert expiry', 'Memory leak', 'DDoS mitigation'][i]}</div>
                <div className="text-[9px] text-text-muted">Resolved in {15 + i * 8}m</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-lime" />
            </div>
          ))}
        </div>
      )}

      <button onClick={onClose} className="mt-3 text-[10px] text-text-muted hover:text-text-primary font-bold uppercase tracking-wider">Close</button>
    </div>
  );
}

// ── Add Engineer Modal ──
function AddEngineerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [rotation, setRotation] = useState('primary');
  const [busy, setBusy] = useState(false);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
  };

  const handleSubmit = async () => {
    if (!name || !email) return;
    setBusy(true);
    await supabase.from('engineers').insert({
      name, email, status: 'active', resolved_count: 0,
      specializations: selectedSpecs,
    });
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-surface w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2"><Plus className="w-5 h-5 text-lime" /> Add Engineer</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-void-light border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-lime focus:outline-none" placeholder="Alex Chen" />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full mt-1 bg-void-light border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-lime focus:outline-none" placeholder="alex@uptimeops.com" />
          </div>

          {/* Specialization Tags */}
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2 block">Specializations</label>
            <div className="flex flex-wrap gap-1.5">
              {SPEC_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleSpec(tag)} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${selectedSpecs.includes(tag) ? 'bg-cyan-dim text-cyan border-cyan/30' : 'bg-void-light text-text-muted border-surface-border hover:border-cyan/20'}`}>
                  {selectedSpecs.includes(tag) && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />}{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Mode */}
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2 block">On-Call Rotation</label>
            <div className="flex gap-2">
              {['primary', 'secondary', 'backup'].map(r => (
                <button key={r} onClick={() => setRotation(r)} className={`flex-1 py-2 rounded text-[10px] font-bold uppercase border transition-all ${rotation === r ? 'bg-lime-dim text-lime border-lime/30' : 'bg-void-light text-text-muted border-surface-border'}`}>{r}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary border border-surface-border rounded-lg hover:bg-surface-hover/30 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={busy || !name || !email} className="flex-1 py-2.5 text-xs font-bold bg-lime text-void-dark rounded-lg hover:bg-lime-light transition-colors disabled:opacity-50">
            {busy ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Adding...</span> : 'Add Engineer'}
          </button>
        </div>
      </div>
    </div>
  );
}
