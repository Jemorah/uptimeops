import { useState } from 'react';
import { User, Bell, Shield, Key, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function CustomerSettings() {
  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
    criticalOnly: false,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">SETTINGS</h2>
        <p className="text-sm text-white/40 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <User className="w-4 h-4 text-lime" />
          Profile
        </h3>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-2">Full Name</label>
            <Input defaultValue="" placeholder="Your name" className="bg-elevated border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Email</label>
            <Input defaultValue="" placeholder="your@email.com" className="bg-elevated border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Company</label>
            <Input defaultValue="" placeholder="Company name" className="bg-elevated border-white/10 text-white" />
          </div>
        </div>
      </div>

      {/* Notifications — Email only, no SMS */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <Bell className="w-4 h-4 text-lime" />
          Notifications
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Alerts', desc: 'Receive incident notifications via email', icon: Mail },
            { key: 'slack', label: 'Slack Integration', desc: 'Post updates to your Slack channel', icon: Bell },
            { key: 'criticalOnly', label: 'Critical Only', desc: 'Only notify for critical severity incidents', icon: Shield },
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
        <p className="text-xs text-white/20 pt-2 border-t border-white/5">
          SMS notifications coming soon. Contact support for urgent alerts.
        </p>
      </div>

      {/* Security */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
          <Key className="w-4 h-4 text-lime" />
          Security
        </h3>
        <div className="space-y-3">
          <button className="w-full text-left px-4 py-3 border border-white/10 text-sm hover:border-lime transition-colors text-white/70">
            Change Password
          </button>
          <button className="w-full text-left px-4 py-3 border border-white/10 text-sm hover:border-lime transition-colors text-white/70">
            Enable Two-Factor Authentication
          </button>
        </div>
      </div>

      <button onClick={handleSave} className="px-6 py-2.5 bg-lime text-black text-sm font-bold hover:bg-lime/90 transition-colors rounded-sm">
        Save Changes
      </button>
    </div>
  );
}
