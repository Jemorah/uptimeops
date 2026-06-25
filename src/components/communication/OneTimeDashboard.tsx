// ═══════════════════════════════════════════════════════════════
// ONE-TIME FIX DASHBOARD (72h Temporary)
// Token-based access with fix summary, audit, actions
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, FileText, Shield, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';

interface OneTimeDashboardProps {
  token?: string;
}

export function OneTimeDashboard({ token = 'tk-7f3a9e2d' }: OneTimeDashboardProps) {
  const [confirmed, setConfirmed] = useState<'none' | 'fixed' | 'broken'>('none');
  const [revoked, setRevoked] = useState(false);
  const [timeLeft] = useState({ hours: 18, minutes: 42 });

  if (revoked) {
    return (
      <div className="bg-surface border border-white/5 p-8 text-center">
        <Shield className="w-10 h-10 text-lime mx-auto mb-4" />
        <h3 className="text-lg font-black tracking-tight text-lime">CREDENTIALS REVOKED</h3>
        <p className="text-sm text-white/40 mt-2">All access has been terminated. Zero residual access remains.</p>
        <p className="text-xs text-white/20 font-mono mt-4">Token: {token}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan" />
              Fix Dashboard
            </h3>
            <p className="text-xs text-white/30 font-mono mt-1">One-Time Access — {token}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 border ${timeLeft.hours < 6 ? 'bg-red/10 border-red/20 text-red-400' : 'bg-yellow/10 border-yellow/20 text-yellow-400'}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono">{timeLeft.hours}h {timeLeft.minutes}m left</span>
          </div>
        </div>
      </div>

      {/* Fix Summary */}
      <div className="bg-surface border border-white/5 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Fix Summary</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" /><span className="text-white/60">Fixed: WooCommerce checkout 500 error</span></div>
          <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" /><span className="text-white/60">Root cause: Plugin conflict in custom-gateway</span></div>
          <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" /><span className="text-white/60">File modified: class-checkout.php (1 line)</span></div>
          <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" /><span className="text-white/60">Tests passed: 8/8 (confidence: 94%)</span></div>
          <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" /><span className="text-white/60">Deployed: 2024-06-25 14:48 UTC</span></div>
        </div>
      </div>

      {/* Files Changed */}
      <div className="bg-surface border border-white/5 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Files Changed</h4>
        <div className="bg-black/20 border border-white/5 p-3 font-mono text-xs">
          <div className="text-lime mb-1">+ 1 file modified</div>
          <div className="text-white/50">wp-content/plugins/custom-gateway/includes/class-checkout.php</div>
          <div className="text-white/30 mt-1.5">Line 142: wc_get_checkout_url() → wc_get_page_permalink(&quot;checkout&quot;)</div>
        </div>
      </div>

      {/* Audit Report */}
      <div className="bg-surface border border-white/5 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Audit Report</h4>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Duration</div><div className="text-sm font-black font-mono text-white">28m</div></div>
          <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Cost</div><div className="text-sm font-black font-mono text-lime">$3.42</div></div>
          <div className="bg-black/20 p-2 text-center"><div className="text-[10px] text-white/30">Certificate</div><div className="text-sm font-black font-mono text-cyan">SHA-256</div></div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan/10 border border-cyan/30 text-cyan text-xs font-bold hover:bg-cyan/20 transition-colors">
          <ExternalLink className="w-3 h-3" />
          DOWNLOAD FULL REPORT
        </button>
      </div>

      {/* Actions */}
      {confirmed === 'none' ? (
        <div className="bg-surface border border-white/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Is your site working correctly?</h4>
          <div className="flex gap-3">
            <button onClick={() => setConfirmed('fixed')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-sm font-bold hover:bg-lime/20 transition-colors">
              <CheckCircle className="w-4 h-4" />
              YES, FIXED
            </button>
            <button onClick={() => setConfirmed('broken')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red/10 border border-red/20 text-red-400 text-sm font-bold hover:bg-red/20 transition-colors">
              <XCircle className="w-4 h-4" />
              NO, STILL BROKEN
            </button>
          </div>
        </div>
      ) : confirmed === 'fixed' ? (
        <div className="bg-lime/5 border border-lime/20 p-4 text-center">
          <CheckCircle className="w-8 h-8 text-lime mx-auto mb-2" />
          <h4 className="text-sm font-bold text-lime">THANK YOU</h4>
          <p className="text-xs text-white/40 mt-1">Your incident is resolved. This dashboard expires in {timeLeft.hours}h.</p>
        </div>
      ) : (
        <div className="bg-red/5 border border-red/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-400">ESCALATING TO HUMAN ENGINEER</h4>
              <p className="text-xs text-white/40 mt-1">A senior engineer will review and contact you within 15 minutes.</p>
              <p className="text-xs text-white/30 mt-1 font-mono">Ticket reopened: ESC-2049</p>
            </div>
          </div>
        </div>
      )}

      {/* Revoke */}
      <div className="bg-surface border border-white/5 p-4">
        <button onClick={() => setRevoked(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/30 text-xs font-bold hover:border-red/20 hover:text-red-400 transition-colors">
          <Trash2 className="w-3 h-3" />
          REVOKE CREDENTIALS &amp; CLOSE ACCESS
        </button>
      </div>
    </div>
  );
}
