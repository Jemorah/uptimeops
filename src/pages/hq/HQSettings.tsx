import { useState } from 'react';
import { Bell, Lock, Server } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function HQSettings() {
  const [settings, setSettings] = useState({
    autoEscalation: true,
    autoDeployThreshold: 90,
    requireCoordinatorApproval: true,
    sessionRecording: true,
    keystrokeLogging: true,
    screenCapture: true,
    emailAlerts: true,
    slackIntegration: true,
    smsCriticalOnly: true,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">HQ SETTINGS</h2>
        <p className="text-sm text-white/40 mt-1">Coordinator control center configuration</p>
      </div>

      {/* AI Pipeline */}
      <div className="bg-surface border border-white/5 p-6 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-lime" />
          AI Pipeline Configuration
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Auto-Escalation</div>
              <div className="text-xs text-white/40">Automatically escalate when AI confidence drops below threshold</div>
            </div>
            <Switch
              checked={settings.autoEscalation}
              onCheckedChange={(checked) => setSettings({ ...settings, autoEscalation: checked })}
            />
          </div>

          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium">Auto-Deploy Confidence Threshold</div>
                <div className="text-xs text-white/40">AI confidence % required for automatic deployment without coordinator approval</div>
              </div>
              <span className="text-lg font-black font-mono text-lime">{settings.autoDeployThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.autoDeployThreshold}
              onChange={(e) => setSettings({ ...settings, autoDeployThreshold: parseInt(e.target.value) })}
              className="w-full accent-lime"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Require Coordinator Approval</div>
              <div className="text-xs text-white/40">All engineer deployments require coordinator sign-off</div>
            </div>
            <Switch
              checked={settings.requireCoordinatorApproval}
              onCheckedChange={(checked) => setSettings({ ...settings, requireCoordinatorApproval: checked })}
            />
          </div>
        </div>
      </div>

      {/* Session Monitoring */}
      <div className="bg-surface border border-white/5 p-6 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-lime" />
          Session Monitoring & Compliance
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Session Recording</div>
              <div className="text-xs text-white/40">Record all engineer remote access sessions</div>
            </div>
            <Switch
              checked={settings.sessionRecording}
              onCheckedChange={(checked) => setSettings({ ...settings, sessionRecording: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Keystroke Logging</div>
              <div className="text-xs text-white/40">Log all keystrokes for audit trail compliance</div>
            </div>
            <Switch
              checked={settings.keystrokeLogging}
              onCheckedChange={(checked) => setSettings({ ...settings, keystrokeLogging: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Screen Capture</div>
              <div className="text-xs text-white/40">Capture screenshots every 30 seconds during sessions</div>
            </div>
            <Switch
              checked={settings.screenCapture}
              onCheckedChange={(checked) => setSettings({ ...settings, screenCapture: checked })}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface border border-white/5 p-6 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4 text-lime" />
          Notification Settings
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Email Alerts</div>
              <div className="text-xs text-white/40">Send email notifications for all escalations</div>
            </div>
            <Switch
              checked={settings.emailAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, emailAlerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Slack Integration</div>
              <div className="text-xs text-white/40">Post incident updates to Slack channel</div>
            </div>
            <Switch
              checked={settings.slackIntegration}
              onCheckedChange={(checked) => setSettings({ ...settings, slackIntegration: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">SMS Critical Only</div>
              <div className="text-xs text-white/40">Only send SMS for critical severity incidents</div>
            </div>
            <Switch
              checked={settings.smsCriticalOnly}
              onCheckedChange={(checked) => setSettings({ ...settings, smsCriticalOnly: checked })}
            />
          </div>
        </div>
      </div>

      <button onClick={() => toast.success('Settings saved successfully')} className="btn-lime text-sm rounded-sm">
        Save All Changes
      </button>
    </div>
  );
}
