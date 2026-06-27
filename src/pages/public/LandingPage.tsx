// ═══════════════════════════════════════════════════════════════
// LANDING PAGE — UptimeOps
// Hero, pipeline showcase, testimonials, security, CTA
// ═══════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Zap, Lock, Bot, Eye,
  ChevronRight, Star, ArrowRight,
  Server, Shield, Activity, BarChart3, FileCheck,
  Globe, Clock, Fingerprint, Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PIPELINE_STEPS = [
  {
    icon: Eye,
    name: 'TRIAGE',
    color: '#22d3ee',
    tagline: 'Instant Severity Assessment',
    description: 'Our AI continuously monitors your infrastructure 24/7. When an anomaly is detected, it immediately classifies severity from P4 (low) to P1 (critical) by analyzing error rates, user impact, and system dependencies. Every incident is tagged, prioritized, and routed to the right specialist within seconds.',
  },
  {
    icon: Server,
    name: 'ISOLATE',
    color: '#a3e635',
    tagline: 'Sandboxed VM Environment',
    description: 'Before any repair touches production, we spin up an isolated sandbox VM that mirrors your exact stack. Your credentials are encrypted client-side with AES-256-GCM — we never see them in plain text. Engineers get time-bounded, audit-trailed access so your production environment stays protected.',
  },
  {
    icon: Bot,
    name: 'REPAIR',
    color: '#a855f7',
    tagline: 'AI-Generated Code Fixes',
    description: 'Our repair agent analyzes logs, stack traces, and configuration drift to generate a targeted fix — whether it is a misconfigured NGINX rule, a broken database migration, a compromised dependency, or a DNS failure. Complex issues are escalated to human engineers who collaborate through secure ephemeral sessions.',
  },
  {
    icon: FileCheck,
    name: 'VALIDATE',
    color: '#22d3ee',
    tagline: 'Automated Smoke Testing',
    description: 'Every fix undergoes rigorous automated validation before it reaches your users. We run health checks, endpoint tests, synthetic transactions, and dependency verification in the sandbox. Only when all tests pass with 100% confidence does the fix proceed to deployment approval.',
  },
  {
    icon: Zap,
    name: 'DEPLOY',
    color: '#a3e635',
    tagline: 'Zero-Downtime Rollout',
    description: 'Approved fixes are deployed using blue-green or rolling strategies to eliminate downtime. Database changes are run through migration safety checks. SSL certificates, CDN caches, and load balancers are warmed and verified. If anything fails, instant rollback triggers automatically.',
  },
  {
    icon: Shield,
    name: 'AUDIT',
    color: '#e879f9',
    tagline: 'Full Compliance Trail',
    description: 'Every action — every credential access, every command run, every file changed — is logged with SHA-256 integrity hashing and written to immutable storage. You get a complete forensic trail for SOC 2, ISO 27001, GDPR, and HIPAA compliance. Download reports or stream them to your SIEM in real time.',
  },
];

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
            UptimeOps combines 6 AI agents with human engineers to detect, diagnose, and repair infrastructure failures — before your customers notice.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-2xl mx-auto">
            {[
              { value: '< 2h', label: 'Avg Fix Time' },
              { value: '99.7%', label: 'Success Rate' },
              { value: '6 AI Agents', label: 'Pipeline' },
              { value: '24/7', label: 'Coverage' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-[#a3e635]">{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">The 6-Agent Repair Pipeline</h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              From detection to deployment, every incident flows through a chain of specialized AI agents — each with a single responsibility, working together to get you back online.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={step.name}
                className="group relative border border-white/10 rounded-2xl p-6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
              >
                {/* Step number */}
                <div className="absolute -top-3 -left-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ color: step.color, borderColor: `${step.color}30`, backgroundColor: `${step.color}10` }}
                  >
                    STEP {i + 1}
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ borderColor: `${step.color}30`, backgroundColor: `${step.color}10` }}
                    >
                      <step.icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-wide">{step.name}</div>
                      <div className="text-xs" style={{ color: step.color }}>{step.tagline}</div>
                    </div>
                  </div>

                  <p className="text-sm text-white/50 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Connector arrow (hidden on last item and mobile) */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (Process overview) ── */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Three Steps to Recovery</h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              No lengthy onboarding. No complex configuration. Get protected in under 60 seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: '1. Connect Your Stack',
                desc: 'Add your domain and select your infrastructure — AWS, GCP, Azure, DigitalOcean, on-prem, or multi-cloud. No agent installation required.',
                color: '#22d3ee',
              },
              {
                icon: Fingerprint,
                title: '2. Secure Credential Vault',
                desc: 'Your access keys are encrypted in your browser before reaching our servers. We use zero-knowledge architecture — we cannot read your credentials, ever.',
                color: '#a3e635',
              },
              {
                icon: Activity,
                title: '3. We Watch & Fix',
                desc: 'Our AI monitors continuously. When something breaks, the pipeline triggers automatically. You get notified when it is resolved — usually within the hour.',
                color: '#e879f9',
              },
            ].map(item => (
              <div key={item.title} className="text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border mx-auto"
                  style={{ borderColor: `${item.color}30`, backgroundColor: `${item.color}10` }}
                >
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Built for Serious Infrastructure</h2>
            <p className="text-white/40 max-w-xl mx-auto text-sm">
              Every feature is designed for teams who cannot afford downtime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: '< 2h Average Fix', desc: 'From alert to resolution, most incidents are fully repaired and deployed within 2 hours.' },
              { icon: Radio, title: 'Real-Time Monitoring', desc: 'Sub-minute detection with synthetic checks, log analysis, and anomaly detection across your stack.' },
              { icon: Lock, title: 'Zero-Knowledge Vault', desc: 'AES-256-GCM client-side encryption. We literally cannot read your credentials.' },
              { icon: BarChart3, title: 'Full Audit Trail', desc: 'SHA-256 hashed logs of every action. Export for SOC 2, ISO 27001, HIPAA compliance.' },
              { icon: Shield, title: 'Sandboxed Repairs', desc: 'All fixes are developed and tested in isolated VMs before touching production.' },
              { icon: Zap, title: 'Auto-Rollback', desc: 'If a deployment fails health checks, we automatically roll back to the last known good state.' },
            ].map(f => (
              <div key={f.title} className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:border-white/20 transition-all space-y-3">
                <f.icon className="w-5 h-5 text-[#a3e635]" />
                <h3 className="text-sm font-bold">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Trusted By Teams</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Chen', role: 'CTO', company: 'Acme Commerce', text: 'Fixed our hacked store in 22 minutes. Saved our Black Friday weekend. The audit trail made compliance review a breeze.', stars: 5 },
              { name: 'Marcus Webb', role: 'Founder', company: 'StartUpIO', text: 'Average incident resolution went from 6 hours to under 2 hours. The AI auto-fixes are genuinely impressive — it caught a DNS misconfig we missed for days.', stars: 5 },
              { name: 'Dr. Elena Park', role: 'Director of IT', company: 'HealthPortal', text: 'Zero-knowledge credentials and immutable audit trails gave our security team full confidence. HIPAA compliance has never been easier.', stars: 5 },
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
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Lock className="w-10 h-10 text-[#a3e635] mx-auto" />
          <h2 className="text-3xl md:text-4xl font-black">Zero-Knowledge Security</h2>
          <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
            Your credentials are encrypted with AES-256-GCM in your browser before they ever reach our servers. We cannot read them. Even our engineers only get temporary, time-limited access through encrypted vaults.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            {['End-to-end encryption', '7-day auto-expiry', 'SHA-256 audit chain', 'No plain text storage', 'SOC 2 Type II ready'].map(s => (
              <span key={s} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="py-24 px-4 border-t border-white/5">
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
            <button onClick={goTo('/status')} className="hover:text-white transition-colors">Status</button>
            <button onClick={goTo('/login')} className="hover:text-white transition-colors">Sign In</button>
          </div>
          <p className="text-xs text-white/30">2026 UptimeOps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
