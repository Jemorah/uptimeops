// ═══════════════════════════════════════════════════════════════
// SECTION 1: HERO SPHERE
// Full-viewport animated gradient mesh + headline + CTAs + stats
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Zap, AlertTriangle, TrendingUp, Clock, Globe, ChevronRight } from 'lucide-react';

// ── Animated counter hook ──
function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export default function HeroSphere() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const incidents = useCountUp(2847, 2500);
  const responseTime = useCountUp(12, 2500);
  const infrastructures = useCountUp(156, 2500);

  const dashboardPath =
    role === 'admin' || role === 'coordinator' ? '/hq' :
    role === 'engineer' ? '/engineer' :
    role === 'customer' ? '/customer' : '';

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 bg-void">
        <div className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(ellipse 600px 400px at 20% 50%, rgba(163,230,53,0.25), transparent 70%),
              radial-gradient(ellipse 500px 350px at 80% 40%, rgba(34,211,238,0.2), transparent 70%),
              radial-gradient(ellipse 450px 400px at 50% 80%, rgba(232,121,249,0.18), transparent 70%)
            `,
            animation: 'meshDrift 20s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 opacity-20"
          style={{
            background: `
              radial-gradient(ellipse 300px 200px at 30% 30%, rgba(163,230,53,0.3), transparent),
              radial-gradient(ellipse 250px 200px at 70% 60%, rgba(244,63,94,0.15), transparent)
            `,
            animation: 'meshDrift 15s ease-in-out infinite reverse',
          }}
        />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(163,230,53,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-dim border border-lime/20 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-lime">
            AI-Powered Infrastructure Recovery
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 animate-slide-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          <span className="text-text-primary">YOUR INFRASTRUCTURE</span>
          <br />
          <span className="text-text-primary">NEVER SLEEPS.</span>
          <br />
          <span className="text-lime">NEITHER DO WE.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
          style={{ animationDelay: '0.25s', animationFillMode: 'both' }}
        >
          Your site is down. We fix it — verified, audited, secure. Powered by autonomous
          CodeGraph intelligence and vetted by a{' '}
          <span className="text-cyan font-semibold">42-scanner zero-trust</span>{' '}
          security matrix.
        </p>

        {/* CTA Array */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          {isAuthenticated && dashboardPath ? (
            <button
              onClick={() => navigate(dashboardPath)}
              className="group flex items-center gap-2 px-8 py-4 bg-lime text-void-deep font-black text-sm uppercase tracking-wider rounded-lg hover:bg-lime-light transition-all duration-200 hover:shadow-[0_0_30px_rgba(163,230,53,0.4)]"
            >
              <Zap className="w-4 h-4" />
              Go to Dashboard
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/login?intent=subscribe')}
              className="group flex items-center gap-2 px-8 py-4 bg-lime text-void-deep font-black text-sm uppercase tracking-wider rounded-lg hover:bg-lime-light transition-all duration-200 hover:shadow-[0_0_30px_rgba(163,230,53,0.4)]"
            >
              <Zap className="w-4 h-4" />
              Get Protected
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <button
            onClick={() => navigate('/emergency')}
            className="group flex items-center gap-2 px-8 py-4 bg-rose/10 text-rose font-black text-sm uppercase tracking-wider rounded-lg border border-rose/30 hover:bg-rose/20 hover:border-rose/50 transition-all duration-200 animate-pulse-slow"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Active Emergency
          </button>
        </div>

        {/* Stats Ticker */}
        <div
          className="glass-surface rounded-xl p-6 animate-slide-up"
          style={{ animationDelay: '0.55s', animationFillMode: 'both' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <StatItem icon={TrendingUp} value={incidents.toLocaleString()} label="Incidents Remediated This Month" color="lime" />
            <StatItem icon={Clock} value={`${responseTime}m`} label="Average Response Time" color="cyan" />
            <StatItem icon={Globe} value={infrastructures.toString()} label="Global Infrastructures Protected" color="magenta" />
            <StatItem icon={Zap} value="99.7%" label="Resolution Success Rate" color="lime" />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
        <span className="text-[10px] uppercase tracking-widest text-text-muted">Scroll</span>
        <div className="w-px h-6 bg-lime/50" />
      </div>

      {/* meshDrift keyframe injected via style tag */}
      <style>{`
        @keyframes meshDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(3%, -2%) scale(1.05); }
          50% { transform: translate(-2%, 3%) scale(0.98); }
          75% { transform: translate(2%, 2%) scale(1.02); }
        }
      `}</style>
    </section>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  color: 'lime' | 'cyan' | 'magenta' | 'rose';
}) {
  const colorMap = {
    lime: 'text-lime',
    cyan: 'text-cyan',
    magenta: 'text-magenta',
    rose: 'text-rose',
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colorMap[color]}`} />
        <span className={`text-2xl sm:text-3xl font-black ${colorMap[color]}`}>{value}</span>
      </div>
      <div className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}
