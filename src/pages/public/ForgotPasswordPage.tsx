import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Mail, ArrowLeft, ArrowRight, CheckCircle, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    const { error } = await sendPasswordReset(email);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Password reset link sent!');
    }
  };

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
          <h1 className="text-2xl font-black tracking-tight">RESET PASSWORD</h1>
          <p className="text-sm text-white/50 mt-1">
            {sent ? 'Check your inbox' : 'We\'ll send you a reset link'}
          </p>
        </div>

        <div className="bg-surface border border-white/5 p-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-lime h-11 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-white/60">
                Reset link sent to <span className="text-lime font-mono">{email}</span>
              </p>
              <p className="text-xs text-white/40">
                Click the link in your email to set a new password. Link expires in 1 hour.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
