// ═══════════════════════════════════════════════════════════════
// COORDINATOR GATE — Pre-deployment approval with review panel
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  ShieldCheck, CheckCircle, XCircle, FileText,
  Clock, AlertTriangle, ThumbsUp, ThumbsDown, Zap
} from 'lucide-react';
import type { IncidentLifecycle } from './types';

interface CoordinatorGateProps {
  lifecycle: IncidentLifecycle;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

const VALIDATION_TESTS = [
  { name: 'HTTP Status Code', result: 'pass', detail: '200 OK — 142ms' },
  { name: 'Checkout Flow', result: 'pass', detail: 'End-to-end success — 891ms' },
  { name: 'Payment Gateway', result: 'pass', detail: 'Stripe integration — 523ms' },
  { name: 'Mobile Rendering', result: 'pass', detail: 'No layout shifts detected' },
  { name: 'Cross-browser', result: 'pass', detail: 'Chrome, Firefox, Safari OK' },
  { name: 'DB Integrity', result: 'pass', detail: 'No corruption, indexes intact' },
  { name: 'Plugin Compat', result: 'pass', detail: '12/12 plugins functioning' },
  { name: 'Performance', result: 'pass', detail: 'TTFB: 312ms (63% improvement)' },
];

export function CoordinatorGate({ onApprove, onReject }: CoordinatorGateProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const confidence = 94;

  return (
    <div className="bg-surface border border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            Coordinator Approval Gate
          </h3>
          <div className={`flex items-center gap-1.5 px-2 py-1 border ${
            confidence >= 90 ? 'bg-green/10 border-green/20 text-green-400' :
            confidence >= 70 ? 'bg-yellow/10 border-yellow/20 text-yellow-400' :
            'bg-red/10 border-red/20 text-red-400'
          }`}>
            <Zap className="w-3 h-3" />
            <span className="text-xs font-bold font-mono">{confidence}% confidence</span>
          </div>
        </div>
      </div>

      {/* Validation Report */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-cyan" />
          <span className="text-xs font-bold uppercase tracking-wider">Validation Report</span>
          <span className="text-[10px] text-white/30">8/8 passed</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {VALIDATION_TESTS.map((test) => (
            <div
              key={test.name}
              className="flex items-center gap-2 p-2 bg-black/20 border border-white/5"
            >
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-white/60">{test.name}</div>
                <div className="text-[10px] text-white/30 font-mono">{test.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Logs Summary */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-lime" />
          <span className="text-xs font-bold uppercase tracking-wider">Pipeline Summary</span>
        </div>
        <div className="text-xs text-white/50 space-y-1">
          <p><span className="text-white/30">Root cause:</span> WooCommerce 8.2.0 broke custom-gateway-plugin v1.4.2</p>
          <p><span className="text-white/30">Fix:</span> Patched class-checkout.php line 142</p>
          <p><span className="text-white/30">Files modified:</span> 1 file, 1 line changed</p>
          <p><span className="text-white/30">VM session:</span> sandbox-7f3a9e2d (isolated)</p>
          <p><span className="text-white/30">Cost:</span> $3.42 total pipeline cost</p>
        </div>
      </div>

      {/* Security Warning for < 90% */}
      {confidence < 90 && (
        <div className="p-4 bg-red-500/5 border-b border-red-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-400">Confidence below 90% threshold</p>
              <p className="text-xs text-white/40 mt-1">
                AI recommends engineer review. Some edge cases may not be covered.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4">
        {!showRejectForm ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-sm font-bold hover:bg-lime/20 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              APPROVE DEPLOYMENT
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red/10 border border-red/20 text-red-400 text-sm font-bold hover:bg-red/20 transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              REJECT
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-red/30 min-h-[60px] resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (rejectReason.trim()) onReject(rejectReason);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={!rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red/10 border border-red/20 text-red-400 text-sm font-bold hover:bg-red/20 transition-colors disabled:opacity-30"
              >
                <XCircle className="w-4 h-4" />
                CONFIRM REJECT
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
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
