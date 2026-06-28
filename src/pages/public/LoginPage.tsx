// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE — UptimeOps
// Email/Password + GitHub OAuth + Google OAuth
// Admin auto-signup: if cumouat@gmail.com doesn't exist, auto-creates account.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, getPostLoginDestination } from '@/hooks/useAuth';
import { isSubdomainMode, isAdminEmail } from '@/lib/supabase/client';
import { Zap, Mail, Lock, Github, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  // redirect_to is a hash path like "/customer" or "/hq"
  const rawRedirect = searchParams.get('redirect_to') || '';
  const redirectPath = rawRedirect.startsWith('http')
    ? new URL(rawRedirect).hash.replace(/^#/, '').split('?')[0] || '/'
    : rawRedirect.split('?')[0] || '';

  // ── Navigate after successful auth ──
  function goToDestination(role: import('@/lib/supabase/client').UserRole) {
    if (redirectPath && redirectPath !== '/login') {
      navigate(redirectPath);
    } else if (!isSubdomainMode()) {
      navigate(getPostLoginDestination(role, null));
    }
    // In subdomain mode, the page redirect is handled by the caller
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowAdminSetup(false);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError, role: returnedRole } = await signIn(email, password);

        if (signInError) {
          // Admin auto-signup: if admin email doesn't exist, offer to create
          if (isAdminEmail(email) && signInError.message?.includes('Invalid')) {
            setError('Admin account not found. Create it now?');
            setShowAdminSetup(true);
          } else {
            setError(signInError.message);
            toast.error(signInError.message);
          }
        } else if (returnedRole && returnedRole !== 'public') {
          toast.success(`Signed in — ${returnedRole} access`);
          goToDestination(returnedRole);
        }
      } else {
        // Sign up mode
        if (!fullName.trim()) {
          setError('Full name is required');
          setIsLoading(false);
          return;
        }
        const { error: signUpError, role: returnedRole } = await signUp(email, password, { full_name: fullName });
        if (signUpError) {
          setError(signUpError.message);
          toast.error(signUpError.message);
        } else if (returnedRole && returnedRole !== 'public') {
          toast.success(`Account created — ${returnedRole} access`);
          goToDestination(returnedRole);
        } else {
          toast.success('Account created! Check your email for confirmation.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Admin auto-setup: sign up + immediately sign in ──
  async function handleAdminSetup() {
    setError('');
    setIsLoading(true);
    setShowAdminSetup(false);
    try {
      // Step 1: Sign up the admin account
      const { error: signUpError } = await signUp(email, password, { full_name: 'Admin' });
      if (signUpError && !signUpError.message?.includes('already')) {
        setError('Failed to create admin: ' + signUpError.message);
        toast.error(signUpError.message);
        setIsLoading(false);
        return;
      }
      // Step 2: Immediately sign in
      const { error: signInError, role: returnedRole } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
        toast.error(signInError.message);
      } else if (returnedRole && returnedRole !== 'public') {
        toast.success(`Admin account created — ${returnedRole} access granted`);
        goToDestination(returnedRole);
      }
    } catch (err: any) {
      setError(err.message || 'Admin setup failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: 'github' | 'google') {
    setError('');
    setShowAdminSetup(false);
    setIsLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setError(error.message);
        toast.error(error.message);
      }
      // Browser redirects to OAuth provider — no further action needed
    } catch (err: any) {
      const msg = err?.message || `Failed to sign in with ${provider}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-sm text-white/40">{mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Admin Setup Button */}
        {showAdminSetup && (
          <button
            onClick={handleAdminSetup}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-xs font-bold uppercase hover:bg-[#a3e635]/20 transition-colors"
          >
            <Shield className="w-4 h-4" />
            {isLoading ? 'Creating admin account...' : 'Create Admin Account & Sign In'}
          </button>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('github')}
            disabled={isLoading}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('google')}
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
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
        <form onSubmit={handleEmailSubmit} className="space-y-3">
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
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs text-white/40">
          {mode === 'signin' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign in</button></>
          )}
        </p>

        {/* Back */}
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
