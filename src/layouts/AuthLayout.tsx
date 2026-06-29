// ═══════════════════════════════════════════════════════════════
// AUTH LAYOUT — 50/50 Split Screen
// Left: Animated circuit/data stream panel
// Right: Glassmorphism authentication console
// ═══════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom';
import { Zap, Shield, Lock, Radio } from 'lucide-react';

// ── Animated Circuit Panel (Left Side) ──
function CircuitPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-void-deep items-center justify-center">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)',
            top: '10%',
            left: '20%',
            animation: 'orbFloat1 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(232,121,249,0.4) 0%, transparent 70%)',
            bottom: '15%',
            right: '10%',
            animation: 'orbFloat2 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(163,230,53,0.4) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            animation: 'orbFloat3 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* SVG Circuit Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-magenta" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e879f9" stopOpacity="0" />
            <stop offset="50%" stopColor="#e879f9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-lime" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
            <stop offset="50%" stopColor="#a3e635" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal data streams */}
        <line x1="0" y1="150" x2="800" y2="150" stroke="url(#grad-cyan)" strokeWidth="0.5">
          <animate attributeName="x1" from="-200" to="800" dur="4s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0" to="1000" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="0" y1="300" x2="800" y2="300" stroke="url(#grad-magenta)" strokeWidth="0.5">
          <animate attributeName="x1" from="-200" to="800" dur="5.5s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0" to="1000" dur="5.5s" repeatCount="indefinite" />
        </line>
        <line x1="0" y1="450" x2="800" y2="450" stroke="url(#grad-lime)" strokeWidth="0.5">
          <animate attributeName="x1" from="-200" to="800" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0" to="1000" dur="3.5s" repeatCount="indefinite" />
        </line>
        <line x1="0" y1="600" x2="800" y2="600" stroke="url(#grad-cyan)" strokeWidth="0.5">
          <animate attributeName="x1" from="-200" to="800" dur="6s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0" to="1000" dur="6s" repeatCount="indefinite" />
        </line>
        <line x1="0" y1="750" x2="800" y2="750" stroke="url(#grad-magenta)" strokeWidth="0.5">
          <animate attributeName="x1" from="-200" to="800" dur="4.5s" repeatCount="indefinite" />
          <animate attributeName="x2" from="0" to="1000" dur="4.5s" repeatCount="indefinite" />
        </line>

        {/* Vertical circuit traces */}
        <line x1="200" y1="0" x2="200" y2="900" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
        <line x1="400" y1="0" x2="400" y2="900" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />
        <line x1="600" y1="0" x2="600" y2="900" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />

        {/* Circuit nodes */}
        {[150, 300, 450, 600, 750].map((y, i) =>
          [200, 400, 600].map((x, j) => (
            <g key={`${i}-${j}`}>
              <circle cx={x} cy={y} r="3" fill={j === 0 ? '#22d3ee' : j === 1 ? '#e879f9' : '#a3e635'} opacity="0.4">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${3 + j}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r="6" fill="none" stroke={j === 0 ? '#22d3ee' : j === 1 ? '#e879f9' : '#a3e635'} strokeWidth="0.5" opacity="0.2">
                <animate attributeName="r" values="3;10;3" dur={`${4 + j}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur={`${4 + j}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))
        )}

        {/* Connection lines between nodes */}
        <line x1="200" y1="150" x2="400" y2="300" stroke="#22d3ee" strokeWidth="0.3" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="400" y1="300" x2="600" y2="450" stroke="#e879f9" strokeWidth="0.3" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="600" y1="450" x2="200" y2="600" stroke="#a3e635" strokeWidth="0.3" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="200" y1="600" x2="400" y2="750" stroke="#22d3ee" strokeWidth="0.3" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3.5s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Content overlay */}
      <div className="relative z-10 max-w-md px-12 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <Zap className="w-8 h-8 text-lime" />
          <span className="text-2xl font-black tracking-tight">
            UPTIME<span className="text-lime">OPS</span>
          </span>
        </Link>

        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-center gap-2 text-cyan">
            <Lock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">AES-256-GCM Encrypted</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-lime">
            <Shield className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Zero-Knowledge Architecture</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-magenta">
            <Radio className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">6-Agent AI Pipeline</span>
          </div>
        </div>

        <h2 className="text-4xl font-black tracking-tight text-text-primary leading-tight">
          ZERO-TRUST<br />
          <span className="text-cyan">REPAIR.</span><br />
          <span className="text-magenta">SECURE</span> ACCESS.
        </h2>

        <p className="text-sm text-text-secondary mt-6 leading-relaxed">
          Your credentials never touch our servers in plain text. All access is encrypted, audited, and time-bounded.
        </p>

        {/* Bottom trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10">
          <div className="text-center">
            <div className="text-2xl font-black text-lime">42</div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Scanners</div>
          </div>
          <div className="w-px h-8 bg-surface-border" />
          <div className="text-center">
            <div className="text-2xl font-black text-cyan">99.7%</div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Uptime</div>
          </div>
          <div className="w-px h-8 bg-surface-border" />
          <div className="text-center">
            <div className="text-2xl font-black text-magenta">&lt;5m</div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Response</div>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes orbFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -20px); } }
        @keyframes orbFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, 30px); } }
        @keyframes orbFloat3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 20px); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// AUTH LAYOUT WRAPPER
// ═══════════════════════════════════════════
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-void">
      <CircuitPanel />
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 py-8 relative">
        {children}
      </div>
    </div>
  );
}
