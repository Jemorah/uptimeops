import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Lock, Eye, EyeOff, CheckCircle, Loader2, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verify we have a valid recovery session from the email link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setValidSession(true);
      }
      setChecking(false);
    });

    // Listen for auth state changes (Supabase handles the token from URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidSession(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success('Password updated successfully!');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-lime animate-spin" />
      </div>
    );
  }

  if (!validSession && !checking) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h2 className="text-xl font-black">INVALID OR EXPIRED LINK</h2>
          <p className="text-white/60">This password reset link is no longer valid.</p>
          <Link to="/forgot-password" className="btn-lime text-sm inline-flex items-center gap-2">
            Request New Link <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black">PASSWORD UPDATED</h2>
          <p className="text-white/60">Your password has been changed successfully.</p>
          <Link to="/login" className="btn-lime text-sm inline-flex items-center gap-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-lime/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-7 h-7 text-lime" />
            <span className="text-xl font-black tracking-tight">
              UPTIME<span className="text-lime">OPS</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight">NEW PASSWORD</h1>
          <p className="text-sm text-white/50 mt-1">Set a new password for your account</p>
        </div>

        <div className="bg-surface border border-white/5 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pl-10 pr-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-lime h-11 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><span>Update Password</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
