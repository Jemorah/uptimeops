// ═══════════════════════════════════════════════════════════════
// CUSTOMER ONBOARDING v2.5 — Subscription Setup Wizard
// 3-step: Welcome → Profile → Tier Selection
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Shield,
  ChevronRight,
  ChevronLeft,
  Crown,
  CreditCard,
  CheckCircle2,
  User,
  ShieldCheck,
  TrendingUp,
  Bot
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TIERS = [
  { id: 'guardian', name: 'Guardian', price: 99, color: '#22d3ee', icon: Shield, features: ['24/7 Monitoring', 'Email Alerts', 'Monthly Reports', '5 Incidents/mo'] },
  { id: 'sentinel', name: 'Sentinel', price: 249, color: '#e879f9', icon: Zap, features: ['Everything in Guardian', 'Priority Response', '42-Scanner Matrix', 'Real-time Dashboard', '20 Incidents/mo'], recommended: true },
  { id: 'fortress', name: 'Fortress', price: 599, color: '#fbbf24', icon: Crown, features: ['Everything in Sentinel', 'Dedicated Coordinator', 'Custom SLA', 'Unlimited Incidents', 'Phone Support'] },
];

export function CustomerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', company: '', phone: '', timezone: 'America/New_York' });
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSkip = () => {
    toast.info('Onboarding skipped. You can subscribe anytime from Billing.');
    navigate('/customer');
  };

  const handleComplete = () => {
    toast.success(`Welcome to UptimeOps! Your ${selectedTier} subscription is being processed.`);
    navigate('/customer');
  };

  const steps = [
    { label: 'Welcome', icon: Zap },
    { label: 'Profile', icon: User },
    { label: 'Subscribe', icon: CreditCard },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-8">
      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === step ? 'bg-lime/20 border border-lime' : i < step ? 'bg-lime/10 border border-lime/50' : 'bg-white/5 border border-white/10'}`}>
                <Icon className="w-3.5 h-3.5" style={{ color: i <= step ? '#a3e635' : 'rgba(255,255,255,0.3)' }} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${i === step ? 'text-lime' : 'text-white/30'}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-lime/50' : 'bg-white/10'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="max-w-lg w-full bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-lime/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime/20">
            <Zap className="w-8 h-8 text-lime" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Welcome to UptimeOps</h2>
          <p className="text-xs text-white/40 mb-6">Your infrastructure never sleeps. Neither do we. Powered by 6 autonomous AI agents and a 42-scanner zero-trust security matrix.</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Bot, label: '6 AI Agents', desc: 'Autonomous pipeline' },
              { icon: ShieldCheck, label: '42 Scanners', desc: 'Zero-trust matrix' },
              { icon: TrendingUp, label: '99.7%', desc: 'Success rate' },
            ].map(f => (
              <div key={f.label} className="bg-white/[0.03] rounded-lg p-3">
                <f.icon className="w-5 h-5 text-lime mx-auto mb-1" />
                <p className="text-[10px] font-bold text-white/70">{f.label}</p>
                <p className="text-[8px] text-white/30">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-lime text-black rounded-lg text-sm font-black hover:bg-lime/90 transition-all">Get Started</button>
            <button onClick={handleSkip} className="px-4 py-3 bg-white/5 text-white/40 rounded-lg text-sm font-bold hover:bg-white/10 transition-all">Decide Later</button>
          </div>
        </div>
      )}

      {/* Step 1: Profile */}
      {step === 1 && (
        <div className="max-w-lg w-full bg-white/[0.02] border border-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-black text-white">Set Up Your Profile</h2>
          <div className="grid gap-3">
            <div><label className="text-[10px] text-white/30 mb-1 block">Full Name</label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className="bg-black/30 border-white/10 text-white text-xs" /></div>
            <div><label className="text-[10px] text-white/30 mb-1 block">Company</label><Input value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" className="bg-black/30 border-white/10 text-white text-xs" /></div>
            <div><label className="text-[10px] text-white/30 mb-1 block">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="bg-black/30 border-white/10 text-white text-xs" /></div>
            <div><label className="text-[10px] text-white/30 mb-1 block">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-black/30 border border-white/10 text-white text-xs px-3 py-2 rounded focus:border-lime/30 outline-none">
                <option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option><option>UTC</option><option>Europe/London</option><option>Asia/Tokyo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(0)} className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10 transition-all"><ChevronLeft className="w-3 h-3 inline" /> Back</button>
            <button onClick={() => setStep(2)} className="flex-1 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all">Continue <ChevronRight className="w-3 h-3 inline" /></button>
          </div>
        </div>
      )}

      {/* Step 2: Tier Selection */}
      {step === 2 && (
        <div className="max-w-3xl w-full">
          <h2 className="text-lg font-black text-white text-center mb-4">Choose Your Protection Level</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {TIERS.map(tier => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative bg-white/[0.02] border rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.04] ${isSelected ? 'border-lime/30 ring-1 ring-lime/20' : 'border-white/5'}`}
                >
                  {tier.recommended && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase px-2 py-0.5 bg-lime text-black rounded-full">Recommended</span>}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${tier.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: tier.color }} />
                  </div>
                  <h3 className="text-sm font-black text-white mb-0.5">{tier.name}</h3>
                  <p className="text-lg font-black mb-3" style={{ color: tier.color }}>${tier.price}<span className="text-xs text-white/30">/mo</span></p>
                  <div className="space-y-1">
                    {tier.features.map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <CheckCircle2 className="w-3 h-3 text-lime" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10 transition-all"><ChevronLeft className="w-3 h-3 inline" /> Back</button>
            <button onClick={handleSkip} className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Skip for Now</button>
            <button onClick={selectedTier ? handleComplete : () => toast.error('Select a tier')} className="flex-1 py-2 bg-lime text-black rounded-lg text-xs font-black hover:bg-lime/90 transition-all disabled:opacity-50">
              {selectedTier ? 'Subscribe & Continue' : 'Select a Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
