// UptimeOps v2.1 — Security Score Card
// Large 0-100 score display with color coding

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SecurityScoreCardProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#a3e635';   // lime
  if (score >= 60) return '#22d3ee';   // cyan
  if (score >= 40) return '#f59e0b';   // amber
  return '#e879f9';                     // magenta
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score > 0) return 'At Risk';
  return 'Not Scanned';
}

function getScoreIcon(score: number) {
  if (score >= 80) return TrendingUp;
  if (score >= 60) return Minus;
  return TrendingDown;
}

export function SecurityScoreCard({ score, size = 'md', showLabel = true, className = '' }: SecurityScoreCardProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const Icon = getScoreIcon(score);

  const sizeMap = {
    sm: { ring: 48, stroke: 4, text: 'text-lg', sub: 'text-[10px]' },
    md: { ring: 80, stroke: 6, text: 'text-3xl', sub: 'text-xs' },
    lg: { ring: 140, stroke: 8, text: 'text-5xl', sub: 'text-sm' },
  };

  const s = sizeMap[size];
  const r = s.ring / 2 - s.stroke;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: s.ring, height: s.ring }}>
        <svg width={s.ring} height={s.ring} className="-rotate-90">
          <circle
            cx={s.ring / 2} cy={s.ring / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={s.stroke}
          />
          <circle
            cx={s.ring / 2} cy={s.ring / 2} r={r}
            fill="none" stroke={color} strokeWidth={s.stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${s.text} font-black`} style={{ color }}>{score}</span>
          {size !== 'sm' && <span className="text-[10px] text-white/40">/100</span>}
        </div>
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className={`${s.sub} font-medium`} style={{ color }}>{label}</span>
        </div>
      )}
    </div>
  );
}
