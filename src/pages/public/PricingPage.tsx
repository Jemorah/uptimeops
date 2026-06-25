// ═══════════════════════════════════════════════════════════════
// PRICING PAGE
// One-Time Fix ←→ Monthly Subscription toggle
// 3 tiers each with full specs, FAQ accordion, guarantees
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Building2, Check, X, Clock,
  AlertTriangle, Flame, HeartHandshake, Ban, Lock,
  Bot, Eye, Globe, TrendingUp,
  CreditCard, Sparkles, Gauge
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type PricingMode = 'onetime' | 'subscription';

// ── ONE-TIME FIX TIERS ──
const ONETIME_TIERS = [
  {
    name: 'RAPID FIX',
    icon: Zap,
    price: 149,
    response: 'Within 2 hours',
    scope: 'Single issue — broken code, CSS, minor plugin conflict',
    features: [
      'AI diagnosis + automated fix',
      '72-hour temporary dashboard',
      'Email support',
      'Fix summary report',
      'Before/after screenshots',
    ],
    notIncluded: [
      'Security hardening',
      'Warranty period',
      'Priority queue',
    ],
    bestFor: 'Small business sites, blogs, portfolios',
    cta: 'Fix My Site Now',
    popular: false,
    accent: 'text-cyan',
    accentBg: 'bg-cyan/10',
    accentBorder: 'border-cyan/30',
    accentRing: 'ring-cyan/20',
    glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.08)]',
  },
  {
    name: 'CRITICAL FIX',
    icon: AlertTriangle,
    price: 349,
    response: 'Within 30 minutes',
    scope: 'Complex issue — malware removal, hacked recovery, database repair',
    features: [
      'Everything in Rapid Fix',
      'Security hardening post-fix',
      '30-day warranty',
      'Malware scan + removal',
      'Priority queue (P2)',
      'Coordinator review gate',
      'Rollback protection',
    ],
    notIncluded: [
      'Full site rebuild',
      'Compliance report',
      'DDoS mitigation',
    ],
    bestFor: 'E-commerce, membership sites, business-critical pages',
    cta: 'Get Critical Help',
    popular: true,
    accent: 'text-red-400',
    accentBg: 'bg-red-400/10',
    accentBorder: 'border-red-400/30',
    accentRing: 'ring-red-400/20',
    glow: 'hover:shadow-[0_0_40px_rgba(248,113,113,0.12)]',
  },
  {
    name: 'CATASTROPHIC FIX',
    icon: Flame,
    price: 799,
    response: 'Within 15 minutes',
    scope: 'Full site rebuild, DDoS mitigation, forensic audit, firewall config',
    features: [
      'Everything in Critical Fix',
      'P1 priority — instant queue',
      'Full forensic audit trail',
      'DDoS attack mitigation',
      'Firewall reconfiguration',
      'Compliance report (SOC2)',
      '90-day warranty',
      'Dedicated senior engineer',
      'Post-incident briefing call',
    ],
    notIncluded: [],
    bestFor: 'Enterprise, high-traffic, revenue-dependent platforms',
    cta: 'Emergency Response',
    popular: false,
    accent: 'text-magenta',
    accentBg: 'bg-magenta/10',
    accentBorder: 'border-magenta/30',
    accentRing: 'ring-magenta/20',
    glow: 'hover:shadow-[0_0_40px_rgba(255,0,85,0.12)]',
  },
];

