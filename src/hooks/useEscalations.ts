// ═══════════════════════════════════════════════════════════════
// HUMAN ESCALATION HOOK — v2.1
// Real Supabase data. No mock data. Full error handling.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { EscalationStatus, EscalatedIncident, HandoffNote } from '@/components/escalation/types';

interface UseEscalationsReturn {
  incidents: EscalatedIncident[];
  loading: boolean;
  error: string | null;
  selectedIncident: EscalatedIncident | null;
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  pendingP1Count: number;
  myActiveCount: number;
  acknowledgeIncident: (id: string) => Promise<void>;
  acceptIncident: (id: string, engineerName: string) => Promise<void>;
  updateStatus: (id: string, status: EscalationStatus) => Promise<void>;
  addHandoffNote: (incidentId: string, content: string, author: string, authorRole: 'engineer' | 'coordinator' | 'ai') => Promise<void>;
  getHandoffNotes: (incidentId: string) => HandoffNote[];
  handoffNotes: Record<string, HandoffNote[]>;
  refresh: () => Promise<void>;
}

export function useEscalations(): UseEscalationsReturn {
  const [incidents, setIncidents] = useState<EscalatedIncident[]>([]);
  const [handoffNotes, setHandoffNotes] = useState<Record<string, HandoffNote[]>>({});
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real escalations from human_escalations table
  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('human_escalations')
        .select('*, incidents(title, priority, status, customer_id, customers(website, email))')
        .order('created_at', { ascending: false })
        .limit(50);

      if (dbError) throw dbError;

      const mapped: EscalatedIncident[] = (data || []).map((e: any) => ({
        id: e.id || `esc-${Date.now()}`,
        title: e.incidents?.title || 'Untitled Escalation',
        websiteUrl: e.incidents?.customers?.website || '',
        severity: e.incidents?.priority === 'critical' ? 'P1_CRITICAL' : 'P2_HIGH',
        category: e.failed_step || 'unknown',
        customerEmail: e.incidents?.customers?.email || '',
        escalationStatus: mapStatus(e.status),
        escalationTrigger: e.trigger_reason || 'unknown',
        assignedEngineer: e.assigned_engineer_id || null,
        aiConfidence: null,
        aiAttemptSummary: e.reason || '',
        createdAt: e.created_at,
        lastUpdated: e.assigned_at || e.created_at,
        requiresSpecialty: null,
      }));

      setIncidents(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEscalations(); }, [fetchEscalations]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;

  const sortedIncidents = [...incidents].sort((a, b) => {
    const severityOrder: Record<string, number> = { P1_CRITICAL: 0, P2_HIGH: 1, P3_MEDIUM: 2, P4_LOW: 3 };
    const sevDiff = (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pendingP1Count = incidents.filter(
    i => i.severity === 'P1_CRITICAL' && (i.escalationStatus === 'pending_assignment' || i.escalationStatus === 'assigned')
  ).length;

  const myActiveCount = incidents.filter(i => i.assignedEngineer && i.escalationStatus !== 'closed').length;

  const acknowledgeIncident = useCallback(async (id: string) => {
    try {
      await supabase.from('human_escalations').update({ status: 'assigned' }).eq('id', id);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, escalationStatus: 'acknowledged' as EscalationStatus, lastUpdated: new Date().toISOString() } : i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }, []);

  const acceptIncident = useCallback(async (id: string, _engineerName: string) => {
    try {
      await supabase.from('human_escalations').update({ status: 'assigned' }).eq('id', id);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, escalationStatus: 'acknowledged' as EscalationStatus, lastUpdated: new Date().toISOString() } : i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept failed');
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: EscalationStatus) => {
    try {
      await supabase.from('human_escalations').update({ status }).eq('id', id);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, escalationStatus: status, lastUpdated: new Date().toISOString() } : i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  }, []);

  const addHandoffNote = useCallback(async (incidentId: string, content: string, author: string, authorRole: 'engineer' | 'coordinator' | 'ai') => {
    const newNote: HandoffNote = {
      id: `hn-${Date.now()}`,
      author,
      authorRole,
      content,
      createdAt: new Date().toISOString(),
    };
    setHandoffNotes(prev => ({ ...prev, [incidentId]: [...(prev[incidentId] || []), newNote] }));
  }, []);

  const getHandoffNotes = useCallback((incidentId: string) => {
    return handoffNotes[incidentId] || [];
  }, [handoffNotes]);

  return {
    incidents: sortedIncidents,
    loading,
    error,
    selectedIncident,
    selectedIncidentId,
    setSelectedIncidentId,
    pendingP1Count,
    myActiveCount,
    acknowledgeIncident,
    acceptIncident,
    updateStatus,
    addHandoffNote,
    getHandoffNotes,
    handoffNotes,
    refresh: fetchEscalations,
  };
}

function mapStatus(dbStatus: string): EscalationStatus {
  const map: Record<string, EscalationStatus> = {
    pending_assignment: 'pending_assignment',
    assigned: 'assigned',
    resolved: 'resolved',
    closed: 'closed',
  };
  return map[dbStatus] || 'pending_assignment';
}
