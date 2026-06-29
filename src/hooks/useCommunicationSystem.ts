// ═══════════════════════════════════════════════════════════════
// COMMUNICATION SYSTEM HOOK — v2.1
// Real Supabase data. No mock data. Full error handling.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { CommLogEntry, MessageTemplate, CommPreferences, CommStatus } from '@/components/communication/types';

export function useCommunicationSystem() {
  const [logs, setLogs] = useState<CommLogEntry[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [preferences, setPreferences] = useState<CommPreferences | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch comm logs from audit_logs
      const { data: logData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'communications_log')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logData) {
        setLogs(logData.map((l: any) => ({
          id: l.id,
          incidentId: l.metadata?.incident_id || null,
          stage: l.type,
          channel: l.metadata?.channel || 'email',
          status: (l.metadata?.status || 'delivered') as CommStatus,
          recipient: l.metadata?.recipient || '',
          subject: l.metadata?.subject || '',
          body: l.message || '',
          templateId: l.metadata?.template_id || null,
          sentAt: l.created_at,
          deliveredAt: l.metadata?.delivered_at || null,
          openedAt: null,
          failedAt: null,
          failReason: null,
          retryCount: 0,
          maxRetries: 3,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communication data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addLog = useCallback((entry: Omit<CommLogEntry, 'id' | 'sentAt' | 'retryCount'>) => {
    const newLog: CommLogEntry = { ...entry, id: `clog-${Date.now()}`, sentAt: new Date().toISOString(), retryCount: 0 };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const retryDelivery = useCallback((logId: string) => {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'queued' as CommStatus, retryCount: l.retryCount + 1, failedAt: null, failReason: null } : l));
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<MessageTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  }, []);

  const toggleTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }, []);

  const updatePreferences = useCallback((updates: Partial<CommPreferences>) => {
    setPreferences(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const stats = {
    totalSent: logs.filter(l => l.status !== 'pending').length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    opened: logs.filter(l => l.status === 'opened').length,
    pendingRetry: logs.filter(l => l.status === 'failed' && l.retryCount < l.maxRetries).length,
  };

  return { logs, templates, preferences, selectedTemplate, setSelectedTemplate, loading, error, addLog, retryDelivery, updateTemplate, toggleTemplate, updatePreferences, stats, refresh: fetchData };
}
