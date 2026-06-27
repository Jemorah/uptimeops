// ═══════════════════════════════════════════════════════════════
// SIGNUP PAGE — UptimeOps
// Registration with email, password, name
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated } = useAuth();

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/customer', { replace: true });
    return null;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, { full_name: fullName });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setConfirmed(true);
      toast.success('Account created! Check your email for confirmation.');
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-[#a3e635]/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#a3e635]" />
          </div>
          <h2 className="text-2xl font-black">Almost There!</h2>
          <p className="text-sm text-white/50">
            We've sent a confirmation email to <strong>{email}</strong>.<br />
            Click the link in the email to activate your account.
          </p>
          <Button onClick={() => navigate('/login')} className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black">Create Account</h1>
          <p className="text-sm text-white/40">Start protecting your infrastructure</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#a3e635] text-black hover:bg-[#a3e635]/90 font-bold"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link to="/login" className="text-[#a3e635] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
