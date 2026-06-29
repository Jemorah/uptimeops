// ═══════════════════════════════════════════════════════════════
// SECTION 2: THE 6-AGENT AUTONOMOUS REPAIR PIPELINE
// Horizontal interactive timeline with micro-hover glow borders
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Eye, Server, Bot, FileCheck, Zap, Shield,
  ArrowRight
} from 'lucide-react';

interface PipelineStep {
  icon: React.ElementType;
  name: string;
  color: string;
  dimColor: string;
  borderColor: string;
  tagline: string;
  description: string;
}

const STEPS: PipelineStep[] = [
  {
    icon: Eye,
    name: 'TRIAGE',
    color: '#22d3ee',
    dimColor: 'rgba(34,211,238,0.15)',
    borderColor: 'rgba(34,211,238,0.3)',
    tagline: 'Instant Severity Assessment',
    description: 'Continuous 24/7 monitoring detects anomalies and classifies severity from P4 to P1 by analyzing error rates, user impact, and system dependencies. Every incident is tagged, prioritized, and routed within seconds.',
  },
  {
    icon: Server,
    name: 'ISOLATE',
    color: '#a3e635',
    dimColor: 'rgba(163,230,53,0.15)',
    borderColor: 'rgba(163,230,53,0.3)',
    tagline: 'Sandboxed VM Environment',
    description: 'An isolated sandbox VM mirrors your exact stack before any repair touches production. Credentials are encrypted client-side with AES-256-GCM. Engineers get time-bounded, audit-trailed access.',
  },
  {
    icon: Bot,
    name: 'REPAIR',
    color: '#e879f9',
    dimColor: 'rgba(232,121,249,0.15)',
    borderColor: 'rgba(232,121,249,0.3)',
    tagline: 'AI-Generated Code Fixes',
    description: 'Autonomous patch generation leveraging AST mapping and customized coding rules. Analyzes logs, stack traces, and configuration drift to generate targeted fixes for any infrastructure failure.',
  },
  {
    icon: FileCheck,
    name: 'VALIDATE',
    color: '#22d3ee',
    dimColor: 'rgba(34,211,238,0.15)',
    borderColor: 'rgba(34,211,238,0.3)',
    tagline: 'CodeGraph + 42-Scanner Review',
    description: 'CodeGraph engine regression scanning combined with our 42-scanner security matrix. Health checks, endpoint tests, synthetic transactions, and dependency verification run with 100% confidence gates.',
  },
  {
    icon: Zap,
    name: 'DEPLOY',
    color: '#a3e635',
    dimColor: 'rgba(163,230,53,0.15)',
    borderColor: 'rgba(163,230,53,0.3)',
    tagline: 'Zero-Downtime Rollout',
    description: 'Blue-green or rolling deployment strategies eliminate downtime. Database migration safety checks, SSL certificate warming, CDN cache verification, and instant automatic rollback if anything fails.',
  },
  {
    icon: Shield,
    name: 'AUDIT',
    color: '#e879f9',
    dimColor: 'rgba(232,121,249,0.15)',
    borderColor: 'rgba(232,121,249,0.3)',
    tagline: 'Full Compliance Trail',
    description: 'SHA-256 integrity hashing logs every action — every credential access, every command, every file change — to immutable storage. Complete forensic trails for SOC 2, ISO 27001, GDPR, and HIPAA.',
  },
];

export default function AgentPipeline() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 800px 400px at 50% 50%, rgba(163,230,53,0.04), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-dim border border-cyan/20 mb-4">
            <Zap className="w-3 h-3 text-cyan" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan">Autonomous Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-4">
            THE 6-AGENT REPAIR{' '}
            <span className="text-lime">PIPELINE</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            From detection to deployment, every incident flows through a chain of specialized AI agents — each with a single responsibility, working together to get you back online.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block">
          {/* Connector line */}
          <div className="relative flex items-start justify-between mb-8 px-8">
            {STEPS.map((_, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                {(() => {
                  const SIcon = STEPS[i].icon;
                  return (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 cursor-default"
                      style={{
                        borderColor: hoveredIdx === i ? STEPS[i].color : STEPS[i].borderColor,
                        background: hoveredIdx === i ? STEPS[i].dimColor : 'rgba(15,23,42,0.6)',
                        boxShadow: hoveredIdx === i ? `0 0 20px ${STEPS[i].color}40` : 'none',
                      }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <SIcon className="w-4 h-4" style={{ color: STEPS[i].color }} />
                    </div>
                  );
                })()}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-3 relative">
                    <div
                      className="absolute inset-0 transition-all duration-500"
                      style={{
                        background: hoveredIdx !== null && hoveredIdx > i
                          ? `linear-gradient(90deg, ${STEPS[i].color}, ${STEPS[i + 1].color})`
                          : '#1e293b',
                      }}
                    />
                    <ArrowRight
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 transition-colors duration-300"
                      style={{ color: hoveredIdx !== null && hoveredIdx > i ? STEPS[i + 1].color : '#334155' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-between px-8 mb-8">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="text-center cursor-default transition-all duration-300"
                style={{ width: '100px' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  className="text-xs font-black tracking-wider mb-1 transition-colors duration-300"
                  style={{ color: hoveredIdx === i ? step.color : '#94a3b8' }}
                >
                  {step.name}
                </div>
                <div className="text-[10px] text-text-muted leading-tight">{step.tagline}</div>
              </div>
            ))}
          </div>

          {/* Description panel */}
          <div
            className="glass-surface rounded-xl p-6 transition-all duration-300 min-h-[100px]"
            style={{
              borderColor: hoveredIdx !== null ? STEPS[hoveredIdx].borderColor : '#1e293b',
              boxShadow: hoveredIdx !== null ? `0 0 20px ${STEPS[hoveredIdx].color}15` : 'none',
            }}
          >
            {hoveredIdx !== null ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = STEPS[hoveredIdx].icon;
                    return <Icon className="w-4 h-4" style={{ color: STEPS[hoveredIdx].color }} />;
                  })()}
                  <span className="text-sm font-black" style={{ color: STEPS[hoveredIdx].color }}>
                    STEP {hoveredIdx + 1}: {STEPS[hoveredIdx].name}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {STEPS[hoveredIdx].description}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Hover over a pipeline step to see details
              </div>
            )}
          </div>
        </div>

        {/* Mobile: vertical cards */}
        <div className="lg:hidden space-y-4">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="glass-surface rounded-xl p-5 transition-all duration-300 cursor-default"
              style={{
                borderColor: hoveredIdx === i ? step.borderColor : '#1e293b',
                boxShadow: hoveredIdx === i ? `0 0 15px ${step.color}15` : 'none',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0"
                  style={{ borderColor: step.borderColor, background: step.dimColor }}
                >
                  <step.icon className="w-4 h-4" style={{ color: step.color }} />
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Step {i + 1}</div>
                  <div className="text-sm font-black" style={{ color: step.color }}>{step.name}</div>
                </div>
              </div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{step.tagline}</div>
              <p className="text-xs text-text-secondary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
