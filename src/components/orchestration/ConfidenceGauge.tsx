import { useEffect, useRef } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConfidenceGaugeProps {
  score: number | null;
}

export function ConfidenceGauge({ score }: ConfidenceGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 60;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const targetValue = score ?? 0;

    let currentValue = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Background arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineCap = 'round';
      ctx.stroke();

      if (targetValue > 0) {
        // Color based on score
        const color = targetValue >= 90
          ? '#22c55e'
          : targetValue >= 70
          ? '#eab308'
          : targetValue >= 50
          ? '#f97316'
          : '#ef4444';

        const glowColor = targetValue >= 90
          ? 'rgba(34, 197, 94, 0.3)'
          : targetValue >= 70
          ? 'rgba(234, 179, 8, 0.3)'
          : targetValue >= 50
          ? 'rgba(249, 115, 22, 0.3)'
          : 'rgba(239, 68, 68, 0.3)';

        // Ease current value
        currentValue += (targetValue - currentValue) * 0.08;

        const valueAngle = startAngle + (endAngle - startAngle) * (currentValue / 100);

        // Glow
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
        ctx.lineWidth = 10;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center text
        ctx.fillStyle = color;
        ctx.font = 'bold 28px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(currentValue)}%`, centerX, centerY - 5);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('CONFIDENCE', centerX, centerY + 18);

        // Threshold marker at 90%
        const thresholdAngle = startAngle + (endAngle - startAngle) * 0.9;
        const tx = centerX + Math.cos(thresholdAngle) * (radius + 12);
        const ty = centerY + Math.sin(thresholdAngle) * (radius + 12);
        ctx.fillStyle = '#d1ff00';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText('90%', tx, ty);

        animRef.current = requestAnimationFrame(draw);
      } else {
        // No score yet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WAITING', centerX, centerY);
      }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  const status = score === null
    ? { label: 'PENDING', color: 'text-white/40', icon: Shield, desc: 'Validation not started' }
    : score >= 90
    ? { label: 'READY TO DEPLOY', color: 'text-green-500', icon: CheckCircle, desc: 'Coordinator approval required' }
    : score >= 70
    ? { label: 'REVIEW REQUIRED', color: 'text-yellow-500', icon: AlertTriangle, desc: 'Engineer escalation recommended' }
    : score >= 50
    ? { label: 'LOW CONFIDENCE', color: 'text-orange-400', icon: AlertTriangle, desc: 'Auto-rollback triggered' }
    : { label: 'CRITICAL FAILURE', color: 'text-red-500', icon: AlertTriangle, desc: 'Immediate escalation required' };

  const StatusIcon = status.icon;

  return (
    <div className="bg-surface border border-white/5 p-6 flex flex-col items-center">
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4 self-start">
        AI Confidence Score
      </h3>
      <canvas ref={canvasRef} className="mb-4" />
      <div className={`flex items-center gap-2 text-sm font-bold ${status.color}`}>
        <StatusIcon className="w-4 h-4" />
        {status.label}
      </div>
      <p className="text-xs text-white/40 mt-1">{status.desc}</p>
    </div>
  );
}
