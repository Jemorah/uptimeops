// ═══════════════════════════════════════════════════════════════
// HQ ENGINEERS — Real engineer profiles from Supabase
// Invite new engineers, manage team
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Terminal, Loader2, Radio, Clock, Users, Mail, X, Shield, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Engineer {
  id: string;
  name: string;
  email: string;
  specialization: string[];
  is_on_call: boolean;
  status: string;
  created_at: string;
}

const SPECIALIZATIONS = ['Frontend', 'Backend', 'DevOps', 'Security', 'Database', 'Mobile', 'Cloud', 'SRE'];

export function HQEngineers() {
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSpecs, setInviteSpecs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('engineer_profiles').select('*').order('created_at', { ascending: false });
      setEngineers(data || []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel('hq-eng').on('postgres_changes', { event: '*', schema: 'public', table: 'engineer_profiles' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function sendInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }

    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast.error('Not authenticated');
        setSending(false);
        return;
      }

      const resp = await fetch(`${import.meta.env.NEXT_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://npcopjsqgjvirfjnjemt.supabase.co'}/functions/v1/send-engineer-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          specialization: inviteSpecs,
        }),
      });

      const result = await resp.json();

      if (!resp.ok || result.error) {
        toast.error(result.error || 'Failed to send invitation');
      } else {
        toast.success(result.message || `Invitation sent to ${inviteEmail}`);
        setShowInvite(false);
        setInviteEmail('');
        setInviteSpecs([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error');
    }
    setSending(false);
  }

  const filtered = engineers.filter(e => filter === 'all' || e.status === filter || (filter === 'on_call' && e.is_on_call));
  const onCallCount = engineers.filter(e => e.is_on_call).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-lime animate-spin" /><span className="ml-2 text-sm text-white/40">Loading engineers...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">ENGINEERS</h2>
          <p className="text-sm text-white/40 mt-1">{engineers.length} total · {onCallCount} on call</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/8 border border-lime/15">
            <Radio className="w-3 h-3 text-lime animate-pulse" />
            <span className="text-xs font-bold text-lime uppercase tracking-wider">{onCallCount} on call</span>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-lime text-black text-xs font-bold uppercase tracking-wider hover:bg-lime/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Invite Engineer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'available', 'on_call'].map(status => (
          <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${filter === status ? 'border-lime text-lime bg-lime/10' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
            {status === 'on_call' ? 'On Call' : status}
          </button>
        ))}
      </div>

      {/* Engineer Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(eng => (
          <div key={eng.id} className="bg-surface border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-white/40">{(eng.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${eng.is_on_call ? 'bg-lime' : 'bg-white/20'}`} />
                    <h3 className="text-sm font-bold">{eng.name || 'Unnamed'}</h3>
                  </div>
                  <p className="text-xs text-white/40 font-mono">{eng.email}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-white/30">{eng.id?.slice(0, 8)}</span>
            </div>

            {eng.is_on_call && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-lime/5 border border-lime/15 rounded-lg">
                <Terminal className="w-3 h-3 text-lime" />
                <span className="text-xs font-mono text-lime">Currently On Call</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mb-4">
              {(eng.specialization || []).map(spec => (
                <span key={spec} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/40 border border-white/5 rounded-full">{spec}</span>
              ))}
              {(!eng.specialization || eng.specialization.length === 0) && <span className="text-[10px] text-white/20">No specializations</span>}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-xs text-white/25 flex items-center gap-1"><Clock className="w-3 h-3" />{eng.status || 'active'}</span>
              <button
                onClick={() => navigate(`/hq/engineers?engineer=${eng.id}`)}
                className="text-xs text-lime hover:underline font-bold"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-10 text-center">
          <Users className="w-8 h-8 mx-auto mb-3 text-white/10" />
          <p className="text-sm text-white/30">No engineers match the filter</p>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e0e14] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-lime" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Invite Engineer</h3>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-1 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <p className="text-xs text-white/40">
              Send an invitation email to a new engineer. They'll receive a secure link to set up their account.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-lime/50"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5">Specialization</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALIZATIONS.map(spec => (
                    <button
                      key={spec}
                      onClick={() => setInviteSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])}
                      className={`px-2 py-1 text-[10px] font-bold transition-all ${inviteSpecs.includes(spec) ? 'bg-lime text-black' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5">
                <Shield className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <p className="text-[10px] text-white/30">
                  The invite link expires in 7 days. The engineer will set their own password during onboarding.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 border border-white/10 text-xs font-bold text-white/40 hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={sending || !inviteEmail.trim()}
                className="flex-1 py-2.5 bg-lime text-black text-xs font-bold hover:bg-lime/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {sending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
