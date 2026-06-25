import { useState, useEffect } from 'react';
import { Lock, Shield, Key, EyeOff, CheckCircle, Fingerprint } from 'lucide-react';

interface EncryptionVisualizerProps {
  state: 'idle' | 'encrypting' | 'locked' | 'error';
  fingerprint?: string;
  onComplete?: () => void;
}

export function EncryptionVisualizer({ state, fingerprint, onComplete }: EncryptionVisualizerProps) {
  const [dots, setDots] = useState(0);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (state === 'encrypting') {
      const interval = setInterval(() => setDots(d => (d + 1) % 4), 300);
      return () => clearInterval(interval);
    }
    if (state === 'locked') {
      setShowPulse(true);
      const timer = setTimeout(() => {
        setShowPulse(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, onComplete]);

  if (state === 'idle') return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/5 bg-elevated">
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Background glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          state === 'encrypting' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(209,255,0,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative p-6 flex flex-col items-center text-center space-y-4">
        {/* Lock Icon Animation */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Rotating ring (encrypting only) */}
          {state === 'encrypting' && (
            <div className="absolute inset-0 rounded-full border-2 border-lime/30 border-t-lime animate-spin" />
          )}

          {/* Success pulse ring (locked) */}
          {showPulse && (
            <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-50" />
          )}

          {/* Core icon */}
          <div
            className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
              state === 'encrypting'
                ? 'bg-lime/20'
                : state === 'locked'
                ? 'bg-green-500/20'
                : 'bg-magenta/20'
            }`}
          >
            {state === 'encrypting' && (
              <Key className="w-6 h-6 text-lime animate-pulse" />
            )}
            {state === 'locked' && (
              <Lock className="w-6 h-6 text-green-500" />
            )}
            {state === 'error' && (
              <EyeOff className="w-6 h-6 text-magenta" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="space-y-1">
          <h4
            className={`text-sm font-bold uppercase tracking-wider transition-colors ${
              state === 'encrypting'
                ? 'text-lime'
                : state === 'locked'
                ? 'text-green-500'
                : 'text-magenta'
            }`}
          >
            {state === 'encrypting' && (
              <>Encrypting in your browser{'.'.repeat(dots)}</>
            )}
            {state === 'locked' && 'LOCKED. SECURE.'}
            {state === 'error' && 'Encryption failed. Try again.'}
          </h4>
          <p className="text-xs text-white/40 max-w-xs">
            {state === 'encrypting' &&
              'Your credentials are being encrypted with AES-256-GCM using a key that never leaves your browser.'}
            {state === 'locked' &&
              'Credentials encrypted. The decryption key exists only in your browser session and will be shared directly with the isolated repair VM via secure channel.'}
            {state === 'error' &&
              'Something went wrong during encryption. Your credentials were never sent to our servers.'}
          </p>
        </div>

        {/* Security Steps (encrypting) */}
        {state === 'encrypting' && (
          <div className="w-full space-y-2">
            {[
              { icon: Key, text: 'Generating ephemeral AES-256 key', done: true },
              { icon: Lock, text: 'Encrypting credentials in browser', done: false, active: true },
              { icon: EyeOff, text: 'Original key destroyed from memory', done: false },
              { icon: Shield, text: 'Sending ciphertext only (zero-knowledge)', done: false },
            ].map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 text-xs transition-all duration-300 ${
                  step.active
                    ? 'text-lime'
                    : step.done
                    ? 'text-white/40'
                    : 'text-white/20'
                }`}
              >
                <step.icon className={`w-3.5 h-3.5 ${step.active ? 'animate-pulse' : ''}`} />
                <span className={step.done ? 'line-through' : ''}>{step.text}</span>
                {step.done && <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />}
              </div>
            ))}
          </div>
        )}

        {/* Fingerprint (locked) */}
        {state === 'locked' && fingerprint && (
          <div className="w-full bg-void/50 rounded p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint className="w-3.5 h-3.5 text-lime" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Key Fingerprint
              </span>
            </div>
            <code className="text-xs font-mono text-lime break-all">{fingerprint}</code>
            <p className="text-xs text-white/30 mt-2">
              Save this fingerprint to verify your key later. We cannot recover it.
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Shield className="w-3 h-3" />
            <span>AES-256-GCM</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <EyeOff className="w-3 h-3" />
            <span>Zero-Knowledge</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Lock className="w-3 h-3" />
            <span>Client-Side</span>
          </div>
        </div>
      </div>
    </div>
  );
}
