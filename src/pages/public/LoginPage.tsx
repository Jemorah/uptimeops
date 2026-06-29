// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE — Clean flow: form → signIn → navigate.
// If already logged in, auto-redirect. No reloads. No complex state.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Zap, Mail, Lock, Github, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading, signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('cumouat@gmail.com');
  const [password, setPassword] = useState('Canaris92@');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  // ── Already logged in? Redirect immediately. ──
  useEffect(() => {
    if (!loading && user && role) {
      const dest = role === 'admin' || role === 'coordinator' ? '/hq'
        : role === 'engineer' ? '/engineer'
        : '/customer';
      navigate(dest, { replace: true });
    }
  }, [loading, user, role, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowAdminSetup(false);
    setBusy(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);

        if (result.error) {
          setBusy(false);
          if (email.toLowerCase() === 'cumouat@gmail.com' && result.error.message?.includes('Invalid')) {
            setError('Account not found. Click below to create it.');
            setShowAdminSetup(true);
          } else {
            setError(result.error.message);
            toast.error(result.error.message);
          }
          return;
        }

        // SUCCESS — verify session persisted before navigating
        // Small delay to let onAuthStateChange settle and localStorage write
        await new Promise(r => setTimeout(r, 300));

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // Session didn't persist — try refreshing
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr || !refreshData.session?.user) {
            setBusy(false);
            setError('Session failed to persist. Please try again.');
            toast.error('Session failed to persist. Please try again.');
            return;
          }
        }

        const dest = result.role === 'admin' || result.role === 'coordinator' ? '/hq'
          : result.role === 'engineer' ? '/engineer'
          : '/customer';
        navigate(dest, { replace: true });
        return;
      }

      // Sign up
      if (!fullName.trim()) {
        setBusy(false);
        setError('Full name is required');
        return;
      }

      const result = await signUp(email, password, { full_name: fullName });
      setBusy(false);

      if (result.error) {
        setError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      if (result.role) {
        const dest = result.role === 'admin' || result.role === 'coordinator' ? '/hq'
          : result.role === 'engineer' ? '/engineer'
          : '/customer';
        navigate(dest, { replace: true });
        return;
      }

      toast.success('Account created! Check your email.');
      setMode('signin');
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || 'Something went wrong. Try again.');
    }
  }

  async function handleAdminSetup() {
    setError('');
    setBusy(true);
    try {
      const su = await signUp(email, password, { full_name: 'Admin' });
      if (su.error && !su.error.message?.includes('already')) {
        setBusy(false);
        setError('Failed: ' + su.error.message);
        return;
      }
      const si = await signIn(email, password);
      setBusy(false);
      if (si.error) { setError(si.error.message); return; }
      navigate('/hq', { replace: true });
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || 'Failed');
    }
  }

  async function handleOAuth(provider: 'github' | 'google') {
    setError('');
    setBusy(true);
    const result = await signInWithOAuth(provider);
    if (result.error) { setBusy(false); setError(result.error.message); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-[#a3e635]" />
            <span className="text-lg font-black tracking-tight">
              UPTIME<span className="text-[#a3e635]">OPS</span>
            </span>
          </div>
          <p className="text-sm text-white/40">
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Admin Setup Button */}
        {showAdminSetup && (
          <button
            onClick={handleAdminSetup}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-xs font-bold uppercase hover:bg-[#a3e635]/20 transition-colors disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            {busy ? 'Creating...' : 'Create Admin Account & Sign In'}
          </button>
        )}

        {/* OAuth */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('github')}
            disabled={busy}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('google')}
            disabled={busy}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">or with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 bg-[#a3e635] text-black hover:bg-[#a3e635]/90 font-bold"
            disabled={busy}
          >
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs text-white/40">
          {mode === 'signin' ? (
            <>No account? <button onClick={() => { setMode('signup'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign up</button></>
          ) : (
            <>Have an account? <button onClick={() => { setMode('signin'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign in</button></>
          )}
        </p>

        {/* Back to home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 mx-auto text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to home
        </button>
      </div>
    </div>
  );
}
