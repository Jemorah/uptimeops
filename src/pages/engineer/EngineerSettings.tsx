// ═══════════════════════════════════════════════════════════════
// ENGINEER SETTINGS — v2.1
// Real Supabase data. No mock defaults. Real save. No fake toast.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { User, Bell, Shield, Smartphone, Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface EngineerProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  email_digest_enabled: boolean;
  escalation_only: boolean;
  auto_record: boolean;
  keystroke_logging: boolean;
  screen_capture: boolean;
}

export function EngineerSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EngineerProfile>({
    id: '', full_name: '', email: '', phone: '',
    push_enabled: true, sms_enabled: true, email_digest_enabled: true, escalation_only: false,
    auto_record: true, keystroke_logging: true, screen_capture: true,
  });

  // Load real engineer profile from Supabase
  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }

      setProfile(prev => ({ ...prev, email: user.email || '' }));

      const { data } = await supabase
        .from('engineers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || '',
          email: user.email || '',
          phone: data.phone || '',
          push_enabled: data.push_enabled ?? true,
          sms_enabled: data.sms_enabled ?? true,
          email_digest_enabled: data.email_digest_enabled ?? true,
          escalation_only: data.escalation_only ?? false,
          auto_record: data.auto_record ?? true,
          keystroke_logging: data.keystroke_logging ?? true,
          screen_capture: data.screen_capture ?? true,
        });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // Real save — persist to Supabase
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('engineers')
      .upsert({
        user_id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        push_enabled: profile.push_enabled,
        sms_enabled: profile.sms_enabled,
        email_digest_enabled: profile.email_digest_enabled,
        escalation_only: profile.escalation_only,
        auto_record: profile.auto_record,
        keystroke_logging: profile.keystroke_logging,
        screen_capture: profile.screen_capture,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Settings saved');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-lime animate-spin" />
        <span className="ml-2 text-sm text-white/40">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SETTINGS</h2>
        <p className="text-sm text-white/40 mt-1">Engineer portal preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-lime" />
          Profile
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-2">Full Name</label>
            <Input
              value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Your full name"
              className="bg-elevated border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Email</label>
            <Input
              value={profile.email}
              disabled
              className="bg-elevated border-white/10 text-white/50 cursor-not-allowed"
            />
            <p className="text-[10px] text-white/20 mt-1">Contact support to change your email</p>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Phone (for on-call SMS)</label>
            <Input
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1-555-0000"
              className="bg-elevated border-white/10 text-white"
            />
          </div>
        </div>
      </div>

      {/* On-Call Notifications */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-lime" />
          On-Call Notifications
        </h3>
        <div className="space-y-4">
          {[
            { key: 'push_enabled', label: 'Push Notifications', desc: 'Browser push for new escalations', icon: Bell },
            { key: 'sms_enabled', label: 'SMS Alerts', desc: 'Text messages for critical incidents', icon: Smartphone },
            { key: 'email_digest_enabled', label: 'Email Digest', desc: 'Daily summary of all actions', icon: Bell },
            { key: 'escalation_only', label: 'Critical Only', desc: 'Only notify for critical severity', icon: Shield },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-white/40" />
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-white/40">{item.desc}</div>
                </div>
              </div>
              <Switch
                checked={profile[item.key as keyof EngineerProfile] as boolean}
                onCheckedChange={(checked) =>
                  setProfile((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Session Preferences */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-lime" />
          Session Preferences
        </h3>
        <div className="space-y-3">
          {[
            { key: 'auto_record', label: 'Auto-record Sessions', desc: 'Record all remote access sessions' },
            { key: 'keystroke_logging', label: 'Keystroke Logging', desc: 'Log all keystrokes for audit compliance' },
            { key: 'screen_capture', label: 'Screen Capture', desc: 'Capture screenshots every 30s' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-white/40">{item.desc}</div>
              </div>
              <Switch
                checked={profile[item.key as keyof EngineerProfile] as boolean}
                onCheckedChange={checked => setProfile(prev => ({ ...prev, [item.key]: checked }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-lime text-black text-sm font-bold hover:bg-lime/90 transition-colors rounded-sm disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
