// ═══════════════════════════════════════════════════════════════
// FORGOT PASSWORD — Password recovery request
// 50/50 split layout | Email form | Retry with exponential backoff
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Mail, Zap, ArrowLeft, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setBusy(true);

    // Exponential backoff for retries
    if (retryCount > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
      await new Promise(r => setTimeout(r, backoffMs));
    }

    const result = await sendPasswordReset(email);
    setBusy(false);

    if (result.error) {
      setError(result.error.message || 'Failed to send reset email');
      setRetryCount(c => c + 1);
      toast.error(result.error.message || 'Failed to send reset email');
      return;
    }

    setSent(true);
    setRetryCount(0);
    toast.success('Password reset link sent! Check your email.');
  };

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
          <Zap className="w-6 h-6 text-lime" />
          <span className="text-xl font-black tracking-tight text-text-primary">
            UPTIME<span className="text-lime">OPS</span>
          </span>
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-text-primary">
          Reset Your <span className="text-cyan">Password</span>
        </h1>
        <p className="text-sm text-text-secondary">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-surface rounded-xl p-6 sm:p-8 space-y-5" style={{ borderColor: 'rgba(34,211,238,0.1)' }}>
        {sent ? (
          /* Success State */
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-lime-dim border border-lime/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-lime" />
            </div>
            <h3 className="text-lg font-black text-text-primary">Reset Link Sent</h3>
            <p className="text-sm text-text-secondary">
              Check <span className="text-cyan font-semibold">{email}</span> for the password reset link.
              It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-void-light border border-surface-border rounded-lg text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary hover:border-cyan/30 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-dim border border-rose/20 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose shrink-0" />
                <span className="text-xs text-rose">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  <Mail className="w-3 h-3 text-cyan" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@company.com"
                  className={`w-full bg-void-light border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                    error ? 'border-rose' : 'border-surface-border focus:border-cyan'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={busy || !email}
                className="w-full py-3 bg-cyan text-void-dark text-sm font-black uppercase tracking-wider rounded-lg hover:bg-cyan-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {busy ? (retryCount > 0 ? `Retrying (${retryCount})...` : 'Sending...') : 'Send Reset Link'}
              </button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary font-semibold transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Remember your password? Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
