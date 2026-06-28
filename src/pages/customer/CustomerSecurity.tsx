// UptimeOps v2.1 — Customer Security Page
// Overall security posture, trends, findings, report download

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityScore } from '@/hooks/useSecurityScore';
import { SecurityScoreCard } from '@/components/security/SecurityScoreCard';
import { ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export function CustomerSecurity() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { score, breakdown, trend } = useSecurityScore(null, customerId);
  const [recentFindings, setRecentFindings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('customers').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setCustomerId(data.id);
    });
  }, [user]);

  useEffect(() => {
    if (!customerId) return;
    supabase.rpc('get_customer_findings', { p_customer_id: customerId }).then(({ data }) => {
      setRecentFindings(data || []);
    }).then(() => {}, () => {
      // Fallback: fetch from scan_results via incidents
      supabase.from('incidents').select('id').eq('customer_id', customerId).then(({ data: incs }) => {
        if (!incs?.length) return;
        const ids = incs.map(i => i.id);
        supabase.from('scan_results')
          .select('scanner_name, findings, severity_counts, status, created_at, agent_stage')
          .in('incident_id', ids)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => {
            if (!data) return;
            const flat = data.flatMap((s: any) =>
              (s.findings || []).map((f: any) => ({
                scanner: s.scanner_name,
                severity: f.severity || 'info',
                message: f.message || f.text || 'Unknown',
                stage: s.agent_stage,
                date: s.created_at,
              }))
            ).slice(0, 20);
            setRecentFindings(flat);
          });
      });
    });
  }, [customerId]);

  const radarData = [
    { subject: 'Code Quality', A: breakdown.codeQuality, fullMark: 100 },
    { subject: 'Vulnerability', A: breakdown.vulnerability, fullMark: 100 },
    { subject: 'Secrets', A: breakdown.secrets, fullMark: 100 },
    { subject: 'Dependencies', A: breakdown.dependencies, fullMark: 100 },
    { subject: 'Malware', A: breakdown.malware, fullMark: 100 },
  ];

  const sevColor = (s: string) => {
    if (s === 'critical') return '#ef4444';
    if (s === 'high') return '#f97316';
    if (s === 'medium') return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Security Posture</h1>
          <p className="text-xs text-white/40 mt-0.5">Aggregated from 42-scanner validation across all incidents</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20 transition-all">
          <Download className="w-3.5 h-3.5" /> Security Report
        </button>
      </div>

      {/* Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center">
          <SecurityScoreCard score={score} size="lg" />
          <p className="text-xs text-white/30 mt-3 text-center">Overall Security Score</p>
        </div>
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-bold text-white/60 mb-3">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
              <Radar name="Score" dataKey="A" stroke="#a3e635" fill="#a3e635" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend + Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-bold text-white/60 mb-3">30-Day Security Trend</h3>
          {trend.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <Tooltip contentStyle={{ background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="#a3e635" strokeWidth={2} dot={{ fill: '#a3e635', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-white/30">Not enough data yet</div>
          )}
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-bold text-white/60 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#e879f9]" /> Recent Findings
          </h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {recentFindings.length === 0 ? (
              <p className="text-xs text-white/30">No findings yet</p>
            ) : (
              recentFindings.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sevColor(f.severity) }} />
                  <span className="text-[10px] font-bold uppercase px-1 rounded shrink-0" style={{ backgroundColor: `${sevColor(f.severity)}20`, color: sevColor(f.severity) }}>{f.severity}</span>
                  <span className="text-[11px] text-white/60 flex-1 truncate">{f.message}</span>
                  <span className="text-[10px] text-white/30 shrink-0">{f.scanner}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 p-3 bg-[#a3e635]/5 border border-[#a3e635]/10 rounded-lg">
        <ShieldCheck className="w-4 h-4 text-[#a3e635]" />
        <span className="text-xs text-white/60">Protected by <span className="text-[#a3e635] font-bold">42 security scanners</span> across 6 pipeline stages</span>
      </div>
    </div>
  );
}