// ── SUBSCRIPTION TIERS ──
const SUB_TIERS = [
  {
    name: 'GUARDIAN',
    icon: Shield,
    priceMonthly: 99,
    priceAnnual: 79,
    scope: 'Ongoing monitoring with 2 incidents/month included',
    incidents: '2 per month',
    monitoring: 'Uptime + security scanning (daily)',
    response: '4-hour SLA for new incidents',
    features: [
      'AI auto-fixes (unlimited)',
      'Daily security scanning',
      'Uptime monitoring (5-min)',
      'Monthly health report',
      'Email support',
      'Credential vault (encrypted)',
      'Incident history (90 days)',
    ],
    notIncluded: [
      'Continuous security monitoring',
      'Staging environment',
      'Priority support',
      'Performance benchmarking',
    ],
    bestFor: 'Small business, brochure sites, local services',
    cta: 'Start Protecting',
    popular: false,
    accent: 'text-cyan',
    accentBg: 'bg-cyan/10',
    accentBorder: 'border-cyan/30',
    accentRing: 'ring-cyan/20',
    glow: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.08)]',
  },
  {
    name: 'SENTINEL',
    icon: Eye,
    priceMonthly: 249,
    priceAnnual: 199,
    scope: 'Continuous protection with 5 incidents/month included',
    monitoring: 'Uptime (60s) + security (continuous) + performance (weekly)',
    response: '1-hour SLA for new incidents',
    features: [
      'Everything in Guardian',
      'Continuous security monitoring',
      'Uptime checks every 60 seconds',
      'Weekly performance benchmarks',
      'Priority support (1-hour)',
      'Staging environment access',
      'SSL expiry auto-renewal',
      'Plugin update management',
      'Incident history (1 year)',
    ],
    notIncluded: [
      'Dedicated account manager',
      'DDoS protection',
      'Compliance reporting',
      'Custom firewall rules',
    ],
    bestFor: 'Growing businesses, WooCommerce, lead-gen sites',
    cta: 'Upgrade to Sentinel',
    popular: true,
    accent: 'text-lime',
    accentBg: 'bg-lime/10',
    accentBorder: 'border-lime/30',
    accentRing: 'ring-lime/20',
    glow: 'hover:shadow-[0_0_40px_rgba(209,255,0,0.12)]',
  },
  {
    name: 'FORTRESS',
    icon: Building2,
    priceMonthly: 599,
    priceAnnual: 479,
    scope: 'Enterprise-grade unlimited protection with full observability',
    monitoring: 'Full-stack observability (real-time)',
    response: '15-minute SLA (24/7)',
    features: [
      'Everything in Sentinel',
      'Unlimited incidents',
      'Real-time observability',
      'Dedicated account manager',
      'DDoS attack protection',
      'Compliance reporting (SOC2, HIPAA)',
      'Custom WAF rules',
      'Quarterly security audit',
      '24/7 phone support hotline',
      'Incident history (unlimited)',
      'Custom integrations',
      'SLA guarantee (99.99%)',
    ],
    notIncluded: [],
    bestFor: 'Enterprise, SaaS, high-traffic e-commerce, regulated industries',
    cta: 'Build Your Fortress',
    popular: false,
    accent: 'text-magenta',
    accentBg: 'bg-magenta/10',
    accentBorder: 'border-magenta/30',
    accentRing: 'ring-magenta/20',
    glow: 'hover:shadow-[0_0_40px_rgba(255,0,85,0.12)]',
  },
];

// ── FAQ ──
const FAQS = [
  {
    q: 'How does the pay-per-incident model work?',
    a: 'You only pay when we successfully fix your issue. Submit your site details and credentials (encrypted — we never see your passwords). Our AI triages within 60 seconds, isolates your site in a secure VM, repairs the issue, and a human coordinator approves the deployment. You get a 72-hour dashboard to verify the fix before payment is processed.',
  },
  {
    q: 'Can I switch between One-Time Fix and Subscription?',
    a: 'Absolutely. If you find yourself submitting multiple one-time fixes, we will proactively recommend a subscription tier. You can upgrade at any time and unused one-time fix credits roll into your subscription. Downgrading is just as easy — no penalties, no questions asked.',
  },
  {
    q: 'What happens if the AI cannot fix my issue?',
    a: 'If our AI pipeline drops below 90% confidence, it automatically escalates to a human engineer — at no extra cost. For Critical and Catastrophic tiers, a senior engineer is assigned within minutes. You are never left without a path to resolution.',
  },
  {
    q: 'How secure is the credential submission process?',
    a: 'We use zero-knowledge encryption. Your credentials are encrypted in your browser using AES-256-GCM before they ever reach our servers. The encryption key exists only in your browser session and is relayed to our isolated VM via a one-time secure channel. After the fix, credentials are automatically purged. We literally cannot see your passwords.',
  },
  {
    q: 'What is the 7-day money-back guarantee?',
    a: 'On your first subscription month, if you are not satisfied for any reason, contact us within 7 days for a full refund — no questions asked. For One-Time Fixes, you only pay if we successfully resolve your issue. If we cannot fix it, you pay nothing.',
  },
  {
    q: 'Do you offer annual billing discounts?',
    a: 'Yes! All subscription tiers offer a 20% discount when billed annually. Guardian drops from $99/mo to $79/mo, Sentinel from $249/mo to $199/mo, and Fortress from $599/mo to $479/mo. That is up to $1,440 in annual savings.',
  },
  {
    q: 'What is included in the 72-hour temporary dashboard?',
    a: 'After a One-Time Fix, you receive a unique token-secured link to a temporary dashboard. It includes: a full fix summary with files changed, before/after comparison, the complete audit trail, a compliance certificate, and action buttons to confirm the fix worked or report remaining issues. The dashboard auto-expires after 72 hours and all access is revoked.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. There are no long-term contracts. Cancel from your account dashboard or by emailing support. Your service continues until the end of your current billing period. We will even help you export your data before you go.',
  },
  {
    q: 'What does the SLA cover?',
    a: 'Our SLA guarantees response times for new incidents: Guardian (4 hours), Sentinel (1 hour), Fortress (15 minutes). This means an engineer or AI agent begins actively working on your issue within the SLA window. Fortress also includes a 99.99% uptime guarantee with service credits if we fall short.',
  },
  {
    q: 'How do I know which tier is right for me?',
    a: 'Start with our free 5-minute site assessment. We scan your site and recommend the optimal tier based on your traffic, tech stack, and risk profile. Still unsure? Start with Guardian and upgrade as you grow — you only pay the difference.',
  },
];

