// UptimeOps v2.1 — Scan Results Hook
// Fetches and subscribes to scan_results for an incident

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface ScanResult {
  id: string;
  incident_id: string;
  agent_stage: string;
  scanner_name: string;
  findings: any[];
  severity_counts: Record<string, number>;
  confidence_score: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  execution_time_ms: number | null;
  created_at: string;
}

export function useScanResults(incidentId: string | null) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    if (!incidentId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) setError(error.message);
    else setScans(data || []);
    setLoading(false);
  }, [incidentId]);

  useEffect(() => {
    fetchScans();
    if (!incidentId) return;

    const channel = supabase
      .channel(`scans-${incidentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scan_results', filter: `incident_id=eq.${incidentId}` },
        () => fetchScans()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [incidentId, fetchScans]);

  const byStage = (stage: string) => scans.filter(s => s.agent_stage === stage);
  const completedCount = scans.filter(s => s.status === 'completed').length;
  const failedCount = scans.filter(s => s.status === 'failed').length;
  const avgConfidence = scans.length
    ? Math.round(scans.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / scans.length)
    : 0;

  const severityTotals = scans.reduce((acc: Record<string, number>, s) => {
    const counts = s.severity_counts || {};
    Object.entries(counts).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + (v as number); });
    return acc;
  }, {});

  return { scans, loading, error, byStage, completedCount, failedCount, avgConfidence, severityTotals, refresh: fetchScans };
}
