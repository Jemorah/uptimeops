// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE — Direct navigation after signIn. Debug panel visible.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Mail, Lock, Github, AlertCircle, ArrowLeft, Shield, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TIMEOUT_MS = 10000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error('Timeout')), ms))]);
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithOAuth, debugLog } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('cumouat@gmail.com');
  const [password, setPassword] = useState('Canaris92@');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // ── Sign In — navigates DIRECTLY after success ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowAdminSetup(false);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await withTimeout(signIn(email, password), TIMEOUT_MS);

        if (result.error) {
          setLoading(false);
          if (email.toLowerCase() === 'cumouat@gmail.com' && result.error.message?.includes('Invalid')) {
            setError('Admin account not found. Click below to create it.');
            setShowAdminSetup(true);
          } else {
            setError(result.error.message);
          }
          return;
        }

        // SUCCESS — navigate directly via React Router
        const dest = result.role === 'admin' || result.role === 'coordinator' ? '/hq'
          : result.role === 'engineer' ? '/engineer'
          : '/customer';
        console.log('[LoginPage] Navigating to:', dest);
        navigate(dest, { replace: true });
        // loading stays true until component unmounts — button stays disabled
        return;
      }

      // Sign up
      if (!fullName.trim()) { setLoading(false); setError('Full name required'); return; }
      const result = await withTimeout(signUp(email, password, { full_name: fullName }), TIMEOUT_MS);
      setLoading(false);
      if (result.error) { setError(result.error.message); return; }
      if (result.role) {
        navigate(result.role === 'admin' || result.role === 'coordinator' ? '/hq' : result.role === 'engineer' ? '/engineer' : '/customer', { replace: true });
        return;
      }
      toast.success('Check your email for confirmation link.');
      setMode('signin');
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Request timed out. Check console.');
    }
  }

  async function handleAdminSetup() {
    setError('');
    setLoading(true);
    try {
      await withTimeout(signUp(email, password, { full_name: 'Admin' }), TIMEOUT_MS);
      const result = await withTimeout(signIn(email, password), TIMEOUT_MS);
      setLoading(false);
      if (result.error) { setError(result.error.message); return; }
      navigate('/hq', { replace: true });
    } catch (err: any) { setLoading(false); setError(err?.message || 'Timed out'); }
  }

  async function handleOAuth(provider: 'github' | 'google') {
    setError('');
    setLoading(true);
    const result = await withTimeout(signInWithOAuth(provider), TIMEOUT_MS);
    if (result.error) { setLoading(false); setError(result.error.message); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-[#a3e635]" />
            <span className="text-lg font-black tracking-tight">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <p className="text-sm text-white/40">{mode === 'signin' ? 'Sign in' : 'Create account'}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Admin Setup */}
        {showAdminSetup && (
          <button onClick={handleAdminSetup} disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-xs font-bold uppercase hover:bg-[#a3e635]/20 transition-colors disabled:opacity-50">
            <Shield className="w-4 h-4" />{loading ? 'Creating...' : 'Create Admin Account & Sign In'}
          </button>
        )}

        {/* OAuth */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full h-10 border-white/10 hover:bg-white/5 text-white" onClick={() => handleOAuth('github')} disabled={loading}>
            <Github className="w-4 h-4 mr-2" />Continue with GitHub
          </Button>
          <Button variant="outline" className="w-full h-10 border-white/10 hover:bg-white/5 text-white" onClick={() => handleOAuth('google')} disabled={loading}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>
        </div>

        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-white/10" /><span className="text-xs text-white/30">or</span><div className="flex-1 h-px bg-white/10" /></div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <Button type="submit" className="w-full h-10 bg-[#a3e635] text-black hover:bg-[#a3e635]/90 font-bold" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-xs text-white/40">
          {mode === 'signin' ? <>No account? <button onClick={() => { setMode('signup'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign up</button></>
            : <>Have an account? <button onClick={() => { setMode('signin'); setError(''); setShowAdminSetup(false); }} className="text-[#a3e635] hover:underline">Sign in</button></>}
        </p>

        <button onClick={() => navigate('/')} className="flex items-center gap-1 mx-auto text-xs text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft className="w-3 h-3" />Back to home
        </button>

        {/* Debug Panel */}
        <div className="border border-white/10 bg-black/40">
          <button onClick={() => setShowDebug(!showDebug)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white/60">
            <Terminal className="w-3 h-3" />{showDebug ? 'Hide' : 'Show'} Debug Log
          </button>
          {showDebug && (
            <div className="px-3 pb-3 max-h-48 overflow-y-auto font-mono text-[10px] text-white/40 space-y-0.5">
              {debugLog.length === 0 && <span className="text-white/20">No logs yet...</span>}
              {debugLog.map((msg, i) => <div key={i} className="truncate">{msg}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
