// ═══════════════════════════════════════════════════════════════
// CUSTOMER VERIFICATION — Stage 9: Human-in-the-loop
// 5 min after deploy: Customer confirms fix
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  CheckCircle, XCircle, Clock, MessageSquare,
  ThumbsUp, ThumbsDown, AlertTriangle, Timer
} from 'lucide-react';
import type { CustomerVerification } from './types';

interface CustomerVerificationProps {
  verification: CustomerVerification | null;
  onRequestVerify: () => void;
  onResponse: (confirmed: boolean, feedback?: string) => void;
}

export function CustomerVerificationPanel({ verification, onRequestVerify, onResponse }: CustomerVerificationProps) {
  const [feedback, setFeedback] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [response, setResponse] = useState<'yes' | 'no' | null>(null);

  if (!verification) {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Customer Verification</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          After deployment, customer confirms the fix is working
        </p>
        <button
          onClick={onRequestVerify}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green/10 border border-green/30 text-green-400 text-sm font-bold hover:bg-green/20 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          REQUEST VERIFICATION
        </button>
      </div>
    );
  }

  if (verification.status === 'confirmed_fixed') {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-lime/10 border border-lime/30 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-lime" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-lime uppercase tracking-wider">Customer Confirmed Fix</h3>
            <p className="text-xs text-white/40">
              Responded at {new Date(verification.respondedAt!).toLocaleTimeString()}
            </p>
          </div>
        </div>
        {verification.feedback && (
          <div className="bg-lime/[0.02] border border-lime/10 p-3">
            <p className="text-xs text-white/50 italic">&ldquo;{verification.feedback}&rdquo;</p>
          </div>
        )}
      </div>
    );
  }

  if (verification.status === 'still_broken') {
    return (
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red/10 border border-red/20 flex items-center justify-center">
            <ThumbsDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Customer Reports Still Broken</h3>
            <p className="text-xs text-white/40">
              Responded at {new Date(verification.respondedAt!).toLocaleTimeString()}
            </p>
          </div>
        </div>
        {verification.feedback && (
          <div className="bg-red/[0.02] border border-red/10 p-3 mb-3">
            <p className="text-xs text-white/50 italic">&ldquo;{verification.feedback}&rdquo;</p>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Incident will be reopened and returned to Triage (Agent 1)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            Customer Verification
          </h3>
          {verification.status === 'requested' && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <Timer className="w-3 h-3" />
              Auto-close: {new Date(verification.autoCloseAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {verification.status === 'pending' && (
          <div className="text-center py-4">
            <Clock className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/40">Verification request will be sent 5 min after deployment</p>
          </div>
        )}

        {verification.status === 'requested' && !showForm && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-cyan/[0.02] border border-cyan/10">
              <Clock className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/60">Verification requested at {new Date(verification.requestedAt).toLocaleTimeString()}</p>
                <p className="text-xs text-white/30 mt-1">
                  Customer will receive: &ldquo;Please confirm your site is working&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setResponse('yes'); setShowForm(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-sm font-bold hover:bg-lime/20 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                YES, FIXED
              </button>
              <button
                onClick={() => { setResponse('no'); setShowForm(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red/10 border border-red/20 text-red-400 text-sm font-bold hover:bg-red/20 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                NO, STILL BROKEN
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="space-y-3">
            <p className="text-xs text-white/40">
              {response === 'yes' ? 'Great! Any feedback for the team?' : 'Sorry to hear that. Please describe what you\'re seeing:'}
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={response === 'yes' ? 'Optional feedback...' : 'Describe the remaining issue...'}
              className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30 min-h-[60px] resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onResponse(response === 'yes', feedback || undefined);
                  setShowForm(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold border transition-colors ${
                  response === 'yes'
                    ? 'bg-lime/10 border-lime/30 text-lime hover:bg-lime/20'
                    : 'bg-red/10 border-red/20 text-red-400 hover:bg-red/20'
                }`}
              >
                {response === 'yes' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {response === 'yes' ? 'CONFIRM FIXED' : 'REPORT ISSUE'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
