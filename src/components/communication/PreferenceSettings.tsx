// ═══════════════════════════════════════════════════════════════
// PREFERENCE SETTINGS — SMS/Email toggles, quiet hours, categories
// ═══════════════════════════════════════════════════════════════

import { Mail, Smartphone, Bell, LayoutDashboard, Moon, ToggleLeft, ToggleRight } from 'lucide-react';
import type { CommPreferences } from './types';

interface PreferenceSettingsProps {
  preferences: CommPreferences;
  onUpdate: (updates: Partial<CommPreferences>) => void;
}

export function PreferenceSettings({ preferences, onUpdate }: PreferenceSettingsProps) {
  const Toggle = ({ label, icon: Icon, enabled, onChange, desc }: { label: string; icon: typeof Mail; enabled: boolean; onChange: () => void; desc: string }) => (
    <div className="flex items-center justify-between p-3 bg-black/20 border border-white/5">
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${enabled ? 'text-lime' : 'text-white/20'}`} />
        <div>
          <div className="text-xs font-bold text-white/70">{label}</div>
          <div className="text-[10px] text-white/30">{desc}</div>
        </div>
      </div>
      <button onClick={onChange} className="text-white/20 hover:text-white/40 transition-colors">
        {enabled ? <ToggleRight className="w-6 h-6 text-lime" /> : <ToggleLeft className="w-6 h-6" />}
      </button>
    </div>
  );

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan" />
          Communication Preferences
        </h3>
      </div>

      {/* Channel Toggles */}
      <div className="p-4 border-b border-white/5 space-y-2">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Channels</div>
        <Toggle label="Email" icon={Mail} enabled={preferences.emailEnabled} onChange={() => onUpdate({ emailEnabled: !preferences.emailEnabled })} desc="Receive email notifications" />
        <Toggle label="SMS" icon={Smartphone} enabled={preferences.smsEnabled} onChange={() => onUpdate({ smsEnabled: !preferences.smsEnabled })} desc="Receive SMS text alerts" />
        <Toggle label="Push Notifications" icon={Bell} enabled={preferences.pushEnabled} onChange={() => onUpdate({ pushEnabled: !preferences.pushEnabled })} desc="Browser push notifications" />
        <Toggle label="Dashboard" icon={LayoutDashboard} enabled={preferences.dashboardEnabled} onChange={() => onUpdate({ dashboardEnabled: !preferences.dashboardEnabled })} desc="In-app notification badges" />
      </div>

      {/* Contact Info */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Contact Details</div>
        <div>
          <label className="text-[10px] text-white/30 mb-1 block">Email Address</label>
          <input value={preferences.emailAddress} onChange={e => onUpdate({ emailAddress: e.target.value })} className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30" />
        </div>
        <div>
          <label className="text-[10px] text-white/30 mb-1 block">Phone Number</label>
          <input value={preferences.phoneNumber || ''} onChange={e => onUpdate({ phoneNumber: e.target.value })} placeholder="+1-555-0000" className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30" />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-3 h-3 text-white/30" />
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Quiet Hours</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Start</label>
            <select value={preferences.quietHoursStart || ''} onChange={e => onUpdate({ quietHoursStart: e.target.value ? parseInt(e.target.value) : null })} className="w-full bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-2 outline-none">
              <option value="">None</option>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">End</label>
            <select value={preferences.quietHoursEnd || ''} onChange={e => onUpdate({ quietHoursEnd: e.target.value ? parseInt(e.target.value) : null })} className="w-full bg-black/30 border border-white/10 text-xs text-white/60 px-2 py-2 outline-none">
              <option value="">None</option>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>
        {preferences.quietHoursStart !== null && preferences.quietHoursEnd !== null && (
          <p className="text-[10px] text-white/20 mt-2">
            Only critical alerts during {String(preferences.quietHoursStart).padStart(2, '0')}:00 — {String(preferences.quietHoursEnd).padStart(2, '0')}:00
          </p>
        )}
      </div>

      {/* Alert Categories */}
      <div className="p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Alert Categories</div>
        <div className="space-y-2">
          {Object.entries(preferences.alertCategories).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-white/50 capitalize">{key.replace('_', ' ')}</span>
              <button onClick={() => onUpdate({ alertCategories: { ...preferences.alertCategories, [key]: !enabled } })} className="text-white/20 hover:text-white/40 transition-colors">
                {enabled ? <ToggleRight className="w-4 h-4 text-lime" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
