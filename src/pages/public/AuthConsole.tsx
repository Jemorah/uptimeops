// ═══════════════════════════════════════════════════════════════
// AUTH CONSOLE — Unified Login / Signup
// 50/50 split layout | Tabs | Password strength | OAuth | Intent routing
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Zap, Mail, Lock, Eye, EyeOff, AlertCircle, Github,
  Loader2, CheckCircle2, XCircle, ArrowRight, ShieldCheck,
  ChevronLeft
} from 'lucide-react';

// ═══════════════════════════════════════════
// PASSWORD STRENGTH CALCULATOR
// ═══════════════════════════════════════════
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

// ═══════════════════════════════════════════
// INTENT ROUTING — Parse ?intent=... params
// ═══════════════════════════════════════════
function getPostAuthDestination(
  role: UserRole,
  searchParams: URLSearchParams
): string {
  // Check for intent params first
  const intent = searchParams.get('intent');
  const plan = searchParams.get('plan');
  const billing = searchParams.get('billing');
  const tier = searchParams.get('tier');
  const track = searchParams.get('track');
  const leadId = searchParams.get('lead_id');

  if (intent === 'subscribe' && plan) {
    return `/customer/billing?plan=${plan}${billing ? `&billing=${billing}` : ''}`;
  }
  if (intent === 'emergency' && tier) {
    return `/emergency?tier=${tier}${track ? `&track=${track}` : ''}`;
  }
  if (leadId) {
    return `/customer/incidents?lead=${leadId}`;
  }

  // Default: role-based routing
  switch (role) {
    case 'admin':
    case 'coordinator': return '/hq';
    case 'engineer': return '/engineer';
    case 'customer': return '/customer';
    default: return '/customer';
  }
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export function AuthConsole() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, loading: authLoading, signIn, signUp, signInWithOAuth } = useAuth();

  // ── Tabs ──
  const [tab, setTab] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );

  // ── Form State ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTos, setAgreedTos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Password Strength ──
  const strength = calcPasswordStrength(password);

  // ── Auto-redirect if already logged in ──
  useEffect(() => {
    if (!authLoading && user && role && role !== 'public') {
      navigate(getPostAuthDestination(role, searchParams), { replace: true });
    }
  }, [authLoading, user, role, navigate, searchParams]);

  // ── Real-time validation ──
  const validateEmail = useCallback((e: string) => {
    if (!e) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Invalid email format';
    return '';
  }, []);

  const validatePassword = useCallback((p: string) => {
    if (!p) return 'Password is required';
    if (p.length < 6) return 'Minimum 6 characters';
    return '';
  }, []);

  // ── Handle Email Sign In ──
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);
    if (emailErr || pwErr) {
      setFieldErrors({ email: emailErr, password: pwErr });
      return;
    }

    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);

    if (result.error) {
      const msg = result.error.message || 'Authentication failed';
      setError(msg);
      toast.error(msg);
      return;
    }

    // Verify session persisted
    await new Promise(r => setTimeout(r, 300));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (!refreshData.session?.user) {
        setError('Session failed to persist. Please try again.');
        toast.error('Session failed to persist');
        return;
      }
    }

    const resolvedRole = result.role || 'customer';
    toast.success('Signed in successfully');
    navigate(getPostAuthDestination(resolvedRole, searchParams), { replace: true });
  };

  // ── Handle Sign Up ──
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);
    if (emailErr) errs.email = emailErr;
    if (pwErr) errs.password = pwErr;
    if (!agreedTos) errs.tos = 'You must agree to the Terms of Service';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    const result = await signUp(email, password, { full_name: fullName.trim() });
    setBusy(false);

    if (result.error) {
      const msg = result.error.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (result.role) {
      toast.success('Account created! Welcome to UptimeOps.');
      navigate(getPostAuthDestination(result.role, searchParams), { replace: true });
    } else {
      toast.success('Account created! Check your email for verification.');
      setTab('signin');
    }
  };

  // ── Handle OAuth ──
  const handleOAuth = async (provider: 'github' | 'google') => {
    setError('');
    setBusy(true);
    const result = await signInWithOAuth(provider);
    setBusy(false);
    if (result.error) {
      setError(result.error.message || `${provider} authentication failed`);
      toast.error(result.error.message || `${provider} authentication failed`);
    }
    // OAuth redirects to provider — no further action needed
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
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
        <p className="text-sm text-text-secondary">
          {tab === 'signin' ? 'Welcome back. Secure access to your infrastructure.' : 'Create your secure account.'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-void-light rounded-lg border border-surface-border">
        <button
          onClick={() => { setTab('signin'); setError(''); setFieldErrors({}); }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            tab === 'signin'
              ? 'bg-lime text-void-dark'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setTab('signup'); setError(''); setFieldErrors({}); }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            tab === 'signup'
              ? 'bg-lime text-void-dark'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* ── OAuth Buttons ── */}
      <div className="space-y-3">
        <button
          onClick={() => handleOAuth('github')}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 h-11 bg-void-light border border-surface-border rounded-lg text-sm text-text-primary hover:border-cyan/30 hover:bg-cyan-dim transition-all disabled:opacity-50"
        >
          <Github className="w-4 h-4" />
          Continue with GitHub
        </button>
        <button
          onClick={() => handleOAuth('google')}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 h-11 bg-void-light border border-surface-border rounded-lg text-sm text-text-primary hover:border-rose/30 hover:bg-rose-dim transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-surface-border" />
        <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">or with email</span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-dim border border-rose/20 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose shrink-0" />
          <span className="text-xs text-rose">{error}</span>
        </div>
      )}

      {/* ── FORM: Sign In ── */}
      {tab === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              <Mail className="w-3 h-3 text-cyan" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
              placeholder="you@company.com"
              className={`w-full bg-void-light border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                fieldErrors.email ? 'border-rose' : 'border-surface-border focus:border-cyan'
              }`}
            />
            {fieldErrors.email && <p className="text-[11px] text-rose mt-1">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              <Lock className="w-3 h-3 text-cyan" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                placeholder="Enter your password"
                className={`w-full bg-void-light border rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                  fieldErrors.password ? 'border-rose' : 'border-surface-border focus:border-cyan'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-[11px] text-rose mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-[11px] text-cyan hover:text-cyan-light font-semibold transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-lime text-void-dark text-sm font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {busy ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      )}

      {/* ── FORM: Sign Up ── */}
      {tab === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              <ShieldCheck className="w-3 h-3 text-cyan" /> Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: '' })); }}
              placeholder="Your full name"
              className={`w-full bg-void-light border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                fieldErrors.fullName ? 'border-rose' : 'border-surface-border focus:border-cyan'
              }`}
            />
            {fieldErrors.fullName && <p className="text-[11px] text-rose mt-1">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              <Mail className="w-3 h-3 text-cyan" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
              placeholder="you@company.com"
              className={`w-full bg-void-light border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                fieldErrors.email ? 'border-rose' : 'border-surface-border focus:border-cyan'
              }`}
            />
            {fieldErrors.email && <p className="text-[11px] text-rose mt-1">{fieldErrors.email}</p>}
          </div>

          {/* Password + Strength Meter */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              <Lock className="w-3 h-3 text-cyan" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                placeholder="Create a secure password"
                className={`w-full bg-void-light border rounded-lg px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
                  fieldErrors.password ? 'border-rose' : 'border-surface-border focus:border-cyan'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-[11px] text-rose mt-1">{fieldErrors.password}</p>}

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(strength.score / 5) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {[
                    { test: password.length >= 8, label: '8+ chars' },
                    { test: /[A-Z]/.test(password), label: 'Uppercase' },
                    { test: /[0-9]/.test(password), label: 'Number' },
                    { test: /[^A-Za-z0-9]/.test(password), label: 'Special' },
                  ].map(req => (
                    <span
                      key={req.label}
                      className={`flex items-center gap-1 text-[10px] ${req.test ? 'text-lime' : 'text-text-disabled'}`}
                    >
                      {req.test ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {req.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TOS Checkbox */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTos}
                onChange={e => { setAgreedTos(e.target.checked); setFieldErrors(prev => ({ ...prev, tos: '' })); }}
                className="mt-0.5 w-4 h-4 rounded border-surface-border bg-void-light text-lime focus:ring-lime focus:ring-offset-0 accent-lime"
              />
              <span className="text-[11px] text-text-secondary leading-relaxed">
                I agree to the{' '}
                <Link to="/" className="text-cyan hover:text-cyan-light font-semibold transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/" className="text-cyan hover:text-cyan-light font-semibold transition-colors">Privacy Policy</Link>.
                I understand my credentials will be encrypted with AES-256-GCM.
              </span>
            </label>
            {fieldErrors.tos && <p className="text-[11px] text-rose mt-1">{fieldErrors.tos}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-lime text-void-dark text-sm font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {busy ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}

      {/* Back to home */}
      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary font-semibold transition-colors">
          <ChevronLeft className="w-3 h-3" /> Back to UptimeOps
        </Link>
      </div>
    </div>
  );
}
