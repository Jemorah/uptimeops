import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, Shield,
  CheckCircle, Loader2, Globe, Building2, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, getRoleRedirectPath } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, role, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Redirect if already logged in
  if (role !== 'public' && profile) {
    const path = getRoleRedirectPath(role, profile.subscription_status);
    navigate(path, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setConfirmed(true);
      toast.success('Account created! Check your email to confirm.');
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4 relative">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md relative z-10 text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">ALMOST THERE</h2>
          <p className="text-white/60">
            We sent a confirmation link to <span className="text-lime font-mono">{email}</span>
          </p>
          <p className="text-sm text-white/40">
            Click the link in your email to activate your account. The database trigger will automatically create your customer record.
          </p>
          <div className="bg-surface border border-white/5 p-4 text-left">
            <p className="text-xs text-white/40 mb-2">What happens next:</p>
            <ol className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-lime font-mono">1.</span>
                Confirm your email address
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lime font-mono">2.</span>
                Auto-created as a customer in our database
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lime font-mono">3.</span>
                Choose your protection plan
              </li>
            </ol>
          </div>
          <Link to="/login" className="btn-lime text-sm inline-flex items-center gap-2">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Shield className="w-7 h-7 text-lime" />
            <span className="text-xl font-black tracking-tight">
              UPTIME<span className="text-lime">OPS</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight">GET PROTECTED</h1>
          <p className="text-sm text-white/50 mt-1">Create your account — no credit card required</p>
        </div>

        <div className="bg-surface border border-white/5 p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                  Full Name *
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                  Company
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Email *
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
                Password *
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-yellow-500 mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-lime" />
              <span className="text-xs text-white/40">
                I agree to the <span className="text-white/60">Terms of Service</span> and{' '}
                <span className="text-white/60">Privacy Policy</span>. I consent to automated site monitoring.
              </span>
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
                  <Rocket className="w-4 h-4" />
                  Create Account
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-lime hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
