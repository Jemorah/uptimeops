// ═══════════════════════════════════════════════════════════════
// CUSTOMER VAULT — Enhanced: stat cards, credential history,
// security FAQ accordion, activity log, end-to-end wired
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Shield, Lock, Upload, List, Loader2, KeyRound,
  Clock, Fingerprint, CheckCircle,
  ChevronDown, ChevronUp, FileCheck, Radio, Trash2
} from 'lucide-react';
import { CredentialForm } from '@/components/credentials/CredentialForm';
import { CredentialVault } from '@/components/credentials/CredentialVault';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type VaultTab = 'submit' | 'manage';

interface VaultStats {
  active: number;
  revoked: number;
  expired: number;
  totalSubmitted: number;
}

export function CustomerVault() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<VaultTab>('submit');
  const [stats, setStats] = useState<VaultStats>({ active: 0, revoked: 0, expired: 0, totalSubmitted: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    async function loadStats() {
      if (!user) { setLoadingStats(false); return; }
      const { data } = await supabase
        .from('credentials_vault')
        .select('revoked_at, expires_at')
        .eq('customer_id', user.id);

      if (data) {
        const now = Date.now();
        setStats({
          active: data.filter(d => !d.revoked_at && new Date(d.expires_at).getTime() > now).length,
          revoked: data.filter(d => d.revoked_at).length,
          expired: data.filter(d => !d.revoked_at && new Date(d.expires_at).getTime() <= now).length,
          totalSubmitted: data.length,
        });
      }
      setLoadingStats(false);
    }
    loadStats();

    const ch = supabase.channel('vault-stats').on('postgres_changes', { event: '*', schema: 'public', table: 'credentials_vault' }, () => loadStats()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const faqs = [
    { q: 'Can UptimeOps read my credentials?', a: 'No. Your credentials are encrypted with AES-256-GCM in your browser using an ephemeral key. The key never leaves your browser. Our servers only store the ciphertext — we cannot decrypt it.' },
    { q: 'How does the engineer access my site?', a: 'When a repair session starts, your browser securely relays the decryption key directly to the isolated VM via an encrypted WebSocket channel. The VM decrypts and uses the credentials. When you close the tab or revoke access, the key is destroyed.' },
    { q: 'What happens when I revoke access?', a: 'Revocation is instant. The encrypted payload is marked as revoked in our database, all active engineer sessions are terminated, and the associated VM is destroyed. An audit log entry is created for compliance.' },
    { q: 'How long do credentials remain active?', a: 'Credentials auto-expire after 72 hours. You can revoke them earlier at any time. Once expired or revoked, the encrypted data is permanently inaccessible.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight">CREDENTIAL VAULT</h2>
        <p className="text-sm text-white/40 mt-1">Zero-knowledge credential submission and management</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loadingStats ? (
          <div className="col-span-full flex items-center justify-center py-4"><Loader2 className="w-4 h-4 text-lime animate-spin" /></div>
        ) : (
          <>
            {[
              { label: 'Active', value: stats.active, icon: Radio, accent: stats.active > 0 },
              { label: 'Revoked', value: stats.revoked, icon: Trash2 },
              { label: 'Expired', value: stats.expired, icon: Clock },
              { label: 'Total Submitted', value: stats.totalSubmitted, icon: FileCheck },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-4 bg-white/[0.02] ${s.accent ? 'border-lime/20' : 'border-white/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-4 h-4 ${s.accent ? 'text-lime' : 'text-white/30'}`} />
                  <span className="text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
                </div>
                <div className="text-2xl font-black">{s.value}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Security Header */}
      <div className="border border-lime/10 rounded-xl p-4 flex items-center gap-4 bg-lime/[0.015]">
        <div className="w-10 h-10 bg-lime/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-lime" />
        </div>
        <div>
          <div className="text-sm font-bold text-lime uppercase tracking-wider">Client-Side Encryption Active</div>
          <p className="text-xs text-white/50 mt-0.5">Your credentials are encrypted with AES-256-GCM in your browser before transmission. UptimeOps servers never see your plaintext credentials or the decryption key.</p>
        </div>
        <Lock className="w-5 h-5 text-lime/30 flex-shrink-0" />
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-5">
        {[
          { icon: Fingerprint, label: 'Fingerprint Verified' },
          { icon: Shield, label: 'AES-256-GCM' },
          { icon: Lock, label: 'Client-Side Encryption' },
          { icon: CheckCircle, label: 'Zero-Knowledge' },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-white/30">
            <b.icon className="w-3 h-3 text-lime" />
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'submit' as VaultTab, label: 'Submit New', icon: Upload },
          { key: 'manage' as VaultTab, label: 'Manage Active', icon: List },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === t.key ? 'text-lime border-lime' : 'text-white/40 hover:text-white/60 border-transparent'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'submit' && <CredentialForm onSubmitted={() => setActiveTab('manage')} />}
      {activeTab === 'manage' && <CredentialVault />}

      {/* Security FAQ Accordion */}
      <div className="border border-white/10 rounded-xl bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
            <KeyRound className="w-4 h-4 text-lime" />How It Works
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {faqs.map((item, i) => (
            <div key={i} className="">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-medium text-white/70">{item.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-white/40 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
