// ═══════════════════════════════════════════════════════════════
// RESET PASSWORD — New password entry after email link
// 50/50 split layout | Password strength | Confirmation
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Lock, Eye, EyeOff, Zap, Loader2, CheckCircle2, AlertCircle,
  ArrowRight, XCircle
} from 'lucide-react';

function calcPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#f43f5e' };
  if (score <= 3) return { score, label: 'Medium', color: '#e879f9' };
  return { score, label: 'Strong', color: '#a3e635' };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);

  // Check if we have a recovery token in the URL
  useEffect(() => {
    const hash = window.location.hash;
    const hasToken = hash.includes('type=recovery') || hash.includes('access_token');
    setHasRecoveryToken(hasToken);
    if (!hasToken) {
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, []);

  const strength = calcPasswordStrength(password);
  const passwordsMatch = password && confirmPw && password === confirmPw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPw) { setError('Passwords do not match'); return; }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message || 'Failed to update password');
      toast.error(updateError.message || 'Failed to update password');
      return;
    }

    setDone(true);
    toast.success('Password updated successfully!');

    // Auto-redirect after 3 seconds
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 3000);
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
          Set New <span className="text-cyan">Password</span>
        </h1>
        <p className="text-sm text-text-secondary">
          Create a strong, secure password for your account.
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-surface rounded-xl p-6 sm:p-8 space-y-5" style={{ borderColor: 'rgba(34,211,238,0.1)' }}>
        {done ? (
          /* Success State */
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-lime-dim border border-lime/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-lime" />
            </div>
            <h3 className="text-lg font-black text-text-primary">Password Updated</h3>
            <p className="text-sm text-text-secondary">
              Redirecting you to sign in...
            </p>
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
              {/* New Password */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  <Lock className="w-3 h-3 text-cyan" /> New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    disabled={!hasRecoveryToken}
                    className="w-full bg-void-light border border-surface-border focus:border-cyan rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(strength.score / 5) * 100}%`, background: strength.color }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  <Lock className="w-3 h-3 text-cyan" /> Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={!hasRecoveryToken}
                  className={`w-full bg-void-light border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors disabled:opacity-50 ${
                    confirmPw && !passwordsMatch ? 'border-rose' : 'border-surface-border focus:border-cyan'
                  }`}
                />
                {confirmPw && !passwordsMatch && (
                  <p className="flex items-center gap-1 text-[11px] text-rose mt-1">
                    <XCircle className="w-3 h-3" /> Passwords do not match
                  </p>
                )}
                {confirmPw && passwordsMatch && (
                  <p className="flex items-center gap-1 text-[11px] text-lime mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !hasRecoveryToken || !passwordsMatch}
                className="w-full py-3 bg-lime text-void-dark text-sm font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {busy ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <div className="text-center">
              <Link to="/login" className="text-[11px] text-text-muted hover:text-text-primary font-semibold transition-colors">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
