// ═══════════════════════════════════════════════════════════════
// HUMAN ESCALATION HOOK
// Manages escalation records with mock data and simulation
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  EscalationStatus,
  EscalatedIncident,
  HandoffNote,
  EngineerLevel,
} from '@/components/escalation/types';

const MOCK_INCIDENTS: EscalatedIncident[] = [
  {
    id: 'ESC-2049',
    title: 'Database Connection Pool Exhaustion',
    websiteUrl: 'acme-corp.com',
    severity: 'P1_CRITICAL',
    category: 'database',
    customerEmail: 'admin@acme-corp.com',
    escalationStatus: 'in_progress',
    escalationTrigger: 'p1_critical',
    assignedEngineer: 'Alex Chen',
    aiConfidence: 72,
    aiAttemptSummary: 'AI attempted to restart connection pool and increase max connections. Pool still exhausting within 30s. Recommends manual investigation of connection leaks in application code.',
    createdAt: '2024-06-25T14:32:00Z',
    lastUpdated: '2024-06-25T14:45:00Z',
    requiresSpecialty: 'Database',
  },
  {
    id: 'ESC-2048',
    title: 'Checkout API 500 Error on Payment Processing',
    websiteUrl: 'shop.beta.co',
    severity: 'P1_CRITICAL',
    category: 'api',
    customerEmail: 'ops@beta.co',
    escalationStatus: 'acknowledged',
    escalationTrigger: 'smoke_test_failure',
    assignedEngineer: 'Jordan Smith',
    aiConfidence: 45,
    aiAttemptSummary: 'Two smoke test failures. First fix: updated payment gateway timeout. Second fix: rolled back Stripe SDK version. Both failed. Manual intervention required.',
    createdAt: '2024-06-25T13:15:00Z',
    lastUpdated: '2024-06-25T14:20:00Z',
    requiresSpecialty: 'API/Backend',
  },
  {
    id: 'ESC-2047',
    title: 'Memory Leak in Node.js Worker Process',
    websiteUrl: 'api.startup.io',
    severity: 'P2_HIGH',
    category: 'memory',
    customerEmail: 'dev@startup.io',
    escalationStatus: 'pending_assignment',
    escalationTrigger: 'agent_timeout',
    assignedEngineer: null,
    aiConfidence: 68,
    aiAttemptSummary: 'ISOLATE agent timed out after 10min investigating memory heap snapshots. Worker process growing 50MB/hour. Partial analysis captured - suspect event listener accumulation.',
    createdAt: '2024-06-25T12:00:00Z',
    lastUpdated: '2024-06-25T14:00:00Z',
    requiresSpecialty: 'Node.js',
  },
  {
    id: 'ESC-2046',
    title: 'SSL Certificate Expiry Warning',
    websiteUrl: 'secure.finance.co',
    severity: 'P2_HIGH',
    category: 'security',
    customerEmail: 'security@finance.co',
    escalationStatus: 'fix_submitted',
    escalationTrigger: 'security_finding',
    assignedEngineer: 'Morgan Lee',
    aiConfidence: 85,
    aiAttemptSummary: 'AI detected SSL cert expires in 48 hours. Auto-renewal failed due to DNS challenge timeout. Manual renewal with HTTP-01 challenge recommended. Fix prepared, awaiting coordinator approval.',
    createdAt: '2024-06-25T11:30:00Z',
    lastUpdated: '2024-06-25T14:10:00Z',
    requiresSpecialty: 'Security',
  },
  {
    id: 'ESC-2045',
    title: 'Customer Requested Engineer Review',
    websiteUrl: 'health-portal.med',
    severity: 'P3_MEDIUM',
    category: 'customer_request',
    customerEmail: 'cto@health-portal.med',
    escalationStatus: 'coordinator_review',
    escalationTrigger: 'customer_request',
    assignedEngineer: 'Alex Chen',
    aiConfidence: 92,
    aiAttemptSummary: 'Customer explicitly requested human engineer review for scheduled maintenance window. AI pipeline completed successfully with 92% confidence. Coordinator reviewing deployment approval.',
    createdAt: '2024-06-25T10:00:00Z',
    lastUpdated: '2024-06-25T14:30:00Z',
    requiresSpecialty: null,
  },
  {
    id: 'ESC-2044',
    title: 'Redis Cache Invalidation Storm',
    websiteUrl: 'social.app',
    severity: 'P2_HIGH',
    category: 'cache',
    customerEmail: 'infra@social.app',
    escalationStatus: 'assigned',
    escalationTrigger: 'low_confidence',
    assignedEngineer: 'Jordan Smith',
    aiConfidence: 82,
    aiAttemptSummary: 'AI confidence 82% on cache warming strategy. Recommend implementing circuit breaker pattern before cache rebuild to prevent thundering herd. Engineer assigned for review.',
    createdAt: '2024-06-25T09:45:00Z',
    lastUpdated: '2024-06-25T14:15:00Z',
    requiresSpecialty: 'Redis/Cache',
  },
  {
    id: 'ESC-2043',
    title: 'File Upload Security Vulnerability',
    websiteUrl: 'uploads.service.io',
    severity: 'P1_CRITICAL',
    category: 'security',
    customerEmail: 'security@service.io',
    escalationStatus: 'pending_assignment',
    escalationTrigger: 'coordinator_flag',
    assignedEngineer: null,
    aiConfidence: null,
    aiAttemptSummary: 'Coordinator manually flagged potential RCE vulnerability in file upload handler. AI pipeline paused pending security specialist review. DO NOT auto-fix.',
    createdAt: '2024-06-25T08:30:00Z',
    lastUpdated: '2024-06-25T08:35:00Z',
    requiresSpecialty: 'Security',
  },
];

