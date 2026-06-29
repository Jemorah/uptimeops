// ═══════════════════════════════════════════════════════════════
// AGENT PIPELINE HOOK — UptimeOps v2.1
// Calls real ai-orchestrator Edge Function. No mock data.
// Subscribes to pipeline_states and scan_results for live updates.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface PipelineState {
  pipeline_id: string;
  incident_id: string;
  current_step: string;
  status: string;
  confidence: number;
  step_results: Record<string, unknown>;
  started_at: string;
  updated_at: string;
  error_count: number;
}

export interface PipelineScan {
  id: string;
  agent_stage: string;
  scanner_name: string;
  status: string;
  confidence_score: number | null;
  findings: any[];
  severity_counts: Record<string, number>;
  execution_time_ms: number | null;
  created_at: string;
}

interface UseAgentPipelineReturn {
  pipeline: PipelineState | null;
  scans: PipelineScan[];
  loading: boolean;
  error: string | null;
  startPipeline: () => Promise<void>;
  retryStage: (stage: string) => Promise<void>;
  approveDeploy: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAgentPipeline(incidentId: string | null): UseAgentPipelineReturn {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [scans, setScans] = useState<PipelineScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch pipeline + scans ──
  const fetchData = useCallback(async () => {
    if (!incidentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      // Fetch pipeline state
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipeline_states')
        .select('*')
        .eq('incident_id', incidentId)
        .maybeSingle();

      if (pipelineError) throw pipelineError;
      setPipeline(pipelineData);

      // Fetch scan results
      const { data: scanData, error: scanError } = await supabase
        .from('scan_results')
        .select('id, agent_stage, scanner_name, status, confidence_score, findings, severity_counts, execution_time_ms, created_at')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (scanError) throw scanError;
      setScans(scanData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  // ── Call ai-orchestrator Edge Function ──
  const callOrchestrator = useCallback(async (action: string, stage?: string) => {
    if (!incidentId) throw new Error('No incident ID');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const resp = await fetch(`${import.meta.env.NEXT_SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ incident_id: incidentId, action, stage }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new Error(err.error || `Orchestrator failed: ${resp.status}`);
    }

    return resp.json();
  }, [incidentId]);

  const startPipeline = useCallback(async () => {
    setLoading(true);
    try {
      await callOrchestrator('start');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to start pipeline');
    } finally {
      setLoading(false);
    }
  }, [callOrchestrator, fetchData]);

  const retryStage = useCallback(async (stage: string) => {
    setLoading(true);
    try {
      await callOrchestrator('retry', stage);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || `Failed to retry ${stage}`);
    } finally {
      setLoading(false);
    }
  }, [callOrchestrator, fetchData]);

  const approveDeploy = useCallback(async () => {
    setLoading(true);
    try {
      await callOrchestrator('approve');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve deploy');
    } finally {
      setLoading(false);
    }
  }, [callOrchestrator, fetchData]);

  // ── Initial fetch + realtime subscriptions ──
  useEffect(() => {
    fetchData();
    if (!incidentId) return;

    const pipelineChannel = supabase
      .channel(`pipeline-${incidentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pipeline_states',
        filter: `incident_id=eq.${incidentId}`,
      }, () => fetchData())
      .subscribe();

    const scanChannel = supabase
      .channel(`scans-${incidentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'scan_results',
        filter: `incident_id=eq.${incidentId}`,
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(pipelineChannel);
      supabase.removeChannel(scanChannel);
    };
  }, [incidentId, fetchData]);

  return {
    pipeline,
    scans,
    loading,
    error,
    startPipeline,
    retryStage,
    approveDeploy,
    refresh: fetchData,
  };
}
