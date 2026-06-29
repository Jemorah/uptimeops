// ═══════════════════════════════════════════════════════════════
// SECTION 5: ZERO-KNOWLEDGE CLIENT VAULT PREVIEW
// Stylized encryption flow visualization
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Lock, Shield, EyeOff, Key, CheckCircle2 } from 'lucide-react';

// ── Animated encryption flow ──
function EncryptionFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: 'Key Generated', desc: 'AES-256-GCM key created in browser' },
    { label: 'Encrypting', desc: 'Credentials encrypted client-side' },
    { label: 'Transmitting', desc: 'Only ciphertext + IV sent over wire' },
    { label: 'Stored', desc: 'Server stores encrypted payload only' },
  ];

  return (
    <div className="space-y-4">
      {steps.map((s, i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-500"
            style={{
              borderColor: isActive ? 'rgba(34,211,238,0.4)' : isDone ? 'rgba(163,230,53,0.3)' : '#1e293b',
              background: isActive ? 'rgba(34,211,238,0.08)' : isDone ? 'rgba(163,230,53,0.05)' : 'rgba(15,23,42,0.3)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
              style={{
                background: isActive ? 'rgba(34,211,238,0.2)' : isDone ? 'rgba(163,230,53,0.2)' : 'rgba(30,41,59,0.5)',
                border: `1px solid ${isActive ? 'rgba(34,211,238,0.4)' : isDone ? 'rgba(163,230,53,0.4)' : '#334155'}`,
              }}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-lime" />
              ) : (
                <Lock className="w-4 h-4" style={{ color: isActive ? '#22d3ee' : '#475569' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-text-primary">{s.label}</div>
              <div className="text-[10px] text-text-muted">{s.desc}</div>
            </div>
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Visual diagram ──
function VaultDiagram() {
  return (
    <svg viewBox="0 0 400 180" className="w-full h-full max-h-[200px]">
      {/* Client browser */}
      <rect x="10" y="20" width="110" height="140" rx="8" fill="rgba(34,211,238,0.05)" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
      <text x="65" y="40" textAnchor="middle" fill="#22d3ee" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">BROWSER</text>

      {/* Key gen */}
      <rect x="20" y="50" width="90" height="22" rx="4" fill="rgba(163,230,53,0.1)" stroke="rgba(163,230,53,0.3)" strokeWidth="0.5" />
      <text x="65" y="64" textAnchor="middle" fill="#a3e635" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">AES-256-GCM Key</text>

      {/* Encrypt */}
      <rect x="20" y="80" width="90" height="22" rx="4" fill="rgba(232,121,249,0.1)" stroke="rgba(232,121,249,0.3)" strokeWidth="0.5" />
      <text x="65" y="94" textAnchor="middle" fill="#e879f9" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">Encrypt Credentials</text>

      {/* Plaintext never leaves */}
      <rect x="20" y="110" width="90" height="22" rx="4" fill="rgba(244,63,94,0.08)" stroke="rgba(244,63,94,0.3)" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="65" y="124" textAnchor="middle" fill="#f43f5e" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">Plaintext = HIDDEN</text>

      {/* Arrow to wire */}
      <line x1="120" y1="90" x2="170" y2="90" stroke="#22d3ee" strokeWidth="1.5" markerEnd="url(#arrow-cyan)" />
      <text x="145" y="85" textAnchor="middle" fill="#22d3ee" fontSize="6" fontWeight="600" fontFamily="JetBrains Mono">ciphertext+IV</text>

      {/* Wire */}
      <rect x="170" y="60" width="60" height="60" rx="4" fill="rgba(34,211,238,0.03)" stroke="rgba(34,211,238,0.2)" strokeWidth="0.5" strokeDasharray="4,2" />
      <text x="200" y="82" textAnchor="middle" fill="#475569" fontSize="6" fontWeight="500" fontFamily="JetBrains Mono">TLS 1.3</text>
      <text x="200" y="94" textAnchor="middle" fill="#475569" fontSize="6" fontWeight="500" fontFamily="JetBrains Mono">Encrypted</text>
      <text x="200" y="106" textAnchor="middle" fill="#475569" fontSize="6" fontWeight="500" fontFamily="JetBrains Mono">Wire</text>

      {/* Arrow to server */}
      <line x1="230" y1="90" x2="280" y2="90" stroke="#22d3ee" strokeWidth="1.5" markerEnd="url(#arrow-cyan)" />

      {/* Server */}
      <rect x="280" y="20" width="110" height="140" rx="8" fill="rgba(163,230,53,0.03)" stroke="rgba(163,230,53,0.25)" strokeWidth="1" />
      <text x="335" y="40" textAnchor="middle" fill="#a3e635" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">UPTIMEOPS</text>

      {/* Server stores */}
      <rect x="290" y="50" width="90" height="22" rx="4" fill="rgba(163,230,53,0.08)" stroke="rgba(163,230,53,0.25)" strokeWidth="0.5" />
      <text x="335" y="64" textAnchor="middle" fill="#a3e635" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">Encrypted Blob</text>

      {/* Server cannot decrypt */}
      <rect x="290" y="80" width="90" height="22" rx="4" fill="rgba(244,63,94,0.08)" stroke="rgba(244,63,94,0.3)" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="335" y="94" textAnchor="middle" fill="#f43f5e" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">Cannot Decrypt</text>

      {/* No plaintext on server */}
      <rect x="290" y="110" width="90" height="22" rx="4" fill="rgba(163,230,53,0.08)" stroke="rgba(163,230,53,0.25)" strokeWidth="0.5" />
      <text x="335" y="124" textAnchor="middle" fill="#a3e635" fontSize="6.5" fontWeight="600" fontFamily="JetBrains Mono">Zero Knowledge</text>

      <defs>
        <marker id="arrow-cyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee" />
        </marker>
      </defs>
    </svg>
  );
}

export default function VaultPreview() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 500px at 70% 40%, rgba(34,211,238,0.05), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-dim border border-cyan/20 mb-4">
            <Key className="w-3 h-3 text-cyan" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan">Client-Side Encryption</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-4">
            ZERO-KNOWLEDGE{' '}
            <span className="text-cyan">CREDENTIAL VAULT</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Your credentials, server keys, and database passwords undergo client-side AES-256-GCM encryption
            before they ever hit the wire. <span className="text-rose font-semibold">Plain text is completely invisible</span> to UptimeOps servers.
          </p>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left: Encryption flow */}
          <div className="glass-surface rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-dim border border-cyan/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Encryption Pipeline</h3>
                <p className="text-[10px] text-text-muted">Client-side AES-256-GCM flow</p>
              </div>
            </div>
            <EncryptionFlow />
          </div>

          {/* Right: Visual diagram */}
          <div className="glass-surface rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-magenta-dim border border-magenta/30 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-magenta" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Data Flow</h3>
                <p className="text-[10px] text-text-muted">Plaintext never leaves your browser</p>
              </div>
            </div>
            <VaultDiagram />
          </div>
        </div>

        {/* Compliance badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: 'SOC 2 Type II', desc: 'Audited controls' },
            { icon: Lock, label: 'AES-256-GCM', desc: 'Military-grade encryption' },
            { icon: EyeOff, label: 'Zero Knowledge', desc: 'Server never sees plaintext' },
            { icon: CheckCircle2, label: 'HIPAA Ready', desc: 'Healthcare compliant' },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-3 p-4 glass-surface rounded-lg border border-surface-border/50"
            >
              <badge.icon className="w-5 h-5 text-lime shrink-0" />
              <div>
                <div className="text-xs font-bold text-text-primary">{badge.label}</div>
                <div className="text-[10px] text-text-muted">{badge.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