const MOCK_HANDOFF_NOTES: Record<string, HandoffNote[]> = {
  'ESC-2049': [
    {
      id: 'hn-1',
      author: 'System',
      authorRole: 'ai',
      content: 'Auto-escalated at 14:32 UTC. AI confidence 72%. Connection pool restart did not resolve. Awaiting engineer assignment.',
      createdAt: '2024-06-25T14:32:00Z',
    },
    {
      id: 'hn-2',
      author: 'Coordinator Sarah',
      authorRole: 'coordinator',
      content: 'Assigned to Alex Chen (L2, Database specialty). This is a recurring issue - check previous incident ESC-2011 for context. Customer is on Enterprise plan, prioritize.',
      createdAt: '2024-06-25T14:35:00Z',
    },
    {
      id: 'hn-3',
      author: 'Alex Chen',
      authorRole: 'engineer',
      content: 'Acknowledged. Checking pg_stat_activity for idle connections. Will run pgbadger analysis. Customer notified of active investigation.',
      createdAt: '2024-06-25T14:45:00Z',
    },
  ],
  'ESC-2048': [
    {
      id: 'hn-4',
      author: 'System',
      authorRole: 'ai',
      content: 'Smoke test failed twice. First fix: Stripe SDK rollback. Second fix: timeout increase. Both failed. Auto-escalated to human.',
      createdAt: '2024-06-25T13:20:00Z',
    },
    {
      id: 'hn-5',
      author: 'Coordinator Mike',
      authorRole: 'coordinator',
      content: 'Jordan, this is affecting live transactions. Customer reported $12K revenue impact. Please prioritize and keep me updated every 15 min.',
      createdAt: '2024-06-25T13:30:00Z',
    },
  ],
};

const ENGINEERS = [
  { id: 'eng-1', name: 'Alex Chen', level: 'L2' as EngineerLevel, specialty: 'Database', status: 'busy' as const },
  { id: 'eng-2', name: 'Jordan Smith', level: 'L2' as EngineerLevel, specialty: 'API/Backend', status: 'busy' as const },
  { id: 'eng-3', name: 'Morgan Lee', level: 'L3' as EngineerLevel, specialty: 'Security', status: 'busy' as const },
  { id: 'eng-4', name: 'Riley Park', level: 'L1' as EngineerLevel, specialty: 'Node.js', status: 'available' as const },
  { id: 'eng-5', name: 'Casey Brown', level: 'L2' as EngineerLevel, specialty: 'Redis/Cache', status: 'available' as const },
];

export function useEscalations() {
  const [incidents, setIncidents] = useState<EscalatedIncident[]>(MOCK_INCIDENTS);
  const [handoffNotes, setHandoffNotes] = useState<Record<string, HandoffNote[]>>(MOCK_HANDOFF_NOTES);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;

  // Sort incidents: P1 first, then by creation time (FIFO)
  const sortedIncidents = [...incidents].sort((a, b) => {
    const severityOrder = { P1_CRITICAL: 0, P2_HIGH: 1, P3_MEDIUM: 2, P4_LOW: 3 };
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const pendingP1Count = incidents.filter(
    i => i.severity === 'P1_CRITICAL' && (i.escalationStatus === 'pending_assignment' || i.escalationStatus === 'assigned')
  ).length;

  const myActiveCount = incidents.filter(
    i => i.assignedEngineer && i.escalationStatus !== 'closed' && i.escalationStatus !== 'deployed'
  ).length;

  const acknowledgeIncident = useCallback((id: string) => {
    setIncidents(prev => prev.map(i =>
      i.id === id ? { ...i, escalationStatus: 'acknowledged' as EscalationStatus, lastUpdated: new Date().toISOString() } : i
    ));
  }, []);

  const acceptIncident = useCallback((id: string, engineerName: string) => {
    setIncidents(prev => prev.map(i =>
      i.id === id ? {
        ...i,
        assignedEngineer: engineerName,
        escalationStatus: 'acknowledged' as EscalationStatus,
        lastUpdated: new Date().toISOString(),
      } : i
    ));
  }, []);

  const updateStatus = useCallback((id: string, status: EscalationStatus) => {
    setIncidents(prev => prev.map(i =>
      i.id === id ? { ...i, escalationStatus: status, lastUpdated: new Date().toISOString() } : i
    ));
  }, []);

  const addHandoffNote = useCallback((incidentId: string, note: Omit<HandoffNote, 'id' | 'createdAt'>) => {
    const newNote: HandoffNote = {
      ...note,
      id: `hn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setHandoffNotes(prev => ({
      ...prev,
      [incidentId]: [...(prev[incidentId] || []), newNote],
    }));
  }, []);

  const getHandoffNotes = useCallback((incidentId: string) => {
    return handoffNotes[incidentId] || [];
  }, [handoffNotes]);

  // Simulation mode - periodically update incident statuses
  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      if (prev) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return false;
      }
      intervalRef.current = setInterval(() => {
        setIncidents(prev => prev.map(i => {
          if (i.escalationStatus === 'pending_assignment' && Math.random() > 0.7) {
            const availableEng = ENGINEERS.find(e => e.status === 'available');
            return {
              ...i,
              assignedEngineer: availableEng?.name || 'Riley Park',
              escalationStatus: 'assigned',
              lastUpdated: new Date().toISOString(),
            };
          }
          return i;
        }));
      }, 5000);
      return true;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    incidents: sortedIncidents,
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
    isSimulating,
    toggleSimulation,
    engineers: ENGINEERS,
  };
}
