// ═══════════════════════════════════════════════════════════════
// FOLLOW-UP SYSTEM — Stage 11: Email sequences and retention
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Mail, Clock, CheckCircle, Send, Star, TrendingUp } from 'lucide-react';
import type { FollowUpEmail, ServiceSelection } from './types';

interface FollowUpSystemProps {
  emails: FollowUpEmail[];
  serviceType: ServiceSelection['type'] | null;
}

const SUBSCRIPTION_EMAILS = [
  { id: 'monthly_report', label: 'Monthly Health Report', scheduled: '1st of month', status: 'scheduled' as const, icon: TrendingUp },
  { id: 'billing_reminder', label: 'Billing Reminder', scheduled: '7 days before renewal', status: 'scheduled' as const, icon: Clock },
  { id: 'nps_survey', label: 'NPS Survey', scheduled: 'After incident closure', status: 'scheduled' as const, icon: Star },
];

export function FollowUpSystem({ emails, serviceType }: FollowUpSystemProps) {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan" />
          Follow-up Sequence
        </h3>
      </div>

      {/* One-Time Fix Sequence */}
      {serviceType === 'one_time' && (
        <div className="p-4 border-b border-white/5">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">One-Time Fix — 3-email sequence</div>
          {emails.length === 0 ? (
            <p className="text-xs text-white/20 italic">Emails will be scheduled after incident closure</p>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div key={email.id} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5">
                  <div className={`w-8 h-8 flex items-center justify-center border ${
                    email.status === 'sent' ? 'bg-lime/10 border-lime/30' :
                    email.status === 'opened' ? 'bg-cyan/10 border-cyan/30' :
                    'bg-white/5 border-white/10'
                  }`}>
                    {email.status === 'sent' ? <Send className="w-3.5 h-3.5 text-lime" /> :
                     email.status === 'opened' ? <CheckCircle className="w-3.5 h-3.5 text-cyan" /> :
                     <Clock className="w-3.5 h-3.5 text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/60">{email.subject}</div>
                    <div className="text-[10px] text-white/20 font-mono mt-0.5">
                      {email.templateId} — {new Date(email.scheduledAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                    email.status === 'sent' ? 'bg-lime/10 text-lime border-lime/20' :
                    email.status === 'opened' ? 'bg-cyan/10 text-cyan border-cyan/20' :
                    'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    {email.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscription Sequence */}
      {serviceType === 'subscription' && (
        <div className="p-4 border-b border-white/5">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Subscription — Ongoing</div>
          <div className="space-y-2">
            {SUBSCRIPTION_EMAILS.map((email) => (
              <div key={email.id} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5">
                <div className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10">
                  <email.icon className="w-3.5 h-3.5 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60">{email.label}</div>
                  <div className="text-[10px] text-white/20">{email.scheduled}</div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-white/5 text-white/30 border border-white/10">
                  {email.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPS Survey */}
      <div className="p-4">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">NPS Survey</div>
        <div className="bg-black/20 border border-white/5 p-3">
          <p className="text-xs text-white/40 mb-3">How likely are you to recommend UptimeOps?</p>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => setNpsScore(score)}
                className={`flex-1 py-1.5 text-xs font-bold font-mono transition-colors ${
                  score === npsScore
                    ? score <= 6 ? 'bg-red/20 text-red-400' : score <= 8 ? 'bg-yellow/20 text-yellow-400' : 'bg-lime/20 text-lime'
                    : score <= 6 ? 'hover:bg-red/20 text-white/20 hover:text-red-400' :
                    score <= 8 ? 'hover:bg-yellow/20 text-white/20 hover:text-yellow-400' :
                    'hover:bg-lime/20 text-white/20 hover:text-lime'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/15 mt-1">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      </div>
    </div>
  );
}