export function PricingPage() {
  const [mode, setMode] = useState<PricingMode>('onetime');
  const [annual, setAnnual] = useState(false);

  const tiers = mode === 'onetime' ? ONETIME_TIERS : SUB_TIERS;

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <span className="text-lime text-xs font-mono uppercase tracking-widest">Pricing</span>
          <h1 className="text-4xl md:text-6xl font-black mt-4 tracking-tight">
            {mode === 'onetime' ? 'EMERGENCY' : 'PROACTIVE'}
            <br />
            <span className="text-white/40">
              {mode === 'onetime' ? 'REPAIR PRICING' : 'PROTECTION PLANS'}
            </span>
          </h1>
          <p className="text-white/60 mt-4 max-w-xl mx-auto">
            {mode === 'onetime'
              ? 'Pay per incident. Only pay if we fix it. No subscriptions, no commitments.'
              : 'Continuous monitoring and unlimited AI auto-fixes. Sleep peacefully.'}
          </p>
        </div>

        {/* ── Mode Toggle ── */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="flex items-center gap-4 bg-surface border border-white/10 px-6 py-3">
            <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'onetime' ? 'text-red-400' : 'text-white/30'}`}>
              <Flame className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              One-Time Fix
            </span>
            <Switch
              checked={mode === 'subscription'}
              onCheckedChange={(checked) => setMode(checked ? 'subscription' : 'onetime')}
              className="data-[state=checked]:bg-lime data-[state=unchecked]:bg-red-400/50"
            />
            <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'subscription' ? 'text-lime' : 'text-white/30'}`}>
              <Shield className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Monthly Subscription
            </span>
          </div>

          {/* Annual toggle (subscriptions only) */}
          {mode === 'subscription' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAnnual(false)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 border transition-colors ${!annual ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${annual ? 'bg-lime/10 text-lime border-lime/30' : 'bg-white/5 text-white/30 border-white/10'}`}
              >
                Annually
                <span className="text-[9px] bg-lime/20 text-lime px-1.5 py-0.5">SAVE 20%</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Tier Cards ── */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-surface border ${tier.accentBorder} p-6 lg:p-8 flex flex-col ${tier.popular ? `ring-1 ${tier.accentRing}` : ''} ${tier.glow} transition-all duration-500`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className={`${tier.accentBg} ${tier.accent} border ${tier.accentBorder} text-xs font-bold px-4 py-1 uppercase tracking-wider`}>
                    Most Popular
                  </span>
                </div>
              )}

              {/* Icon + Name */}
              <div className="mb-5">
                <tier.icon className={`w-8 h-8 ${tier.accent} mb-3`} />
                <h3 className="text-lg font-black tracking-tight">{tier.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-4">
                {'price' in tier ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-white/40 text-lg">$</span>
                    <span className={`text-5xl font-black font-mono ${tier.accent} transition-all duration-500`}>{tier.price}</span>
                    <span className="text-white/30 text-sm ml-1">one-time</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-white/40 text-lg">$</span>
                      <span className={`text-5xl font-black font-mono ${tier.accent} transition-all duration-500`}>
                        {annual ? tier.priceAnnual : tier.priceMonthly}
                      </span>
                      <span className="text-white/30 text-sm ml-1">/mo</span>
                    </div>
                    {annual && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/20 line-through">${tier.priceMonthly}/mo</span>
                        <span className="text-[10px] bg-lime/10 text-lime px-1.5 py-0.5 border border-lime/20">20% OFF</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Response Time */}
              <div className={`${tier.accentBg} border ${tier.accentBorder} px-3 py-2 mb-4`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-3.5 h-3.5 ${tier.accent}`} />
                  <span className={`text-xs font-bold ${tier.accent}`}>{tier.response}</span>
                </div>
              </div>

              {/* Scope */}
              <p className="text-xs text-white/40 mb-4 leading-relaxed">{tier.scope}</p>

              {/* Incidents (subs only) */}
              {'incidents' in tier && (
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white/50"><span className="text-white/70 font-bold">{tier.incidents}</span> incidents included</span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-white/60">
                    <Check className={`w-3.5 h-3.5 ${tier.accent} flex-shrink-0 mt-0.5`} />
                    {f}
                  </li>
                ))}
                {tier.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-white/20">
                    <X className="w-3.5 h-3.5 text-white/15 flex-shrink-0 mt-0.5" />
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Best For */}
              <div className="mb-5 p-2.5 bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Best for</span>
                <p className="text-xs text-white/50 mt-0.5">{tier.bestFor}</p>
              </div>

              {/* CTA */}
              <Link
                to={mode === 'onetime' ? '/emergency' : '/signup'}
                className={`w-full py-3.5 text-center text-sm font-black uppercase tracking-wider transition-all border ${
                  tier.popular
                    ? `${tier.accentBg} ${tier.accent} ${tier.accentBorder} hover:brightness-125`
                    : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* ── Universal Guarantees ── */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { icon: Ban, text: 'No long-term contracts', sub: 'Cancel anytime' },
            { icon: HeartHandshake, text: '7-day money-back guarantee', sub: 'First month only' },
            { icon: Bot, text: 'AI handles 95% of fixes', sub: 'Human engineers for the rest' },
            { icon: Lock, text: 'Zero-knowledge credentials', sub: 'We never see your passwords' },
          ].map((g) => (
            <div key={g.text} className="flex items-center gap-3 p-4 bg-surface border border-white/5">
              <g.icon className="w-5 h-5 text-lime flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-white/60">{g.text}</div>
                <div className="text-[10px] text-white/30">{g.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Trust Badges ── */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto">
          {[
            { icon: CreditCard, label: 'Stripe Secure' },
            { icon: Lock, label: 'SOC 2 Compliant' },
            { icon: Globe, label: 'GDPR Ready' },
            { icon: Sparkles, label: 'ISO 27001' },
            { icon: TrendingUp, label: '99.9% Uptime SLA' },
            { icon: Gauge, label: '< 60s Response' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5 text-white/20">
              <badge.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">FREQUENTLY ASKED</h2>
            <p className="text-sm text-white/40 mt-2">Everything you need to know before you decide</p>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-surface border border-white/5 px-4 data-[state=open]:border-lime/20 transition-colors"
              >
                <AccordionTrigger className="text-sm font-bold text-white/70 hover:text-white text-left py-4 [&[data-state=open]]:text-lime">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-white/50 leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-20 text-center">
          <div className="bg-surface border border-white/5 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-black tracking-tight mb-2">
              Still have questions?
            </h3>
            <p className="text-sm text-white/40 mb-6">
              Our team is standing by. Average response time: 3 minutes.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/emergency"
                className="px-6 py-3 bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-bold uppercase tracking-wider hover:bg-red-400/20 transition-colors"
              >
                <Flame className="w-4 h-4 inline mr-2 -mt-0.5" />
                Emergency Fix
              </Link>
              <Link
                to="/signup"
                className="px-6 py-3 bg-lime/10 border border-lime/30 text-lime text-sm font-bold uppercase tracking-wider hover:bg-lime/20 transition-colors"
              >
                <Shield className="w-4 h-4 inline mr-2 -mt-0.5" />
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
