// ═══════════════════════════════════════════════════════════════
// LANDING PAGE — Main lead generation page
// Hero | Problem | Solution | AI+Human | Security | Testimonials | Lead Form | Footer
// GSAP ScrollTrigger animations throughout
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Flame, Shield, Zap, ArrowRight, Clock, Lock,
  Bot, Users, Eye, ChevronRight, Star, CheckCircle,
  TrendingUp, Globe, FileText, Mail,
  Phone, Twitter, Linkedin, Github, Scan, Wrench,
  Rocket, Server, Fingerprint, X, Activity,
  Radio, CreditCard, Sparkles, HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

// ── TESTIMONIALS ──
const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'Acme Commerce',
    photo: 'SC',
    text: "Fixed our hacked WooCommerce store in 22 minutes. Saved our Black Friday weekend. We went from panic to sales in under an hour. Incredible response time.",
    stars: 5,
    tier: 'Catastrophic Fix',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
  {
    name: 'Marcus Webb',
    role: 'Founder',
    company: 'StartUpIO',
    photo: 'MW',
    text: "We switched from a traditional managed host to UptimeOps Sentinel. Our average incident resolution went from 6 hours to 18 minutes. The AI auto-fixes are genuinely impressive.",
    stars: 5,
    tier: 'Sentinel',
    color: 'text-lime',
    bg: 'bg-lime/10',
  },
  {
    name: 'Dr. Elena Park',
    role: 'Director of IT',
    company: 'HealthPortal Medical',
    photo: 'EP',
    text: "HIPAA compliance was our biggest concern. The zero-knowledge credential system and audit trails gave our security team full confidence. Worth every penny for the Fortress tier.",
    stars: 5,
    tier: 'Fortress',
    color: 'text-magenta',
    bg: 'bg-magenta/10',
  },
  {
    name: 'James Okafor',
    role: 'Lead Developer',
    company: 'BetaShop',
    photo: 'JO',
    text: "Our checkout API went down during a flash sale. UptimeOps had a fix deployed and verified within 35 minutes. The 72-hour temporary dashboard was incredibly transparent.",
    stars: 5,
    tier: 'Critical Fix',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
  {
    name: 'Priya Sharma',
    role: 'Marketing Director',
    company: 'LocalServices Pro',
    photo: 'PS',
    text: "Guardian tier pays for itself. We had two incidents last month that were caught and fixed before any customers noticed. The monthly health reports are genuinely useful.",
    stars: 5,
    tier: 'Guardian',
    color: 'text-cyan',
    bg: 'bg-cyan/10',
  },
];

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const hybridRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.from('.hero-headline', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
      gsap.from('.hero-sub', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.5 });
      gsap.from('.hero-cta', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15, delay: 0.8 });
      gsap.from('.hero-trust', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 1.2 });
      gsap.from('.hero-dashboard', { x: 60, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.6 });

      // Scroll-triggered sections
      const sections = [
        { ref: problemRef, cls: '.problem-animate' },
        { ref: solutionRef, cls: '.solution-animate' },
        { ref: hybridRef, cls: '.hybrid-animate' },
        { ref: securityRef, cls: '.security-animate' },
        { ref: testimonialsRef, cls: '.testimonial-animate' },
        { ref: leadRef, cls: '.lead-animate' },
      ];

      sections.forEach(({ ref, cls }) => {
        if (!ref.current) return;
        gsap.from(cls, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: ref.current, start: 'top 80%', toggleActions: 'play none none none' },
        });
      });

      // Problem counter animation
      gsap.from('.stat-number', {
        textContent: 0,
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        stagger: 0.2,
        scrollTrigger: { trigger: problemRef.current, start: 'top 70%' },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen">

      {/* ═══════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="hero-headline">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-400/10 border border-red-400/20 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                  <Radio className="w-3 h-3 animate-pulse" />
                  24/7 Emergency Response Active
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                  Your Website Is{' '}
                  <span className="text-red-400">Down.</span>
                  <br />
                  We Fix It Before Your{' '}
                  <span className="text-lime">Customers Notice.</span>
                </h1>
              </div>

              <p className="hero-sub text-white/50 text-base sm:text-lg mt-6 max-w-lg leading-relaxed">
                AI-powered emergency repair + 24/7 security monitoring.
                Zero-knowledge credentials. Human engineers on standby.
                <span className="block mt-2 text-white/30 text-sm">
                  Average fix time: 18 minutes. 2,000+ sites saved. 95% AI success rate.
                </span>
              </p>

              <div className="hero-cta flex flex-col sm:flex-row gap-3 mt-8">
                <Link to="/emergency">
                  <Button className="w-full sm:w-auto bg-red-400 hover:bg-red-400/90 text-void font-black uppercase tracking-wider px-8 py-6 text-sm">
                    <Flame className="w-4 h-4 mr-2" />
                    Get Emergency Fix — $149
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:border-lime hover:text-lime bg-transparent font-bold uppercase tracking-wider px-8 py-6 text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    See Pricing &amp; Protect My Site
                  </Button>
                </Link>
              </div>

              {/* Trust Bar */}
              <div className="hero-trust mt-10 pt-6 border-t border-white/5">
                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-4">Trusted by 2,000+ businesses worldwide</p>
                <div className="flex items-center gap-6 flex-wrap">
                  {['Shopify', 'Stripe', 'Vercel', 'Notion', 'Figma'].map(name => (
                    <span key={name} className="text-sm font-bold text-white/15 hover:text-white/30 transition-colors cursor-default select-none">{name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Animated Dashboard Mockup */}
            <div className="hero-dashboard relative">
              <div className="bg-surface border border-white/10 shadow-2xl shadow-black/50">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-red-400 uppercase">Live Fix In Progress</span>
                    <span className="text-[10px] text-white/20 font-mono">ESC-2049</span>
                  </div>
                  <span className="text-[10px] text-white/20 font-mono">acme-corp.com</span>
                </div>

                {/* Agent Pipeline */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-lime" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">AI Pipeline Status</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { name: 'TRIAGE', status: 'done', icon: Scan },
                      { name: 'ISOLATE', status: 'done', icon: Server },
                      { name: 'REPAIR', status: 'done', icon: Wrench },
                      { name: 'VALIDATE', status: 'active', icon: CheckCircle },
                      { name: 'DEPLOY', status: 'pending', icon: Rocket },
                      { name: 'AUDIT', status: 'pending', icon: FileText },
                    ].map((agent) => (
                      <div key={agent.name} className={`border p-2 text-center ${
                        agent.status === 'done' ? 'border-lime/30 bg-lime/5' :
                        agent.status === 'active' ? 'border-cyan/30 bg-cyan/5' :
                        'border-white/5 bg-white/[0.02]'
                      }`}>
                        <agent.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${
                          agent.status === 'done' ? 'text-lime' :
                          agent.status === 'active' ? 'text-cyan animate-pulse' :
                          'text-white/15'
                        }`} />
                        <span className={`text-[8px] font-bold ${
                          agent.status === 'done' ? 'text-lime' :
                          agent.status === 'active' ? 'text-cyan' :
                          'text-white/15'
                        }`}>{agent.name}</span>
                        {agent.status === 'active' && (
                          <div className="w-full h-0.5 bg-white/10 mt-1.5 overflow-hidden">
                            <div className="h-full bg-cyan animate-[shimmer_1.5s_infinite]" style={{ width: '60%' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Live Log */}
                  <div className="mt-4 bg-black/20 border border-white/5 p-3 font-mono text-[10px] space-y-1">
                    <div className="text-lime">[14:32:05] TRIAGE: Classified as P1_CRITICAL — database connection pool</div>
                    <div className="text-lime">[14:32:15] ISOLATE: VM sandbox-7f3a9e2d spawned, credentials injected</div>
                    <div className="text-lime">[14:35:00] REPAIR: Patched class-checkout.php line 142</div>
                    <div className="text-cyan animate-pulse">[14:38:22] VALIDATE: Running smoke tests (3/8)...</div>
                    <div className="text-white/10">[14:40:00] DEPLOY: Awaiting coordinator approval</div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[
                      { label: 'Response', value: '<60s', color: 'text-cyan' },
                      { label: 'Fix Time', value: '18m', color: 'text-lime' },
                      { label: 'Confidence', value: '94%', color: 'text-green-400' },
                      { label: 'Cost', value: '$3.42', color: 'text-yellow-400' },
                    ].map(m => (
                      <div key={m.label} className="bg-black/10 p-2 text-center border border-white/5">
                        <div className={`text-sm font-black font-mono ${m.color}`}>{m.value}</div>
                        <div className="text-[8px] text-white/20 uppercase">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-surface border border-lime/20 px-3 py-2 shadow-lg animate-[float_3s_ease-in-out_infinite]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-lime" />
                  <span className="text-[10px] font-bold text-lime">Fixed in 22m</span>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 bg-surface border border-cyan/20 px-3 py-2 shadow-lg animate-[float_4s_ease-in-out_infinite_0.5s]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-cyan" />
                  <span className="text-[10px] font-bold text-cyan">Zero-knowledge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PROBLEM AGITATION
      ═══════════════════════════════════════════════ */}
      <section ref={problemRef} className="py-20 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="problem-animate text-center mb-16">
            <span className="text-red-400 text-xs font-mono uppercase tracking-widest">The Problem</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4">
              Every Minute Down Costs You{' '}
              <span className="text-red-400">Everything</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: CreditCard, number: '$5,600', suffix: '/minute', label: 'Average Downtime Cost', desc: 'For mid-sized e-commerce sites. Enterprise losses can exceed $300K/hour.', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
              { icon: Users, number: '43%', suffix: '', label: 'Visitors Never Return', desc: 'After a bad experience with a down site. Customer trust is hard to rebuild.', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
              { icon: TrendingUp, number: '72h', suffix: '', label: 'Average Freelancer Response', desc: 'DIY fixes often make things worse. Agencies take 24-72 hours to even acknowledge.', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
            ].map(stat => (
              <div key={stat.label} className="problem-animate bg-surface border border-white/5 p-6">
                <stat.icon className={`w-8 h-8 ${stat.color} mb-4`} />
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`stat-number text-4xl font-black font-mono ${stat.color}`}>{stat.number}</span>
                  {stat.suffix && <span className="text-white/30 text-sm">{stat.suffix}</span>}
                </div>
                <h3 className="text-sm font-bold text-white/70 mb-1">{stat.label}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{stat.desc}</p>
              </div>
            ))}
          </div>

          <div className="problem-animate mt-12 text-center">
            <p className="text-lg text-white/40 italic">
              &ldquo;DIY fixes often make it worse. Freelancers take hours to respond.
              <br className="hidden sm:block" />
              Managed hosts? They monitor. They don&apos;t <span className="text-white/60 font-bold">repair.</span>&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SOLUTION SECTION — 4-Step Timeline
      ═══════════════════════════════════════════════ */}
      <section ref={solutionRef} className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="solution-animate text-center mb-16">
            <span className="text-lime text-xs font-mono uppercase tracking-widest">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4">
              From <span className="text-red-400">Broken</span> to{' '}
              <span className="text-lime">Fixed</span> in 4 Steps
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-white/10" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: '01', icon: FileText, title: 'Report', time: '30 seconds', desc: 'Fill a short form with your website URL and a description of the problem. Submit your credentials — encrypted in your browser before they ever leave your device.', color: 'text-cyan', bg: 'bg-cyan/10', border: 'border-cyan/30' },
                { step: '02', icon: Server, title: 'Isolate', time: '< 2 minutes', desc: 'Our AI spawns a secure isolated VM and creates an exact clone of your site. Your live site remains untouched. All work happens in a sandbox.', color: 'text-purple-400', bg: 'bg-purple/10', border: 'border-purple/30' },
                { step: '03', icon: Wrench, title: 'Repair', time: '10-30 minutes', desc: '6 AI agents work in sequence: Triage, Isolate, Repair, Validate, Deploy, Audit. 95% of issues are resolved by AI alone. Complex cases escalate to human engineers.', color: 'text-lime', bg: 'bg-lime/10', border: 'border-lime/30' },
                { step: '04', icon: CheckCircle, title: 'Verify', time: '5 minutes', desc: 'You confirm the fix works from your 72-hour temporary dashboard. We deploy to production. You get a full audit trail. Credentials are purged. Done.', color: 'text-green-400', bg: 'bg-green/10', border: 'border-green/30' },
              ].map((s, i) => (
                <div key={s.step} className="solution-animate relative">
                  <div className={`${s.bg} border ${s.border} p-6 h-full`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-3xl font-black font-mono ${s.color} opacity-30`}>{s.step}</span>
                      <div className={`w-10 h-10 flex items-center justify-center border ${s.border} ${s.bg}`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                    </div>
                    <h3 className={`text-lg font-black ${s.color} mb-1`}>{s.title}</h3>
                    <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{s.time}</span>
                    <p className="text-xs text-white/40 mt-3 leading-relaxed">{s.desc}</p>
                  </div>
                  {/* Arrow (except last) */}
                  {i < 3 && (
                    <div className="hidden lg:flex absolute -right-4 top-16 z-10 w-8 h-8 bg-void border border-white/10 items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          AI + HUMAN HYBRID
      ═══════════════════════════════════════════════ */}
      <section ref={hybridRef} className="py-20 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hybrid-animate text-center mb-14">
            <span className="text-lime text-xs font-mono uppercase tracking-widest">AI + Human</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4">
              Our AI Handles the{' '}
              <span className="text-lime">Routine.</span>
              <br />
              Our Engineers Handle the{' '}
              <span className="text-cyan">Complex.</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* AI Card */}
            <div className="hybrid-animate bg-surface border border-lime/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-lime/10 border border-lime/30 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-lime" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-lime">AI-Powered</h3>
                  <span className="text-[10px] text-white/30 font-mono uppercase">6-Agent Multi-System</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  'ANTIGRAVITY SDK — Custom orchestration layer',
                  'Claude 4 Sonnet — Reasoning & analysis',
                  'Jules — Code execution & validation',
                  '6 specialized agents: TRIAGE → ISOLATE → REPAIR → VALIDATE → DEPLOY → AUDIT',
                  'Chain-of-thought verification before every deploy',
                  'Automatic rollback on any smoke test failure',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5 text-xs text-white/50">
                    <Zap className="w-3.5 h-3.5 text-lime flex-shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/20 p-3 text-center border border-lime/10">
                  <div className="text-lg font-black font-mono text-lime">95%</div>
                  <div className="text-[9px] text-white/20 uppercase">AI Success</div>
                </div>
                <div className="bg-black/20 p-3 text-center border border-lime/10">
                  <div className="text-lg font-black font-mono text-lime">18m</div>
                  <div className="text-[9px] text-white/20 uppercase">Avg Fix</div>
                </div>
                <div className="bg-black/20 p-3 text-center border border-lime/10">
                  <div className="text-lg font-black font-mono text-lime">$3.42</div>
                  <div className="text-[9px] text-white/20 uppercase">Avg Cost</div>
                </div>
              </div>
            </div>

            {/* Human Card */}
            <div className="hybrid-animate bg-surface border border-cyan/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-cyan/10 border border-cyan/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-cyan">Human Engineers</h3>
                  <span className="text-[10px] text-white/30 font-mono uppercase">On-Call 24/7/365</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  'Average 12 years of production experience',
                  'Escalation triggers: <90% confidence, P1 critical, security findings',
                  'Coordinator approval gate on every deployment',
                  'Shift handoff notes for continuity',
                  'Real-time chat with customers during fixes',
                  'Pre-approved communication templates for updates',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5 text-xs text-white/50">
                    <Users className="w-3.5 h-3.5 text-cyan flex-shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/20 p-3 text-center border border-cyan/10">
                  <div className="text-lg font-black font-mono text-cyan">&lt;5m</div>
                  <div className="text-[9px] text-white/20 uppercase">Escalation</div>
                </div>
                <div className="bg-black/20 p-3 text-center border border-cyan/10">
                  <div className="text-lg font-black font-mono text-cyan">12yr</div>
                  <div className="text-[9px] text-white/20 uppercase">Avg Exp</div>
                </div>
                <div className="bg-black/20 p-3 text-center border border-cyan/10">
                  <div className="text-lg font-black font-mono text-cyan">24/7</div>
                  <div className="text-[9px] text-white/20 uppercase">Coverage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECURITY TRUST SECTION
      ═══════════════════════════════════════════════ */}
      <section ref={securityRef} className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="security-animate text-center mb-14">
            <span className="text-cyan text-xs font-mono uppercase tracking-widest">Security</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4">
              We Can&apos;t Steal What{' '}
              <span className="text-cyan">We Can&apos;t See</span>
            </h2>
            <p className="text-white/40 mt-4 max-w-xl mx-auto">
              Zero-knowledge credential encryption. Your credentials never touch our servers in plaintext.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Diagram */}
            <div className="security-animate bg-surface border border-white/10 p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Step 1: Browser */}
                <div className="w-full bg-cyan/5 border border-cyan/20 p-4 text-center">
                  <Globe className="w-6 h-6 text-cyan mx-auto mb-2" />
                  <span className="text-xs font-bold text-cyan">Your Browser</span>
                  <p className="text-[10px] text-white/30 mt-1">Credentials encrypted with AES-256-GCM</p>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-lime" />
                  <span className="text-[9px] text-lime font-mono uppercase">Encrypted Payload Only</span>
                </div>
                {/* Step 2: Our Server */}
                <div className="w-full bg-white/[0.02] border border-white/10 p-4 text-center opacity-50">
                  <Server className="w-6 h-6 text-white/30 mx-auto mb-2" />
                  <span className="text-xs font-bold text-white/30">UptimeOps Server</span>
                  <p className="text-[10px] text-white/20 mt-1">Stores only cryptographic fingerprint — NOT credentials</p>
                </div>
                <div className="flex items-center gap-1">
                  <Fingerprint className="w-3 h-3 text-yellow-400" />
                  <span className="text-[9px] text-yellow-400 font-mono uppercase">Fingerprint + Hash Only</span>
                </div>
                {/* Step 3: Isolated VM */}
                <div className="w-full bg-lime/5 border border-lime/20 p-4 text-center">
                  <HardDrive className="w-6 h-6 text-lime mx-auto mb-2" />
                  <span className="text-xs font-bold text-lime">Isolated VM (sandbox-*)</span>
                  <p className="text-[10px] text-white/30 mt-1">Key relayed via one-time secure channel</p>
                </div>
                <div className="flex items-center gap-1">
                  <X className="w-3 h-3 text-red-400" />
                  <span className="text-[9px] text-red-400 font-mono uppercase">Auto-Purged After Fix</span>
                </div>
                {/* Step 4: Gone */}
                <div className="w-full bg-red-400/5 border border-red-400/10 p-4 text-center">
                  <TrashIcon className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-red-400">Zero Residual Access</span>
                  <p className="text-[10px] text-white/20 mt-1">Credentials destroyed. Key erased. No trace.</p>
                </div>
              </div>
            </div>

            {/* Security Points */}
            <div className="space-y-4">
              {[
                { icon: Lock, title: 'Client-Side Encryption', desc: 'AES-256-GCM encryption happens in YOUR browser. We never receive plaintext credentials.', color: 'text-cyan' },
                { icon: Eye, title: 'We Never See Your Passwords', desc: 'The encryption key never leaves your session. We cannot decrypt your credentials even if we wanted to.', color: 'text-lime' },
                { icon: Clock, title: 'Revoke Access Instantly', desc: 'One click revokes credentials. The isolated VM loses access immediately. No questions asked.', color: 'text-orange-400' },
                { icon: Shield, title: 'Isolated VM per Incident', desc: 'Every fix runs in a freshly spawned, isolated sandbox. No shared environments. No cross-contamination.', color: 'text-purple-400' },
                { icon: FileText, title: 'Full Audit Trail', desc: 'Every action logged. Every file change tracked. Every access recorded. Compliance-ready reports.', color: 'text-green-400' },
              ].map(point => (
                <div key={point.title} className="security-animate flex items-start gap-4 p-4 bg-surface border border-white/5 hover:border-white/10 transition-colors">
                  <point.icon className={`w-5 h-5 ${point.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-sm font-bold ${point.color}`}>{point.title}</h4>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              ))}

              {/* Compliance Badges */}
              <div className="security-animate flex flex-wrap gap-2 pt-4">
                {['SOC 2 Type II (In Progress)', 'GDPR Ready', 'CCPA Compliant', 'ISO 27001 Aligned'].map(badge => (
                  <span key={badge} className="px-3 py-1.5 bg-white/5 border border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════ */}
      <section ref={testimonialsRef} className="py-20 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="testimonial-animate text-center mb-14">
            <span className="text-lime text-xs font-mono uppercase tracking-widest">Social Proof</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-4">
              2,000+ Sites{' '}
              <span className="text-lime">Saved.</span>{' '}
              Countless Businesses{' '}
              <span className="text-cyan">Protected.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.slice(0, 3).map(t => (
              <div key={t.name} className="testimonial-animate bg-surface border border-white/5 p-6 flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/50 leading-relaxed flex-1 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                  <div className={`w-9 h-9 flex items-center justify-center text-xs font-bold ${t.bg} ${t.color} border border-white/10`}>
                    {t.photo}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/70">{t.name}</div>
                    <div className="text-[10px] text-white/30">{t.role}, {t.company}</div>
                  </div>
                  <span className={`ml-auto text-[9px] font-bold uppercase px-2 py-0.5 border ${t.bg} ${t.color}`}>{t.tier}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Extra 2 testimonials in a wider row */}
          <div className="grid md:grid-cols-2 gap-6 mt-6 max-w-4xl mx-auto">
            {TESTIMONIALS.slice(3).map(t => (
              <div key={t.name} className="testimonial-animate bg-surface border border-white/5 p-6 flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/50 leading-relaxed flex-1 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
                  <div className={`w-9 h-9 flex items-center justify-center text-xs font-bold ${t.bg} ${t.color} border border-white/10`}>
                    {t.photo}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/70">{t.name}</div>
                    <div className="text-[10px] text-white/30">{t.role}, {t.company}</div>
                  </div>
                  <span className={`ml-auto text-[9px] font-bold uppercase px-2 py-0.5 border ${t.bg} ${t.color}`}>{t.tier}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          LEAD CAPTURE FORM
      ═══════════════════════════════════════════════ */}
      <section ref={leadRef} className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lead-animate bg-surface border border-lime/20 p-8 lg:p-12">
            {!submitted ? (
              <>
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-lime/10 border border-lime/20 text-lime text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Sparkles className="w-3 h-3" />
                    Free Security Scan
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Not Ready to Buy?{' '}
                    <span className="text-lime">Get a Free Scan.</span>
                  </h2>
                  <p className="text-sm text-white/40 mt-3">
                    We&apos;ll scan your site for vulnerabilities, SSL health, plugin issues, and performance problems.
                    You get a full report via email — no credit card required.
                  </p>
                </div>

                <form
                  onSubmit={e => { e.preventDefault(); setSubmitted(true); }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      className="w-full bg-black/30 border border-white/10 text-sm text-white/70 px-4 py-3 outline-none focus:border-lime/30 transition-colors placeholder:text-white/15"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Website URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://your-website.com"
                      className="w-full bg-black/30 border border-white/10 text-sm text-white/70 px-4 py-3 outline-none focus:border-lime/30 transition-colors placeholder:text-white/15"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">What&apos;s your biggest website fear?</label>
                    <textarea
                      rows={3}
                      placeholder="e.g., Getting hacked during a sale, database corruption, plugin conflicts..."
                      className="w-full bg-black/30 border border-white/10 text-sm text-white/70 px-4 py-3 outline-none focus:border-lime/30 transition-colors resize-none placeholder:text-white/15"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-lime hover:bg-lime/90 text-void font-black uppercase tracking-wider py-6 text-sm">
                    <Scan className="w-4 h-4 mr-2" />
                    Get My Free Scan
                  </Button>
                  <p className="text-[10px] text-white/15 text-center">
                    No spam. Unsubscribe anytime. We respect your privacy. — UptimeOps Team
                  </p>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-lime mx-auto mb-4" />
                <h3 className="text-xl font-black text-lime mb-2">Scan Requested</h3>
                <p className="text-sm text-white/50">
                  We&apos;re analyzing your site now. Check your inbox in the next 5-10 minutes for your full security report.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Link to="/pricing" className="text-xs text-cyan hover:text-cyan/70 font-bold uppercase">
                    View Pricing
                  </Link>
                  <span className="text-white/10">|</span>
                  <Link to="/emergency" className="text-xs text-red-400 hover:text-red-400/70 font-bold uppercase">
                    Emergency Fix
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-lime" />
                <span className="font-black tracking-tight text-sm">UPTIME<span className="text-white/40">OPS</span></span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed mb-4">
                AI-powered emergency repair + 24/7 security monitoring for websites that cannot afford downtime.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="text-white/20 hover:text-lime transition-colors"><Twitter className="w-4 h-4" /></a>
                <a href="#" className="text-white/20 hover:text-lime transition-colors"><Linkedin className="w-4 h-4" /></a>
                <a href="#" className="text-white/20 hover:text-lime transition-colors"><Github className="w-4 h-4" /></a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2">
                {['Pricing', 'Emergency Fix', 'How It Works', 'Security', 'API Docs'].map(link => (
                  <li key={link}>
                    <Link to={link === 'Pricing' ? '/pricing' : link === 'Emergency Fix' ? '/emergency' : '/'} className="text-xs text-white/30 hover:text-lime transition-colors">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact', 'Status Page'].map(link => (
                  <li key={link}>
                    <span className="text-xs text-white/30 hover:text-lime transition-colors cursor-pointer">{link}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Security Whitepaper', 'Cookie Policy', 'GDPR'].map(link => (
                  <li key={link}>
                    <span className="text-xs text-white/30 hover:text-lime transition-colors cursor-pointer">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-white/15">
              &copy; 2025 UptimeOps Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[10px] text-white/15">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                support@uptimeops.org
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <Phone className="w-3 h-3" />
                1-800-UPTIME-OPS
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple Trash icon since we removed it from the import
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
