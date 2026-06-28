// UptimeOps v2.1 — Add Engineer Modal
// Form for inviting new engineers with OpsGenie integration

import { useState } from 'react';
import { X, Send, Check } from 'lucide-react';

const SPECIALIZATIONS = ['Frontend', 'Backend', 'DevOps', 'Security', 'Database', 'Mobile', 'Cloud', 'SRE'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddEngineerModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: [] as string[],
    oncallDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    oncallStartDate: '',
    autoP1Escalation: true,
    sendOpsgenieInstructions: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!form.fullName || !form.email) return;
    setSubmitting(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/engineer-onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await import('@/lib/supabase/client')).supabase.auth.getSession().then(r => r.data.session?.access_token)}`,
        },
        body: JSON.stringify({
          action: 'create_engineer',
          email: form.email,
          password: crypto.randomUUID().slice(0, 12) + 'A1!',
          full_name: form.fullName,
          specialization: form.specialization,
          phone: form.phone,
        }),
      });

      if (resp.ok) {
        setSent(true);
        onSuccess?.();
      }
    } catch {
      // Silent fail
    }
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[#0e0e14] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-[#a3e635]/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-[#a3e635]" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Invitation Sent</h3>
          <p className="text-xs text-white/40">{form.fullName} will receive an email with their onboarding link.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-[#a3e635] text-black rounded-lg text-xs font-bold">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0e0e14] border border-white/10 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Add Engineer</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50" />
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50" />
          </div>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50" />

          {/* Specialization */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">Specialization</p>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALIZATIONS.map(spec => (
                <button
                  key={spec}
                  onClick={() => setForm({ ...form, specialization: form.specialization.includes(spec) ? form.specialization.filter(s => s !== spec) : [...form.specialization, spec] })}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    form.specialization.includes(spec) ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* On-call schedule */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">On-Call Rotation</p>
            <div className="flex gap-1 mb-2">
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setForm({ ...form, oncallDays: form.oncallDays.includes(d) ? form.oncallDays.filter(x => x !== d) : [...form.oncallDays, d] })}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${
                    form.oncallDays.includes(d) ? 'bg-[#22d3ee]/10 text-[#22d3ee]' : 'bg-white/5 text-white/30'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input type="date" value={form.oncallStartDate} onChange={e => setForm({ ...form, oncallStartDate: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.autoP1Escalation} onChange={e => setForm({ ...form, autoP1Escalation: e.target.checked })} className="rounded border-white/20 bg-white/5" />
              <span className="text-xs text-white/60">Auto-add to P1 escalation chain</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.sendOpsgenieInstructions} onChange={e => setForm({ ...form, sendOpsgenieInstructions: e.target.checked })} className="rounded border-white/20 bg-white/5" />
              <span className="text-xs text-white/60">Send OpsGenie app install instructions</span>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting || !form.fullName || !form.email}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#a3e635] text-black rounded-lg text-xs font-bold hover:bg-[#a3e635]/90 disabled:opacity-30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
