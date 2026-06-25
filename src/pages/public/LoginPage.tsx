import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap, Mail, Lock, Github, Chrome, ArrowRight, Eye, EyeOff,
  Sparkles, KeyRound, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, getRoleRedirectPath } from '@/hooks/useAuth';
import { toast } from 'sonner';

type AuthTab = 'password' | 'magic';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';
  const { signIn, sendMagicLink, signInWithOAuth, role, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      // Role-based redirect will happen via useEffect watching role
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    const { error } = await sendMagicLink(email);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setMagicSent(true);
      toast.success('Magic link sent! Check your email.');
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    const { error, url } = await signInWithOAuth(provider);
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else if (url) {
      window.location.href = url;
    }
  };

  // Role-based redirect after login
  if (role !== 'public' && profile) {
    const path = redirectTo || getRoleRedirectPath(role, profile.subscription_status);
    navigate(path, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-magenta/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-7 h-7 text-lime" />
            <span className="text-xl font-black tracking-tight">
              UPTIME<span className="text-lime">OPS</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight">AUTHENTICATE</h1>
          <p className="text-sm text-white/50 mt-1">Secure access to your dashboard</p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface border border-white/5 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => { setActiveTab('password'); setMagicSent(false); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'password'
                  ? 'text-lime border-b-2 border-lime bg-lime/5'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Password
            </button>
            <button
              onClick={() => { setActiveTab('magic'); setMagicSent(false); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'magic'
                  ? 'text-lime border-b-2 border-lime bg-lime/5'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Magic Link
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ── PASSWORD TAB ── */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-lime bg-elevated border-white/20 rounded" />
                    <span className="text-xs text-white/40">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs text-lime hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-lime h-11 text-sm font-bold uppercase tracking-wider border-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* ── MAGIC LINK TAB ── */}
            {activeTab === 'magic' && !magicSent && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="bg-cyan/5 border border-cyan/20 p-4">
                  <p className="text-sm text-cyan flex items-start gap-2">
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    We'll send a secure login link to your email. No password needed.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-lime h-11 text-sm font-bold uppercase tracking-wider border-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Send Magic Link
                    </span>
                  )}
                </Button>
              </form>
            )}

            {activeTab === 'magic' && magicSent && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">Check Your Email</h3>
                <p className="text-sm text-white/60">
                  We sent a secure login link to <span className="text-lime font-mono">{email}</span>
                </p>
                <p className="text-xs text-white/40">
                  The link expires in 1 hour. If you don't see it, check your spam folder.
                </p>
                <button
                  onClick={() => setMagicSent(false)}
                  className="text-xs text-lime hover:underline"
                >
                  Send to a different email
                </button>
              </div>
            )}

            {/* Divider */}
            {!magicSent && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-surface text-xs text-white/30 uppercase tracking-widest">or continue with</span>
                </div>
              </div>
            )}

            {/* OAuth Buttons */}
            {!magicSent && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-sm text-white/70 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-sm text-white/70 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50"
                >
                  <Chrome className="w-4 h-4" />
                  Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-white/40 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-lime hover:underline font-medium">
            Get Protected
          </Link>
        </p>

        {/* Emergency link */}
        <div className="mt-6 text-center">
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 text-sm text-magenta hover:text-magenta/80 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency? No account needed
          </Link>
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          <Link to="/" className="hover:text-white/40 transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
