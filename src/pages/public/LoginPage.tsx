// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE — Global Entry Point
// After successful login, useAuth redirects to the correct portal.
// Has a 10-second timeout so the UI never hangs forever.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Mail, Lock, Github, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const LOGIN_TIMEOUT_MS = 10000; // 10 seconds max

// Promise wrapper with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function LoginPage() {
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const abortRef = useRef(false);

  // ── Email/Password Login ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowAdminSetup(false);
    setLoading(true);
    abortRef.current = false;

    try {
      if (mode === 'signin') {
        console.log('[LoginPage] Calling signIn for:', email);

        const result = await withTimeout(
          signIn(email, password),
          LOGIN_TIMEOUT_MS,
          'Sign in'
        );

        if (abortRef.current) return;

        if (result.error) {
          console.log('[LoginPage] signIn error:', result.error.message);
          if (email.toLowerCase() === 'cumouat@gmail.com' && result.error.message?.includes('Invalid')) {
            setError('Admin account not found. Click below to create it.');
            setShowAdminSetup(true);
          } else {
            setError(result.error.message);
            toast.error(result.error.message);
          }
          return;
        }

        if (result.role) {
          console.log('[LoginPage] Sign in success, role:', result.role);
          toast.success(`Signed in — ${result.role} access`);
          // Redirect is handled by useAuth.doPostLoginRedirect()
        }
        return;
      }

      // Sign up mode
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Full name is required');
          return;
        }

        const result = await withTimeout(
          signUp(email, password, { full_name: fullName }),
          LOGIN_TIMEOUT_MS,
          'Sign up'
        );

        if (abortRef.current) return;

        if (result.error) {
          setError(result.error.message);
          toast.error(result.error.message);
          return;
        }

        if (result.role) {
          toast.success(`Account created — ${result.role} access`);
          // Redirect handled by useAuth
          return;
        }

        toast.success('Check your email for confirmation link.');
        setMode('signin');
      }
    } catch (err: any) {
      console.error('[LoginPage] Timeout or error:', err?.message);
      setError(err?.message || 'Request timed out. Please check your connection and try again.');
      toast.error('Request timed out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Admin Auto-Create ──
  async function handleAdminSetup() {
    setError('');
    setShowAdminSetup(false);
    setLoading(true);

    try {
      const suResult = await withTimeout(
        signUp(email, password, { full_name: 'Admin' }),
        LOGIN_TIMEOUT_MS,
        'Admin signup'
      );

      if (suResult.error && !suResult.error.message?.includes('already')) {
        setLoading(false);
        setError('Failed to create admin: ' + suResult.error.message);
        toast.error(suResult.error.message);
        return;
      }

      const siResult = await withTimeout(
        signIn(email, password),
        LOGIN_TIMEOUT_MS,
        'Admin signin'
      );

      setLoading(false);

      if (siResult.error) {
        setError(siResult.error.message);
        toast.error(siResult.error.message);
        return;
      }

      if (siResult.role) {
        toast.success(`Admin account created — ${siResult.role} access granted`);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Request timed out');
      toast.error('Request timed out. Please try again.');
    }
  }

  // ── OAuth ──
  async function handleOAuth(provider: 'github' | 'google') {
    setError('');
    setShowAdminSetup(false);
    setLoading(true);

    try {
      const result = await withTimeout(
        signInWithOAuth(provider),
        LOGIN_TIMEOUT_MS,
        'OAuth'
      );

      if (result.error) {
        setLoading(false);
        setError(result.error.message);
        toast.error(result.error.message);
      }
      // If no error, browser redirects to OAuth provider
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'OAuth request timed out');
      toast.error('OAuth request timed out');
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
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

        {/* Admin Setup */}
        {showAdminSetup && (
          <button
            onClick={handleAdminSetup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-xs font-bold uppercase hover:bg-[#a3e635]/20 transition-colors disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Admin Account & Sign In'}
          </button>
        )}

        {/* OAuth */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('github')}
            disabled={loading}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            className="w-full h-10 border-white/10 hover:bg-white/5 text-white"
            onClick={() => handleOAuth('google')}
            disabled={loading}
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

        {/* Form */}
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
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-xs text-white/40">
          {mode === 'signin' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign in</button></>
          )}
        </p>

        {/* Back */}
        <button
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
          className="flex items-center gap-1 mx-auto text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to home
        </button>
      </div>
    </div>
  );
}
