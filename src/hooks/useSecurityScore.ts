// UptimeOps v2.1 — Security Score Hook
// Calculates aggregate security score from scan_results per incident or customer

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface SecurityBreakdown {
  codeQuality: number;
  vulnerability: number;
  secrets: number;
  dependencies: number;
  malware: number;
}

export function useSecurityScore(incidentId?: string | null, customerId?: string | null) {
  const [score, setScore] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<SecurityBreakdown>({
    codeQuality: 0, vulnerability: 0, secrets: 0, dependencies: 0, malware: 0,
  });
  const [trend, setTrend] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScore = useCallback(async () => {
    setLoading(true);

    if (incidentId) {
      // Single incident score
      const { data } = await supabase.from('incidents')
        .select('security_score')
        .eq('id', incidentId)
        .single();
      setScore(data?.security_score || 0);

      // Get scan breakdown by stage
      const { data: scans } = await supabase.from('scan_results')
        .select('agent_stage, confidence_score')
        .eq('incident_id', incidentId)
        .eq('status', 'completed');

      const b: SecurityBreakdown = { codeQuality: 0, vulnerability: 0, secrets: 0, dependencies: 0, malware: 0 };
      const stageMap: Record<string, keyof SecurityBreakdown> = {
        repair: 'codeQuality',
        validate: 'vulnerability',
        triage: 'secrets',
        isolate: 'dependencies',
        deploy: 'malware',
      };

      scans?.forEach((s: any) => {
        const key = stageMap[s.agent_stage];
        if (key && s.confidence_score != null) {
          b[key] = Math.max(b[key], s.confidence_score);
        }
      });

      setBreakdown(b);
    } else if (customerId) {
      // Aggregate across all customer incidents
      const { data: incidents } = await supabase.from('incidents')
        .select('security_score, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      const scores = (incidents || []).filter((i: any) => i.security_score != null);
      const avg = scores.length
        ? Math.round(scores.reduce((sum: number, i: any) => sum + i.security_score, 0) / scores.length)
        : 0;

      setScore(avg);

      // Build trend
      const t = scores.slice(-30).map((i: any) => ({
        date: i.created_at.split('T')[0],
        score: i.security_score,
      }));
      setTrend(t);
    }

    setLoading(false);
  }, [incidentId, customerId]);

  useEffect(() => {
    fetchScore();

    // Subscribe to scan_results changes
    const table = incidentId ? 'scan_results' : 'incidents';
    const channel = supabase
      .channel(`security-${incidentId || customerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchScore())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchScore, incidentId, customerId]);

  return { score, breakdown, trend, loading, refresh: fetchScore };
}
