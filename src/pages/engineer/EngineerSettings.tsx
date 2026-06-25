import { useState } from 'react';
import { User, Bell, Shield, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function EngineerSettings() {
  const [notifications, setNotifications] = useState({
    push: true,
    sms: true,
    email: true,
    escalationOnly: false,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SETTINGS</h2>
        <p className="text-sm text-white/40 mt-1">Engineer portal preferences</p>
      </div>

      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-lime" />
          Profile
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-2">Full Name</label>
            <Input defaultValue="Alex Chen" className="bg-elevated border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Email</label>
            <Input defaultValue="alex@uptimeops.io" className="bg-elevated border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Phone (for on-call SMS)</label>
            <Input defaultValue="+1-555-0123" className="bg-elevated border-white/10 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-lime" />
          On-Call Notifications
        </h3>
        <div className="space-y-4">
          {[
            { key: 'push', label: 'Push Notifications', desc: 'Browser push for new escalations', icon: Bell },
            { key: 'sms', label: 'SMS Alerts', desc: 'Text messages for critical incidents', icon: Smartphone },
            { key: 'email', label: 'Email Digest', desc: 'Daily summary of all actions', icon: Bell },
            { key: 'escalationOnly', label: 'Critical Only', desc: 'Only notify for critical severity', icon: Shield },
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
                checked={notifications[item.key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-lime" />
          Session Preferences
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Auto-record Sessions</div>
              <div className="text-xs text-white/40">Record all remote access sessions</div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Keystroke Logging</div>
              <div className="text-xs text-white/40">Log all keystrokes for audit compliance</div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Screen Capture</div>
              <div className="text-xs text-white/40">Capture screenshots every 30s</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <button onClick={() => toast.success('Settings saved')} className="btn-lime text-sm rounded-sm">
        Save Changes
      </button>
    </div>
  );
}
