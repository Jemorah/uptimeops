// ═══════════════════════════════════════════════════════════════
// CUSTOMER SETTINGS v2.5 — Profile, notifications, security
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Bell,
  Shield,
  Save,
  Fingerprint,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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
    critical: true,
    securityScore: true,
    coordinator: true,
    digest: false,
    marketing: false,
  });
  const [security, setSecurity] = useState({
    mfaEnabled: false,
    showMfaSetup: false,
    mfaCode: '',
  });

  const handleSaveProfile = () => toast.success('Profile saved');
  const handleSaveNotifications = () => toast.success('Notification preferences saved');
  const handleMfaToggle = (enabled: boolean) => {
    if (enabled) { setSecurity(p => ({ ...p, showMfaSetup: true })); }
    else { setSecurity(p => ({ ...p, mfaEnabled: false, showMfaSetup: false })); toast.success('2FA disabled'); }
  };
  const handleMfaVerify = () => {
    if (security.mfaCode === '123456') { setSecurity(p => ({ ...p, mfaEnabled: true, showMfaSetup: false, mfaCode: '' })); toast.success('2FA enabled'); }
    else { toast.error('Invalid code. Try 123456 for demo.'); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
        <User className="w-5 h-5 text-lime" /> Settings
      </h1>

      {/* Profile */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <User className="w-4 h-4 text-lime" /> Profile Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-[10px] text-white/30 mb-1 block">Full Name</label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Email</label><Input value={profile.email} disabled className="bg-black/30 border-white/10 text-white/50 text-xs cursor-not-allowed" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div><label className="text-[10px] text-white/30 mb-1 block">Company</label><Input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} className="bg-black/30 border-white/10 text-white text-xs" /></div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-white/30 mb-1 block">Timezone</label>
            <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded focus:border-lime/30 outline-none">
              <option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option><option>UTC</option><option>Europe/London</option><option>Europe/Paris</option><option>Asia/Tokyo</option>
            </select>
          </div>
        </div>
        <button onClick={handleSaveProfile} className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all">
          <Save className="w-3.5 h-3.5" /> Save Profile
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan" /> Notification Matrix
        </h3>
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber/5 border border-amber/20 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber" />
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
        <button onClick={handleSaveNotifications} className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all">
          <Save className="w-3.5 h-3.5" /> Save Preferences
        </button>
      </div>

      {/* Security / 2FA */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose" /> Security Access
        </h3>
        <div className="flex items-center justify-between py-2">
          <div><p className="text-xs font-medium text-white/70">Two-Factor Authentication (2FA)</p><p className="text-[10px] text-white/30">Require TOTP code on login</p></div>
          <Switch checked={security.mfaEnabled} onCheckedChange={handleMfaToggle} />
        </div>
        {security.showMfaSetup && (
          <div className="bg-white/[0.03] rounded-lg p-4 border border-cyan/20">
            <h4 className="text-xs font-bold text-cyan mb-2">Setup 2FA</h4>
            <p className="text-[10px] text-white/40 mb-3">Scan the QR code with your authenticator app, then enter the 6-digit code below.</p>
            <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center">
              <div className="w-28 h-28 bg-black flex items-center justify-center">
                <Fingerprint className="w-12 h-12 text-cyan" />
              </div>
            </div>
            <p className="text-[10px] text-white/20 text-center mb-3 font-mono">DEMO CODE: 123456</p>
            <div className="flex gap-2">
              <Input value={security.mfaCode} onChange={e => setSecurity(p => ({ ...p, mfaCode: e.target.value }))} placeholder="000000" maxLength={6} className="bg-black/30 border-white/10 text-white text-center text-xs font-mono tracking-widest" />
              <button onClick={handleMfaVerify} className="px-4 py-2 bg-cyan text-black rounded-lg text-xs font-black hover:bg-cyan/90 transition-all">Verify</button>
            </div>
          </div>
        )}
        {/* Active Sessions */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Active Sessions</p>
          {[
            { device: 'Chrome on macOS', location: 'New York, US', current: true },
            { device: 'Safari on iPhone', location: 'New York, US', current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-white/20" />
                <div>
                  <p className="text-[11px] text-white/60">{s.device} {s.current && <span className="text-[8px] text-lime ml-1">(Current)</span>}</p>
                  <p className="text-[9px] text-white/25">{s.location}</p>
                </div>
              </div>
              {!s.current && <button onClick={() => toast.success('Session terminated')} className="text-[9px] text-rose hover:text-rose/70 transition-all">Revoke</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
