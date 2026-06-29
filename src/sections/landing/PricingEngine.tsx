// ═══════════════════════════════════════════════════════════════
// SECTION 4: PRICING ENGINE
// Monthly/Annual toggle + 3D tilt cards + one-time fix CTA
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Shield, Crown, Check, AlertTriangle, ChevronRight
} from 'lucide-react';

interface PricingTier {
  name: string;
  icon: React.ElementType;
  iconColor: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  borderColor: string;
  glowColor: string;
  dimColor: string;
}

const TIERS: PricingTier[] = [
  {
    name: 'GUARDIAN',
    icon: Shield,
    iconColor: '#22d3ee',
    monthlyPrice: 99,
    annualPrice: 83,
    description: 'Essential protection for small teams and single applications.',
    features: [
      '3 incidents per month',
      '< 2-hour SLA response',
      'Base stack monitoring',
      '42-scanner security review',
      'Email support',
      'Immutable audit trail',
    ],
    cta: 'Subscribe Guardian',
    borderColor: 'rgba(34,211,238,0.3)',
    glowColor: 'rgba(34,211,238,0.15)',
    dimColor: 'rgba(34,211,238,0.1)',
  },
  {
    name: 'SENTINEL',
    icon: Zap,
    iconColor: '#a3e635',
    monthlyPrice: 249,
    annualPrice: 207,
    description: 'Advanced protection with rapid response for growing infrastructure.',
    features: [
      '10 incidents per month',
      '< 15-minute SLA response',
      'Advanced logging & tracing',
      '2 included emergency credits',
      'Priority queue access',
      'CodeGraph deep analysis',
      'Custom guideline configs',
    ],
    cta: 'Subscribe Sentinel',
    popular: true,
    borderColor: 'rgba(163,230,53,0.4)',
    glowColor: 'rgba(163,230,53,0.2)',
    dimColor: 'rgba(163,230,53,0.15)',
  },
  {
    name: 'FORTRESS',
    icon: Crown,
    iconColor: '#e879f9',
    monthlyPrice: 599,
    annualPrice: 497,
    description: 'Maximum protection with dedicated engineer and unlimited incidents.',
    features: [
      'Unlimited incidents',
      '< 5-minute SLA response',
      '24/7 dedicated engineer',
      '5 emergency credits included',
      'Tailored guideline configs',
      'On-premise deployment option',
      'White-glove onboarding',
      'Custom compliance reports',
    ],
    cta: 'Subscribe Fortress',
    borderColor: 'rgba(232,121,249,0.3)',
    glowColor: 'rgba(232,121,249,0.15)',
    dimColor: 'rgba(232,121,249,0.1)',
  },
];

// ── 3D Tilt Card ──
function TiltCard({
  tier,
  isAnnual,
  onSubscribe,
}: {
  tier: PricingTier;
  isAnnual: boolean;
  onSubscribe: (tier: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(800px) rotateX(0deg) rotateY(0deg)');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -12;
    const rotateY = (x - 0.5) * 12;
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setIsHovered(false);
  }, []);

  const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
  const period = isAnnual ? '/mo billed annually' : '/mo';
  const savings = isAnnual ? Math.round((1 - tier.annualPrice / tier.monthlyPrice) * 100) : 0;

  return (
    <div
      ref={cardRef}
      className="relative transition-transform duration-150 ease-out"
      style={{ transform, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Most Popular badge */}
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="px-4 py-1 bg-lime text-void-deep text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse-slow">
            Most Popular
          </div>
        </div>
      )}

      <div
        className="glass-surface rounded-xl p-6 h-full flex flex-col transition-all duration-300"
        style={{
          borderColor: isHovered ? tier.borderColor : '#1e293b',
          boxShadow: isHovered ? `0 0 30px ${tier.glowColor}` : 'none',
          background: tier.popular ? `linear-gradient(180deg, ${tier.dimColor} 0%, rgba(15,23,42,0.6) 30%)` : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center border"
            style={{ borderColor: tier.borderColor, background: tier.dimColor }}
          >
            <tier.icon className="w-6 h-6" style={{ color: tier.iconColor }} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-wider" style={{ color: tier.iconColor }}>
              {tier.name}
            </h3>
            {tier.popular && (
              <span className="text-[9px] text-lime font-bold uppercase tracking-wider">Recommended</span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-text-muted text-lg">$</span>
            <span className="text-4xl font-black text-text-primary">{price}</span>
            <span className="text-text-muted text-sm">{period}</span>
          </div>
          {isAnnual && savings > 0 && (
            <div className="text-[11px] text-lime font-semibold mt-1">
              Save {savings}% with annual billing
            </div>
          )}
          <p className="text-xs text-text-secondary mt-2">{tier.description}</p>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-lime shrink-0 mt-0.5" />
              <span className="text-xs text-text-secondary">{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSubscribe(tier.name)}
          className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            tier.popular
              ? 'bg-lime text-void-deep hover:bg-lime-light hover:shadow-[0_0_20px_rgba(163,230,53,0.3)]'
              : 'border hover:bg-white/5 text-text-primary'
          }`}
          style={tier.popular ? {} : { borderColor: tier.borderColor }}
        >
          {tier.cta}
        </button>
      </div>
    </div>
  );
}

export default function PricingEngine() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSubscribe = (tier: string) => {
    navigate(`/login?intent=subscribe&tier=${tier.toLowerCase()}&billing=${isAnnual ? 'annual' : 'monthly'}`);
  };

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 700px 500px at 50% 60%, rgba(163,230,53,0.04), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-dim border border-lime/20 mb-4">
            <Crown className="w-3 h-3 text-lime" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-lime">No Free Trials. No Surprises.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-4">
            CHOOSE YOUR{' '}
            <span className="text-lime">SHIELD</span>
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto">
            Every plan includes full access to our 6-agent pipeline, 42-scanner security matrix, and immutable audit trail. Subscribe or purchase a one-time fix.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${!isAnnual ? 'text-text-primary' : 'text-text-muted'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 rounded-full transition-colors duration-200"
            style={{ background: isAnnual ? 'rgba(163,230,53,0.3)' : '#1e293b', border: '1px solid rgba(163,230,53,0.3)' }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full bg-lime transition-transform duration-200 shadow"
              style={{ transform: isAnnual ? 'translateX(26px)' : 'translateX(1px)' }}
            />
          </button>
          <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isAnnual ? 'text-text-primary' : 'text-text-muted'}`}>
            Annual
          </span>
          <span className="text-[10px] font-bold text-lime bg-lime-dim border border-lime/20 px-2 py-0.5 rounded">
            SAVE 17%
          </span>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TIERS.map((tier) => (
            <TiltCard key={tier.name} tier={tier} isAnnual={isAnnual} onSubscribe={handleSubscribe} />
          ))}
        </div>

        {/* One-time fix CTA */}
        <div className="glass-surface rounded-xl p-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose" />
              <span className="text-sm text-text-secondary">
                Not ready to subscribe? Need an immediate one-time fix?
              </span>
            </div>
            <button
              onClick={() => navigate('/emergency')}
              className="group flex items-center gap-2 px-6 py-3 bg-rose/10 text-rose border border-rose/30 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-rose/20 transition-all"
            >
              Purchase One-Time Rapid Fix — $99
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
