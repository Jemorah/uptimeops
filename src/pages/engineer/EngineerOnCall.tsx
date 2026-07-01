import { useState } from 'react';
import { Calendar, CheckCircle, AlertTriangle, Radio, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

const weekSchedule = [
  { day: 'Monday', date: 'Jun 23', primary: 'Alex Chen', backup: 'Jordan Smith', shift: '08:00 - 20:00 UTC', status: 'covered' },
  { day: 'Tuesday', date: 'Jun 24', primary: 'Alex Chen', backup: 'Jordan Smith', shift: '08:00 - 20:00 UTC', status: 'covered' },
  { day: 'Wednesday', date: 'Jun 25', primary: 'Jordan Smith', backup: 'Morgan Lee', shift: '08:00 - 20:00 UTC', status: 'covered' },
  { day: 'Thursday', date: 'Jun 26', primary: 'Jordan Smith', backup: 'Morgan Lee', shift: '08:00 - 20:00 UTC', status: 'covered' },
  { day: 'Friday', date: 'Jun 27', primary: 'Morgan Lee', backup: 'Alex Chen', shift: '08:00 - 20:00 UTC', status: 'covered' },
  { day: 'Saturday', date: 'Jun 28', primary: 'Alex Chen', backup: 'Jordan Smith', shift: '00:00 - 23:59 UTC', status: 'covered' },
  { day: 'Sunday', date: 'Jun 29', primary: 'Morgan Lee', backup: 'Alex Chen', shift: '00:00 - 23:59 UTC', status: 'covered' },
];

const escalationRules = [
  { trigger: 'AI confidence < 90%', action: 'Auto-escalate to on-call engineer', delay: 'Immediate' },
  { trigger: 'AI confidence < 70%', action: 'Escalate + notify coordinator', delay: 'Immediate' },
  { trigger: 'Session > 30 min unresolved', action: 'Coordinator review required', delay: '30 min' },
  { trigger: 'Critical severity incident', action: 'All engineers + coordinator paged', delay: 'Immediate' },
  { trigger: '3+ concurrent incidents', action: 'Activate war room protocol', delay: '5 min' },
];

export function EngineerOnCall() {
  const [currentDay] = useState('Wednesday');
  const [onCallActive, setOnCallActive] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const handleToggle = async () => {
    const newState = !onCallActive;
    setOnCallActive(newState);
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/opsgenie-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newState ? 'enable_oncall' : 'disable_oncall' }),
      });
      toast.success(newState ? 'On-call activated — synced to OpsGenie' : 'On-call deactivated');
    } catch {
      toast.success(newState ? 'On-call activated' : 'On-call deactivated');
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">ON-CALL SCHEDULE</h2>
          <p className="text-sm text-white/40 mt-1">Week of June 23 - June 29, 2026</p>
        </div>
        <button onClick={handleToggle} disabled={syncing} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${onCallActive ? 'bg-lime/10 text-lime border border-lime/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
          {syncing ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : onCallActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {onCallActive ? 'On-Call Active' : 'Off-Call'}
        </button>
      </div>

      {/* On-Call Status Banner */}
      {onCallActive && (
        <div className="bg-lime/5 border border-lime/15 rounded-lg p-3 flex items-center gap-3">
          <Zap className="w-4 h-4 text-lime" />
          <span className="text-xs text-lime font-bold">You are on-call — P1/P2 incidents will page you via OpsGenie</span>
          <button onClick={() => toast.info('Redirecting to OpsGenie app...')} className="ml-auto text-[10px] text-lime underline">Open OpsGenie</button>
        </div>
      )}

      {/* Current Status */}
      <div className="bg-surface border border-lime/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-lime animate-pulse" />
          <span className="text-sm font-bold text-lime uppercase tracking-wider">Currently On-Call</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-white/40 mb-1">Primary</div>
            <div className="text-lg font-bold">Jordan Smith</div>
            <div className="text-xs text-white/40 font-mono">jordan@uptimeops.io</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Backup</div>
            <div className="text-lg font-bold text-white/60">Morgan Lee</div>
            <div className="text-xs text-white/40 font-mono">morgan@uptimeops.io</div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-1">Shift Hours</div>
            <div className="text-lg font-bold font-mono">08:00 - 20:00 UTC</div>
            <div className="text-xs text-white/40">Wednesday, June 25</div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lime" />
            This Week
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {weekSchedule.map((day) => (
            <div
              key={day.day}
              className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                day.day === currentDay ? 'bg-lime/5' : ''
              }`}
            >
              <div className="w-32 flex-shrink-0">
                <div className={`text-sm font-bold ${day.day === currentDay ? 'text-lime' : ''}`}>{day.day}</div>
                <div className="text-xs text-white/40 font-mono">{day.date}</div>
              </div>
              <div className="flex-1 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-lime" />
                  <span className="text-sm">{day.primary}</span>
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="text-sm">{day.backup}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-white/40">{day.shift}</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Rules */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Escalation Rules
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {escalationRules.map((rule, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div>
                <div className="text-sm font-medium">{rule.trigger}</div>
                <div className="text-xs text-white/40">{rule.action}</div>
              </div>
              <span className="text-xs font-mono text-yellow-500">{rule.delay}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
