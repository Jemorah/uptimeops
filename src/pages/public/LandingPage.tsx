// ═══════════════════════════════════════════════════════════════
// LANDING PAGE — UptimeOps
// Hero, features, pricing preview, testimonials, CTA
// ═══════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Zap, Lock, Bot, Eye,
  ChevronRight, Star, CheckCircle, ArrowRight,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goTo = (path: string) => () => navigate(path);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#a3e635]" />
            <span className="text-sm font-black tracking-tight">
              UPTIME<span className="text-[#a3e635]">OPS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goTo('/pricing')} className="text-xs text-white/50 hover:text-white transition-colors">Pricing</button>
            <button onClick={goTo('/status')} className="text-xs text-white/50 hover:text-white transition-colors">Status</button>
            {isAuthenticated ? (
              <Button size="sm" onClick={goTo('/customer')} className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90 text-xs h-8">
                Dashboard
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={goTo('/login')} className="text-white/70 hover:text-white text-xs h-8">
                  Sign In
                </Button>
                <Button size="sm" onClick={goTo('/emergency')} className="bg-red-500 text-white hover:bg-red-600 text-xs h-8">
                  Emergency
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#a3e635]/20 bg-[#a3e635]/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
            <span className="text-xs text-[#a3e635]">AI-Powered Infrastructure Recovery</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
            YOUR SITE IS DOWN.<br />
            <span className="text-[#a3e635]">WE FIX IT.</span>
          </h1>

          <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            UptimeOps combines 6 AI agents with human engineers to detect, diagnose, and repair infrastructure failures in minutes — not hours.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button size="lg" onClick={goTo('/login')} className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90 font-bold px-8">
              Get Protected <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={goTo('/emergency')} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-8">
              Report Emergency
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-lg mx-auto">
            {[
              { value: '< 15 min', label: 'Avg Fix Time' },
              { value: '99.7%', label: 'Success Rate' },
              { value: '6 AI Agents', label: 'Pipeline' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-[#a3e635]">{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-16">The Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Eye, name: 'TRIAGE', color: '#22d3ee', desc: 'Analyze severity' },
              { icon: Server, name: 'ISOLATE', color: '#a3e635', desc: 'Safe VM sandbox' },
              { icon: Bot, name: 'REPAIR', color: '#a855f7', desc: 'Generate fix' },
              { icon: CheckCircle, name: 'VALIDATE', color: '#22d3ee', desc: 'Smoke tests' },
              { icon: Zap, name: 'DEPLOY', color: '#a3e635', desc: 'Apply to prod' },
              { icon: Lock, name: 'AUDIT', color: '#e879f9', desc: 'Log everything' },
            ].map((agent, i) => (
              <div key={agent.name} className="relative group">
                <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] hover:border-white/20 transition-all text-center space-y-3">
                  <agent.icon className="w-6 h-6 mx-auto" style={{ color: agent.color }} />
                  <div>
                    <div className="text-xs font-bold">{agent.name}</div>
                    <div className="text-[10px] text-white/40">{agent.desc}</div>
                  </div>
                </div>
                {i < 5 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 text-white/20">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">Choose Your Protection</h2>
          <p className="text-center text-white/40 text-sm mb-12">Monthly or yearly. Cancel anytime.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Guardian', price: '$99', period: '/mo', incidents: '3', time: '15 min', color: '#22d3ee', featured: false },
              { name: 'Sentinel', price: '$249', period: '/mo', incidents: '10', time: '5 min', color: '#a3e635', featured: true },
              { name: 'Fortress', price: '$599', period: '/mo', incidents: 'Unlimited', time: '2 min', color: '#e879f9', featured: false },
            ].map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 space-y-6 ${plan.featured ? 'border-[#a3e635]/30 bg-[#a3e635]/5' : 'border-white/10 bg-white/[0.02]'}`}
              >
                <div>
                  <h3 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black">{plan.price}</span>
                    <span className="text-sm text-white/40">{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    `${plan.incidents} incidents/month`,
                    `${plan.time} response SLA`,
                    'AI auto-repair',
                    '24/7 monitoring',
                    'Secure credential vault',
                    'Email + dashboard alerts',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <CheckCircle className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full font-bold"
                  style={{
                    backgroundColor: plan.featured ? plan.color : 'transparent',
                    color: plan.featured ? '#000' : plan.color,
                    borderColor: plan.color,
                  }}
                  variant={plan.featured ? 'default' : 'outline'}
                  onClick={goTo('/login')}
                >
                  {plan.featured ? 'Start Free Trial' : 'Choose Plan'}
                </Button>
              </div>
            ))}
          </div>

          {/* One-time fixes */}
          <div className="mt-12 text-center">
            <p className="text-sm text-white/40 mb-4">Not ready for a subscription? Get a one-time fix.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { name: 'Rapid Fix', price: '$99', desc: 'Small issue' },
                { name: 'Critical Fix', price: '$249', desc: 'Site down' },
                { name: 'Catastrophic', price: '$599', desc: 'Full recovery' },
              ].map(fix => (
                <button
                  key={fix.name}
                  onClick={goTo('/emergency')}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left"
                >
                  <div className="text-sm font-bold">{fix.name}</div>
                  <div className="text-xs text-white/40">{fix.price} — {fix.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Trusted By Teams</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Chen', role: 'CTO', company: 'Acme Commerce', text: 'Fixed our hacked store in 22 minutes. Saved our Black Friday weekend.', stars: 5 },
              { name: 'Marcus Webb', role: 'Founder', company: 'StartUpIO', text: 'Average incident resolution went from 6 hours to 18 minutes. The AI auto-fixes are genuinely impressive.', stars: 5 },
              { name: 'Dr. Elena Park', role: 'Director of IT', company: 'HealthPortal', text: 'Zero-knowledge credentials and audit trails gave our security team full confidence.', stars: 5 },
            ].map(t => (
              <div key={t.name} className="border border-white/10 rounded-xl p-5 bg-white/[0.02] space-y-3">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-[#a3e635] fill-[#a3e635]" />
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed">"{t.text}"</p>
                <div className="pt-2 border-t border-white/5">
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-white/40">{t.role}, {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Lock className="w-10 h-10 text-[#a3e635] mx-auto" />
          <h2 className="text-3xl font-black">Zero-Knowledge Security</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Your credentials are encrypted with AES-256-GCM in your browser before they ever reach our servers. We cannot read them. Even our engineers only get temporary, time-limited access.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            {['End-to-end encryption', '7-day auto-expiry', 'SHA-256 audit chain', 'No plain text storage'].map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-black">Ready to never worry about downtime again?</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={goTo('/login')} className="bg-[#a3e635] text-black hover:bg-[#a3e635]/90 font-bold px-8">
              Get Protected Now
            </Button>
            <Button size="lg" variant="outline" onClick={goTo('/emergency')} className="border-white/20 hover:bg-white/5 font-bold px-8">
              I Need Help Now
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#a3e635]" />
            <span className="text-xs font-bold">UPTIME<span className="text-[#a3e635]">OPS</span></span>
          </div>
          <div className="flex gap-6 text-xs text-white/40">
            <button onClick={goTo('/pricing')} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={goTo('/status')} className="hover:text-white transition-colors">Status</button>
            <button onClick={goTo('/login')} className="hover:text-white transition-colors">Sign In</button>
          </div>
          <p className="text-xs text-white/30">2026 UptimeOps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
