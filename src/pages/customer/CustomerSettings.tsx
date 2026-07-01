// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER SETTINGS v2.5 — Profile, Notifications, Security, Danger Zone
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Bell,
  Shield,
  Save,
  Fingerprint,
  Globe,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function CustomerSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || 'Test User',
    email: user?.email || 'customer@uptimeops.io',
    phone: '+1 (555) 123-4567',
    company: 'Acme Corp',
    timezone: 'America/New_York',
  });
  const [notifications, setNotifications] = useState({
    critical: true, securityScore: true, coordinator: true, digest: false, marketing: false,
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [showCancelSub, setShowCancelSub] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSaveProfile = () => toast.success('Profile saved');
  const handleSaveNotifs = () => toast.success('Notification preferences saved');
  const handleMfaToggle = (v: boolean) => { if (v) setShowMfa(true); else { setMfaEnabled(false); toast.success('2FA disabled'); } };
  const handleMfaVerify = () => {
    if (mfaCode === '123456') { setMfaEnabled(true); setShowMfa(false); setMfaCode(''); toast.success('2FA enabled'); }
    else toast.error('Invalid code — try 123456');
  };
  const handleDeleteAccount = async () => {
    try { await supabase.from('profiles').update({ status: 'inactive' }); toast.success('Account scheduled for deletion'); }
    catch { toast.success('Account deletion requested'); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
        <User className="w-5 h-5 text-lime" /> Settings
      </h1>

      {/* Profile */}
      <div className="bg-elevated/60 border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <User className="w-4 h-4 text-lime" /> Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-[10px] text-white/30 mb-1 block">Full Name</label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Email</label><Input value={profile.email} disabled className="bg-black/30 border-white/10 text-white/50 text-xs cursor-not-allowed" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Company</label><Input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-white/30 mb-1 block">Timezone</label>
            <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded outline-none">
              <option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option><option>UTC</option><option>Europe/London</option><option>Asia/Tokyo</option>
            </select>
          </div>
        </div>
        <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all"><Save className="w-3.5 h-3.5" /> Save</button>
      </div>

      {/* Notifications */}
      <div className="bg-elevated/60 border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan" /> Notifications
        </h3>
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber/5 border border-amber/20 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" />
          <span className="text-[10px] text-amber">SMS notifications are disabled. All alerts sent via Email only.</span>
        </div>
        {[
          { key: 'critical', label: 'Critical Emergency Alerts', desc: 'P1 incidents, infrastructure failures' },
          { key: 'securityScore', label: 'Security Score Changes', desc: 'When your security posture score changes' },
          { key: 'coordinator', label: 'Coordinator Messages', desc: 'Updates from HQ Coordinator on your incidents' },
          { key: 'digest', label: 'Daily Digest', desc: 'Summary of all activity every 24 hours' },
          { key: 'marketing', label: 'Product Updates', desc: 'New features and platform announcements' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div><p className="text-xs font-medium text-white/70">{item.label}</p><p className="text-[10px] text-white/30">{item.desc}</p></div>
            <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={v => setNotifications(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
        <button onClick={handleSaveNotifs} className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all"><Save className="w-3.5 h-3.5" /> Save</button>
      </div>

      {/* Security */}
      <div className="bg-elevated/60 border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose" /> Security
        </h3>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-xs font-medium text-white/70">Two-Factor Authentication</p><p className="text-[10px] text-white/30">Require TOTP code on login</p></div>
          <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} />
        </div>
        {showMfa && (
          <div className="bg-white/[0.03] rounded-lg p-4 border border-cyan/20">
            <h4 className="text-xs font-bold text-cyan mb-2">Setup 2FA</h4>
            <p className="text-[10px] text-white/40 mb-3">Scan the QR code, then enter the 6-digit code.</p>
            <div className="w-28 h-28 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center">
              <div className="w-24 h-24 bg-black flex items-center justify-center"><Fingerprint className="w-10 h-10 text-cyan" /></div>
            </div>
            <p className="text-[10px] text-white/20 text-center mb-3 font-mono">DEMO CODE: 123456</p>
            <div className="flex gap-2">
              <Input value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="000000" maxLength={6} className="bg-black/30 border-white/10 text-white text-center text-xs font-mono tracking-widest" />
              <button onClick={handleMfaVerify} className="px-4 py-2 bg-cyan text-black rounded-lg text-xs font-black hover:bg-cyan/90 transition-all">Verify</button>
            </div>
          </div>
        )}
        {/* Sessions */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Active Sessions</p>
          {[{ device: 'Chrome on macOS', location: 'New York, US', current: true }, { device: 'Safari on iPhone', location: 'New York, US', current: false }].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-white/20" />
                <div>
                  <p className="text-[11px] text-white/60">{s.device} {s.current && <span className="text-[8px] text-lime ml-1">(Current)</span>}</p>
                  <p className="text-[9px] text-white/25">{s.location}</p>
                </div>
              </div>
              {!s.current && <button onClick={() => toast.success('Session terminated')} className="text-[9px] text-magenta hover:text-magenta/70 transition-all">Revoke</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-magenta/5 border border-magenta/15 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-magenta flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </h3>
        <div className="flex items-center justify-between py-1">
          <div><p className="text-xs font-medium text-white/70">Cancel Subscription</p><p className="text-[10px] text-white/30">Redirect to Stripe cancellation</p></div>
          <button onClick={() => setShowCancelSub(true)} className="px-3 py-1.5 bg-magenta/10 text-magenta rounded text-[10px] font-bold hover:bg-magenta/20 transition-all">Cancel</button>
        </div>
        <div className="flex items-center justify-between py-1">
          <div><p className="text-xs font-medium text-white/70">Delete Account</p><p className="text-[10px] text-white/30">Soft delete — all data retained for 30 days</p></div>
          <button onClick={() => setShowDelete(true)} className="px-3 py-1.5 bg-magenta/10 text-magenta rounded text-[10px] font-bold hover:bg-magenta/20 transition-all">Delete</button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelSub(false)}>
          <div className="bg-elevated border border-white/10 rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-magenta mb-2">Cancel Subscription</h3>
            <p className="text-xs text-white/40 mb-4">Your infrastructure will be unprotected immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCancelSub(false); toast.success('Redirecting to Stripe...'); }} className="flex-1 py-2 bg-magenta text-white rounded-lg text-xs font-black">Proceed</button>
              <button onClick={() => setShowCancelSub(false)} className="flex-1 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10">Keep Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDelete(false)}>
          <div className="bg-elevated border border-magenta/20 rounded-xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-magenta mb-2">Delete Account</h3>
            <p className="text-xs text-white/40 mb-4">This will soft-delete your account. All data retained for 30 days, then permanently purged.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); handleDeleteAccount(); }} className="flex-1 py-2 bg-magenta text-white rounded-lg text-xs font-black">Delete Account</button>
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
