// ═══════════════════════════════════════════════════════════════
// INCIDENT LIFECYCLE HOOK — UptimeOps v2.1
// Fetches real incident data from Supabase. No mock data.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface LifecycleHistoryEntry {
  stage: string;
  status: string;
  timestamp: string;
  note: string;
  actor: string;
}

export interface AuditReport {
  id: string;
  incident_id: string;
  generated_at: string;
  total_duration_minutes: number | null;
  total_cost: number | null;
  root_cause: string | null;
  fix_description: string | null;
  compliance_certificate_id: string | null;
  files_modified: number | null;
  tests_passed: number | null;
  tests_failed: number | null;
}

export interface IncidentLifecycle {
  id: string;
  customer_id: string;
  status: string;
  priority: string;
  title: string;
  website_url: string | null;
  assigned_engineer: string | null;
  ai_confidence: number | null;
  security_score: number | null;
  created_at: string;
  resolved_at: string | null;
  history: LifecycleHistoryEntry[];
  auditReport: AuditReport | null;
}

interface UseIncidentLifecycleReturn {
  lifecycle: IncidentLifecycle | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  assignEngineer: (engineerId: string) => Promise<void>;
}

export function useIncidentLifecycle(incidentId: string | null): UseIncidentLifecycleReturn {
  const [lifecycle, setLifecycle] = useState<IncidentLifecycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!incidentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      // Fetch incident
      const { data: incident, error: incError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (incError) throw incError;
      if (!incident) { setError('Incident not found'); return; }

      // Fetch audit logs as history
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', incidentId)
        .order('created_at', { ascending: true });

      const history: LifecycleHistoryEntry[] = (auditLogs || []).map((log: any) => ({
        stage: log.operation || 'unknown',
        status: log.metadata?.status || 'completed',
        timestamp: log.created_at,
        note: log.metadata?.note || `${log.operation} on ${log.table_name}`,
        actor: log.performed_by_type || 'system',
      }));

      // Fetch audit report
      const { data: auditReportData } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('incident_id', incidentId)
        .maybeSingle();

      setLifecycle({
        id: incident.id,
        customer_id: incident.customer_id,
        status: incident.status,
        priority: incident.priority,
        title: incident.title,
        website_url: incident.website_url,
        assigned_engineer: incident.assigned_engineer,
        ai_confidence: incident.ai_confidence,
        security_score: incident.security_score,
        created_at: incident.created_at,
        resolved_at: incident.resolved_at,
        history,
        auditReport: auditReportData || null,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch lifecycle data');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  const updateStatus = useCallback(async (status: string) => {
    if (!incidentId) return;
    const { error } = await supabase
      .from('incidents')
      .update({ status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) })
      .eq('id', incidentId);
    if (error) setError(error.message);
    else await fetchData();
  }, [incidentId, fetchData]);

  const assignEngineer = useCallback(async (engineerId: string) => {
    if (!incidentId) return;
    const { error } = await supabase
      .from('incidents')
      .update({ assigned_engineer: engineerId })
      .eq('id', incidentId);
    if (error) setError(error.message);
    else await fetchData();
  }, [incidentId, fetchData]);

  useEffect(() => {
    fetchData();
    if (!incidentId) return;

    const channel = supabase
      .channel(`lifecycle-${incidentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incidents',
        filter: `id=eq.${incidentId}`,
      }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [incidentId, fetchData]);

  return { lifecycle, loading, error, refresh: fetchData, updateStatus, assignEngineer };
}
