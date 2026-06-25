import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Clock, Activity, Brain, Lock,
  Server, Globe, Radio, ArrowRight, ChevronRight
} from 'lucide-react';
import { VelocityGrid } from '@/components/effects/VelocityGrid';

export function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Brain,
      title: 'AI TRIAGE',
      description: 'Autonomous emergency classification in under 200ms. Our neural engine analyzes patterns across 50+ failure modes.',
      color: 'text-lime',
    },
    {
      icon: Server,
      title: 'ISOLATED REPAIR',
      description: 'VM-level sandboxing clones your live environment. Fixes are tested in isolation before any live deployment.',
      color: 'text-cyan',
    },
    {
      icon: Shield,
      title: 'ZERO-TOUCH DEPLOY',
      description: 'Approved fixes deploy automatically with full rollback capability. No human intervention required for standard repairs.',
      color: 'text-lime',
    },
    {
      icon: Lock,
      title: 'FULL AUDIT TRAIL',
      description: 'Every keystroke, every decision, every action is logged immutably. Compliance-grade reporting out of the box.',
      color: 'text-cyan',
    },
    {
      icon: Radio,
      title: 'REAL-TIME STATUS',
      description: 'Live telemetry streams from all monitored endpoints. Watch the AI work in real-time through your dashboard.',
      color: 'text-lime',
    },
    {
      icon: Globe,
      title: 'GLOBAL PRESENCE',
      description: 'Monitoring nodes in 40+ regions. Sub-50ms response times anywhere on Earth. Your site never sleeps.',
      color: 'text-cyan',
    },
  ];

  const agents = [
    { num: '01', name: 'TRIAGE', desc: 'Classifies incoming emergencies', color: '#d1ff00' },
    { num: '02', name: 'ISOLATE', desc: 'Spawns VM, clones site, runs diagnostics', color: '#00f0ff' },
    { num: '03', name: 'REPAIR', desc: 'Executes fix on isolated VM', color: '#d1ff00' },
    { num: '04', name: 'VALIDATE', desc: 'Tests fix, generates confidence score', color: '#00f0ff' },
    { num: '05', name: 'DEPLOY', desc: 'Pushes approved fix to live', color: '#d1ff00' },
    { num: '06', name: 'AUDIT', desc: 'Logs every action, compliance report', color: '#00f0ff' },
  ];

  return (
    <div className="bg-void">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <VelocityGrid />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="liquid-glass rounded-xl p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="status-dot status-dot-active animate-pulse" />
              <span className="text-xs font-mono text-lime uppercase tracking-wider">All Systems Operational</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              ZERO-TOUCH
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime to-cyan">
                SITE OPS
              </span>
            </h1>

            <p className="text-base md:text-lg text-white/60 max-w-xl mb-8 leading-relaxed">
              Autonomous triage, isolation, and repair. Your site never goes down.
              Six AI agents working in concert to detect, diagnose, and resolve
              infrastructure failures before they impact users.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Link to="/emergency" className="btn-lime rounded-sm text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Report Emergency
              </Link>
              <Link to="/pricing" className="px-6 py-3 border border-white/20 text-white text-sm font-medium rounded-sm hover:border-lime hover:text-lime transition-colors flex items-center gap-2">
                View Pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
              {[
                { label: 'Avg Resolution', value: '1.2s', color: 'text-lime' },
                { label: 'Uptime SLA', value: '99.999%', color: 'text-cyan' },
                { label: 'AI Confidence', value: '94.7%', color: 'text-lime' },
                { label: 'Sites Protected', value: '12,400+', color: 'text-cyan' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className={`text-2xl md:text-3xl font-black ${stat.color} font-mono`}>{stat.value}</div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* Operational Overview */}
      <section className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700">
              <span className="text-lime text-xs font-mono uppercase tracking-widest">Operational Overview</span>
              <h2 className="text-3xl md:text-5xl font-black mt-4 mb-6 tracking-tight">
                FULL-SPECTRUM
                <br />
                <span className="text-white/40">COVERAGE</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">
                From the moment an anomaly is detected to the final deployment of a verified fix,
                UptimeOps manages the entire incident lifecycle. Our AI agents operate in a
                coordinated pipeline that ensures no failure goes unresolved.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Detection Latency', value: '< 200ms' },
                  { label: 'Triage Accuracy', value: '99.2%' },
                  { label: 'Auto-Resolution Rate', value: '87%' },
                  { label: 'Escalation Response', value: '< 30s' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-white/50">{item.label}</span>
                    <span className="text-sm font-mono font-bold text-lime">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700 delay-200">
              <div className="relative aspect-video bg-surface border border-white/5 rounded-sm overflow-hidden">
                <div className="absolute inset-0 scanline-overlay" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-lime mx-auto mb-4" />
                    <div className="text-xs font-mono text-white/40">LIVE MONITORING FEED</div>
                    <div className="text-2xl font-mono font-bold text-lime mt-2">ONLINE</div>
                  </div>
                </div>
                <div className="absolute top-4 left-4 right-4 flex justify-between text-xs font-mono text-white/30">
                  <span>VM_ISOLATION_01</span>
                  <span className="text-lime">ACTIVE</span>
                </div>
                <div className="absolute bottom-4 left-4 text-xs font-mono text-white/30 space-y-1">
                  <div>CPU: 12%</div>
                  <div>MEM: 340MB</div>
                  <div>NET: 2.4Gbps</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Antigravity Engine - AI Agents */}
      <section className="py-24 md:py-32 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700">
            <span className="text-cyan text-xs font-mono uppercase tracking-widest">The Antigravity Engine</span>
            <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">
              SIX AI AGENTS
              <br />
              <span className="text-white/40">ONE MISSION</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <div
                key={agent.num}
                className="reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700 group"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="bg-surface border border-white/5 p-6 hover:border-lime/30 transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className="text-4xl font-black font-mono opacity-20 group-hover:opacity-40 transition-opacity"
                      style={{ color: agent.color }}
                    >
                      {agent.num}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color, boxShadow: `0 0 8px ${agent.color}` }}
                    />
                  </div>
                  <h3
                    className="text-xl font-bold mb-2 tracking-tight"
                    style={{ color: agent.color }}
                  >
                    {agent.name}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">{agent.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-mono text-white/30">
                    <Clock className="w-3 h-3" />
                    <span>AVG: {Math.round(150 + Math.random() * 800)}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700">
            <p className="text-sm text-white/40 mb-4">
              Agents communicate through an encrypted message bus with sub-millisecond latency.
              Each agent can veto the pipeline if confidence drops below threshold.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-lime text-sm font-medium hover:underline"
            >
              See how it works <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700">
            <span className="text-lime text-xs font-mono uppercase tracking-widest">Capabilities</span>
            <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">
              BUILT FOR
              <br />
              <span className="text-white/40">ENTERPRISE SCALE</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700 group"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="bg-surface border border-white/5 p-6 hover:border-white/10 transition-all duration-300 h-full">
                  <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                  <h3 className="text-lg font-bold mb-2 tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-surface/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="reveal-on-scroll opacity-0 translate-y-4 transition-all duration-700">
            <Shield className="w-16 h-16 text-lime mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
              NEVER GO DOWN
              <br />
              <span className="text-white/40">AGAIN</span>
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Join 12,400+ sites that trust UptimeOps to keep their infrastructure running.
              From startups to Fortune 500, we scale with you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/pricing" className="btn-lime rounded-sm text-sm">
                Get Started
              </Link>
              <Link
                to="/emergency"
                className="px-6 py-3 border border-magenta/30 text-magenta text-sm font-medium rounded-sm hover:bg-magenta/10 transition-colors"
              >
                Report Emergency
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-lime" />
                <span className="text-sm font-bold">UPTIME<span className="text-lime">OPS</span></span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                Autonomous site operations platform.
                Zero-touch infrastructure resilience.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-white/60">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/pricing" className="text-xs text-white/40 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/status" className="text-xs text-white/40 hover:text-white transition-colors">Status</Link></li>
                <li><Link to="/emergency" className="text-xs text-white/40 hover:text-white transition-colors">Emergency</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-white/60">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-white/40">About</span></li>
                <li><span className="text-xs text-white/40">Blog</span></li>
                <li><span className="text-xs text-white/40">Careers</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-white/60">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-white/40">Privacy</span></li>
                <li><span className="text-xs text-white/40">Terms</span></li>
                <li><span className="text-xs text-white/40">Security</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-xs text-white/30 font-mono">
              &copy; 2026 UptimeOps. All rights reserved.
            </span>
            <div className="flex items-center gap-2">
              <div className="status-dot status-dot-ok" />
              <span className="text-xs text-white/40">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .reveal-on-scroll.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  );
}
