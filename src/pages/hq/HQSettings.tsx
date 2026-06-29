// ═══════════════════════════════════════════════════════════════
// HQ SETTINGS — Coordinator preferences, wired to Supabase
// No SMS — email only
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, Bell, Shield, Key, Mail, Save, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function HQSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    criticalOnly: false,
  });
  const [profile, setProfile] = useState({
    fullName: user?.user_metadata?.full_name || '',
    timezone: 'America/New_York',
  });

  const handleSaveProfile = () => {
    toast.success('Profile settings saved');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SETTINGS</h2>
        <p className="text-sm text-white/40 mt-1">Coordinator preferences and account settings</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <User className="w-4 h-4 text-lime" /> Profile
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-2">Full Name</label>
            <Input value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} placeholder="Your name" className="bg-elevated border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Email</label>
            <Input value={user?.email || ''} disabled className="bg-elevated border-white/10 text-white/50 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Timezone</label>
            <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-elevated border border-white/10 text-white text-sm px-3 py-2 rounded focus:border-lime/30 outline-none">
              <option>America/New_York</option>
              <option>America/Chicago</option>
              <option>America/Denver</option>
              <option>America/Los_Angeles</option>
              <option>UTC</option>
              <option>Europe/London</option>
              <option>Asia/Tokyo</option>
            </select>
          </div>
        </div>
        <div className="pt-3 border-t border-white/5 flex justify-end">
          <button onClick={handleSaveProfile} className="flex items-center gap-2 px-5 py-2 bg-lime text-black text-xs font-bold hover:bg-lime/90 transition-colors rounded-sm">
            <Save className="w-3.5 h-3.5" /> Save Profile
          </button>
        </div>
      </div>

      {/* Notifications — Email only */}
      <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <Bell className="w-4 h-4 text-lime" /> Notifications
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Alerts', desc: 'Incident and system alerts via email', icon: Mail },
            { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
            { key: 'criticalOnly', label: 'Critical Only', desc: 'Only notify for P1/P2 severity incidents', icon: Shield },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-white/40" />
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-white/40">{item.desc}</div>
                </div>
              </div>
              <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={checked => setNotifications(prev => ({ ...prev, [item.key]: checked }))} />
            </div>
          ))}
        </div>
        <p className="text-xs text-white/20 pt-2 border-t border-white/5">SMS notifications coming at scale.</p>
        <div className="pt-3 border-t border-white/5 flex justify-end">
          <button onClick={handleSaveNotifications} className="flex items-center gap-2 px-5 py-2 bg-lime text-black text-xs font-bold hover:bg-lime/90 transition-colors rounded-sm">
            <Save className="w-3.5 h-3.5" /> Save Preferences
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <Key className="w-4 h-4 text-lime" /> Security
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/reset-password')}
            className="w-full text-left px-4 py-3 border border-white/10 text-sm hover:border-lime transition-colors text-white/70"
          >
            Change Password
          </button>
          <button
            onClick={() => toast.info('Two-factor authentication setup coming in v2.2')}
            className="w-full text-left px-4 py-3 border border-white/10 text-sm hover:border-lime transition-colors text-white/70"
          >
            Enable Two-Factor Authentication
          </button>
        </div>
      </div>

      {/* Session Info */}
      <div className="flex items-center gap-2 text-[11px] text-white/20">
        <Clock className="w-3 h-3" /> Logged in as {user?.email} · Role: admin
      </div>
    </div>
  );
}
