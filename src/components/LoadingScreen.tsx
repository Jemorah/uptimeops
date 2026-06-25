// ═══════════════════════════════════════════════════════════════
// LOADING SCREEN — UptimeOps Branded Skeleton
// Shows during code-split chunk loading and initial data fetch
// ═══════════════════════════════════════════════════════════════

import { Zap, Activity, Radio } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  variant?: 'full' | 'inline' | 'card';
}

export function LoadingScreen({ message = 'Initializing', variant = 'full' }: LoadingScreenProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4">
        <Zap className="w-4 h-4 text-lime animate-pulse" />
        <span className="text-xs text-white/40 uppercase tracking-wider animate-pulse">
          {message}...
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-surface border border-white/5 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/5 w-1/3" />
          <div className="h-3 bg-white/5 w-2/3" />
          <div className="h-3 bg-white/5 w-1/2" />
        </div>
      </div>
    );
  }

  // Full-screen loader
  return (
    <div className="fixed inset-0 z-50 bg-void flex flex-col items-center justify-center">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(209,255,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(209,255,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo animation */}
        <div className="relative">
          <div className="w-16 h-16 border border-lime/30 bg-lime/5 flex items-center justify-center">
            <Zap className="w-8 h-8 text-lime" />
          </div>
          <div className="absolute -inset-2 border border-lime/10 animate-ping opacity-20" />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-lg font-black tracking-[0.3em] uppercase">
            <span className="text-lime">Uptime</span>
            <span className="text-white">Ops</span>
          </h1>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-[2px] bg-white/5 overflow-hidden">
          <div className="h-full bg-lime animate-[loadingBar_1.5s_ease-in-out_infinite]" />
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 text-[10px] text-white/30 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-lime animate-pulse" />
            Connecting
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan animate-pulse" style={{ animationDelay: '0.3s' }} />
            Loading
          </span>
        </div>

        <p className="text-[10px] text-white/20 font-mono">{message}...</p>
      </div>

      <style>{`
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Skeleton components for partial loading ──

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-white/5 p-4 space-y-3">
      <div className="h-4 bg-white/5 w-1/3 animate-pulse" />
      <div className="h-8 bg-white/5 w-1/4 animate-pulse" />
      <div className="h-3 bg-white/5 w-full animate-pulse" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.01] border border-white/5">
          <div className="w-4 h-4 bg-white/5 animate-pulse" />
          <div className="flex-1 h-3 bg-white/5 animate-pulse" />
          <div className="w-20 h-3 bg-white/5 animate-pulse" />
          <div className="w-16 h-3 bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-${Math.min(count, 4)} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-white/5 p-4 space-y-2">
          <div className="h-3 bg-white/5 w-1/2 animate-pulse" />
          <div className="h-8 bg-white/5 w-1/3 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
