// ═══════════════════════════════════════════════════════════════
// ENGINEER ONBOARDING — Accept invitation, set password, create account
// Validates token from email link, creates auth user, redirects to /engineer
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Lock, User, Smartphone, ShieldCheck, ChevronRight, ChevronLeft, Check, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SPECIALIZATIONS = ['Frontend', 'Backend', 'DevOps', 'Security', 'Database', 'Mobile', 'Cloud', 'SRE'];

export function EngineerOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Token validation state
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; specialization: string[] } | null>(null);
  const [tokenError, setTokenError] = useState('');

  // Form state
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    fullName: '',
    specialization: [] as string[],
    timezone: 'America/New_York',
    phone: '',
  });

  const steps = [
    { icon: Lock, title: 'Set Password', desc: 'Create a secure password' },
    { icon: User, title: 'Profile Setup', desc: 'Your details & specialization' },
    { icon: Smartphone, title: 'OpsGenie Connect', desc: 'Install the on-call app' },
    { icon: ShieldCheck, title: 'Ready', desc: 'Complete your setup' },
  ];

  // ── Validate token on mount ──
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenError('Missing invitation token. Please check your email link.');
        setValidating(false);
        return;
      }

      try {
        const resp = await fetch(`${import.meta.env.NEXT_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://npcopjsqgjvirfjnjemt.supabase.co'}/functions/v1/engineer-onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_invitation', token }),
        });

        const result = await resp.json();

        if (!result.valid) {
          setTokenError(result.error || 'Invalid or expired invitation');
        } else {
          setInviteData(result);
          // Pre-fill specialization from invitation
          if (result.specialization?.length > 0) {
            setForm(prev => ({ ...prev, specialization: result.specialization }));
          }
        }
      } catch (err: any) {
        setTokenError('Failed to validate invitation. Please try again.');
      }

      setValidating(false);
    }

    validateToken();
  }, [token]);

  function passwordStrength(p: string): number {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  // ── Complete onboarding ──
  async function complete() {
    if (!token || !inviteData) return;

    setLoading(true);
    setError('');

    try {
      // Call the onboard function to create the account
      const resp = await fetch(`${import.meta.env.NEXT_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://npcopjsqgjvirfjnjemt.supabase.co'}/functions/v1/engineer-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_invitation',
          token,
          password: form.password,
          full_name: form.fullName,
        }),
      });

      const result = await resp.json();

      if (!result.success) {
        setError(result.error || 'Onboarding failed');
        setLoading(false);
        return;
      }

      // Update profile with additional info
      if (result.engineer_id) {
        await supabase.from('engineer_profiles').update({
          specialization: form.specialization,
          timezone: form.timezone,
          phone: form.phone,
          status: 'active',
        }).eq('id', result.engineer_id);
      }

      toast.success('Account created successfully!');

      // Auto-sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteData.email,
        password: form.password,
      });

      if (signInError) {
        // If auto-sign-in fails, redirect to login
        toast.success('Account created! Please sign in.');
        navigate('/login');
        return;
      }

      // Signed in! Redirect to engineer portal
      navigate('/engineer');

    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setLoading(false);
    }
  }

  // ── Validation loading screen ──
  if (validating) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Zap className="w-6 h-6 text-[#a3e635] animate-pulse mx-auto" />
          <Loader2 className="w-5 h-5 text-[#a3e635] animate-spin mx-auto" />
          <p className="text-xs text-white/40 font-mono">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // ── Invalid token screen ──
  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Invalid Invitation</h2>
          <p className="text-xs text-white/40 mb-6">{tokenError}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-[#a3e635] text-black text-xs font-bold hover:bg-[#a3e635]/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Welcome */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[#a3e635]" />
            <span className="text-sm font-black tracking-tight">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <h1 className="text-lg font-bold text-white">Engineer Onboarding</h1>
          {inviteData && (
            <p className="text-xs text-white/40 mt-1">
              Setting up account for <span className="text-[#a3e635] font-mono">{inviteData.email}</span>
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_step, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-[#a3e635] text-black' :
                i === step ? 'bg-[#a3e635]/20 text-[#a3e635] border border-[#a3e635]/30' :
                'bg-white/5 text-white/30'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-[#a3e635]' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            {(() => { const Icon = steps[step].icon; return <Icon className="w-5 h-5 text-[#a3e635]" />; })()}
            <div>
              <h2 className="text-sm font-bold text-white">{steps[step].title}</h2>
              <p className="text-[11px] text-white/40">{steps[step].desc}</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mb-3 p-2 bg-red-500/10 rounded-lg">{error}</p>}

          {/* Step 0: Password */}
          {step === 0 && (
            <div className="space-y-3">
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Password (min 8 characters)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
              />
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
              />
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i <= passwordStrength(form.password) ? 'bg-[#a3e635]' : 'bg-white/10'}`} />
                ))}
              </div>
              <p className="text-[10px] text-white/30">8+ chars, uppercase, number, special</p>
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-[10px] text-red-400">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-3">
              <input
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="Full Name"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
              />
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (for on-call alerts)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#a3e635]/50"
              />
              <select
                value={form.timezone}
                onChange={e => setForm({ ...form, timezone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'].map(tz => (
                  <option key={tz} value={tz} className="bg-[#0a0a0f]">{tz}</option>
                ))}
              </select>
              <div>
                <p className="text-[11px] text-white/40 mb-2">Specialization</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALIZATIONS.map(spec => (
                    <button
                      key={spec}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        specialization: prev.specialization.includes(spec)
                          ? prev.specialization.filter(s => s !== spec)
                          : [...prev.specialization, spec]
                      }))}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        form.specialization.includes(spec) ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40 hover:text-white'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: OpsGenie */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">Download OpsGenie to receive on-call alerts on your phone.</p>
              <div className="flex gap-3">
                <a href="https://apps.apple.com/app/opsgenie/id" target="_blank" rel="noopener noreferrer" className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/[0.07] transition-all">
                  <p className="text-xs font-bold text-white">App Store</p>
                  <p className="text-[10px] text-white/30">iOS</p>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.opsgenie.android" target="_blank" rel="noopener noreferrer" className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg text-center hover:bg-white/[0.07] transition-all">
                  <p className="text-xs font-bold text-white">Google Play</p>
                  <p className="text-[10px] text-white/30">Android</p>
                </a>
              </div>
              <p className="text-[10px] text-white/30">You can skip this step and set up OpsGenie later from your settings.</p>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">Review your information before completing setup.</p>
              <div className="space-y-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Email</span>
                  <span className="text-white font-mono">{inviteData?.email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Name</span>
                  <span className="text-white">{form.fullName || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Timezone</span>
                  <span className="text-white">{form.timezone}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Specialization</span>
                  <span className="text-white">{form.specialization.join(', ') || 'None'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-xs text-white/40 hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 && (form.password.length < 8 || form.password !== form.confirmPassword)}
                className="flex items-center gap-1 px-4 py-2 bg-[#a3e635] text-black rounded-lg text-xs font-bold hover:bg-[#a3e635]/90 disabled:opacity-30 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={complete}
                disabled={loading || form.password !== form.confirmPassword || form.password.length < 8 || !form.fullName}
                className="flex items-center gap-1 px-4 py-2 bg-[#a3e635] text-black rounded-lg text-xs font-bold hover:bg-[#a3e635]/90 disabled:opacity-30 transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {loading ? 'Creating account...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
