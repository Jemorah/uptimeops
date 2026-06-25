import { Check, Zap, Shield, Rocket, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'STARTER',
    icon: Zap,
    price: '$49',
    period: '/month',
    description: 'For small sites and personal projects',
    features: [
      '3 sites monitored',
      '5 incidents/month',
      'AI Triage + Isolate',
      '24h engineer escalation',
      'Email notifications',
      '7-day log retention',
    ],
    cta: 'Get Started',
    popular: false,
    color: 'text-cyan',
    borderColor: 'border-white/10',
  },
  {
    name: 'PRO',
    icon: Shield,
    price: '$149',
    period: '/month',
    description: 'For growing businesses',
    features: [
      '10 sites monitored',
      '25 incidents/month',
      'Full AI Pipeline (6 agents)',
      '15-min engineer escalation',
      'SMS + Slack notifications',
      '30-day log retention',
      'Custom alert thresholds',
      'API access',
    ],
    cta: 'Start Pro Trial',
    popular: true,
    color: 'text-lime',
    borderColor: 'border-lime/30',
  },
  {
    name: 'ENTERPRISE',
    icon: Building2,
    price: 'Custom',
    period: '',
    description: 'For mission-critical infrastructure',
    features: [
      'Unlimited sites',
      'Unlimited incidents',
      'Full AI Pipeline + Custom Agents',
      'Instant engineer escalation',
      'Dedicated coordinator',
      '1-year log retention',
      'SSO + SAML',
      'On-premise option',
      'Custom SLA',
      'Compliance reporting',
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'text-magenta',
    borderColor: 'border-magenta/30',
  },
];

export function PricingPage() {
  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-lime text-xs font-mono uppercase tracking-widest">Pricing</span>
          <h1 className="text-4xl md:text-6xl font-black mt-4 tracking-tight">
            CHOOSE YOUR
            <br />
            <span className="text-white/40">COVERAGE</span>
          </h1>
          <p className="text-white/60 mt-4 max-w-xl mx-auto">
            Every tier includes our core AI triage engine. Upgrade for faster escalation,
            more sites, and advanced compliance features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-surface border ${tier.borderColor} p-8 flex flex-col ${
                tier.popular ? 'ring-1 ring-lime/20' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-lime text-void text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <tier.icon className={`w-8 h-8 ${tier.color} mb-4`} />
                <h3 className="text-lg font-bold tracking-tight">{tier.name}</h3>
                <p className="text-sm text-white/40 mt-1">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-black font-mono ${tier.color}`}>{tier.price}</span>
                <span className="text-white/40 text-sm">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/60">
                    <Check className={`w-4 h-4 ${tier.color} flex-shrink-0 mt-0.5`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`w-full py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${
                  tier.popular
                    ? 'bg-lime text-void hover:shadow-[inset_0_0_0_2px_#050507]'
                    : 'border border-white/20 text-white hover:border-lime hover:text-lime'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-surface border border-white/5 p-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-lime" />
              One-Time Fix
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Not ready for a subscription? Submit a one-time emergency fix. You get a
              dedicated 72-hour dashboard to watch our AI diagnose and repair your issue.
              Pay only if we resolve it.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-lime">$99</span>
                <span className="text-sm text-white/40">per incident (pay on success)</span>
              </div>
              <Link to="/emergency" className="btn-lime text-sm rounded-sm">
                Submit Fix Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
