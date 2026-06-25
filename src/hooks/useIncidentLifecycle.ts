// ═══════════════════════════════════════════════════════════════
// INCIDENT LIFECYCLE WORKFLOW ENGINE
// State machine with 12 stages, auto-transitions, and history
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  IncidentLifecycle,
  LifecycleStage,
  UnifiedIncidentStatus,
  LifecycleHistoryEntry,
  Lead,
  ServiceSelection,
  DeploymentState,
  CustomerVerification,
  AuditReport,
  FollowUpEmail,
  MonitoringState,
} from '@/components/lifecycle/types';

const generateId = () => `INC-${Date.now().toString(36).toUpperCase()}`;

const INITIAL_LIFECYCLE: IncidentLifecycle = {
  id: generateId(),
  currentStage: 'lead_capture',
  status: 'new',
  lead: null,
  serviceSelection: null,
  credentialSubmission: null,
  deploymentState: null,
  customerVerification: null,
  auditReport: null,
  followUpEmails: [],
  monitoringState: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
  history: [],
};

export function useIncidentLifecycle() {
  const [lifecycle, setLifecycle] = useState<IncidentLifecycle>({ ...INITIAL_LIFECYCLE });
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── History tracking ──
  const addHistory = useCallback((entry: Omit<LifecycleHistoryEntry, 'timestamp'>) => {
    setLifecycle(prev => ({
      ...prev,
      history: [...prev.history, { ...entry, timestamp: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // ── Stage transition ──
  const transitionTo = useCallback((stage: LifecycleStage, status: UnifiedIncidentStatus, note: string, actor: LifecycleHistoryEntry['actor']) => {
    setLifecycle(prev => {
      const newHistory = [...prev.history, {
        stage,
        status,
        timestamp: new Date().toISOString(),
        note,
        actor,
      }];
      return {
        ...prev,
        currentStage: stage,
        status,
        history: newHistory,
        updatedAt: new Date().toISOString(),
        completedAt: status === 'closed' ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, []);

  // ── Step 1: Lead Capture ──
  const captureLead = useCallback((leadData: Omit<Lead, 'id' | 'leadScore' | 'urgencyKeywords' | 'status' | 'createdAt' | 'convertedAt' | 'customerId'>) => {
    const urgencyKeywords = ['down', 'crash', 'urgent', 'critical', 'emergency', 'hacked', 'broken', 'not working'];
    const detected = urgencyKeywords.filter(k => leadData.painPoint.toLowerCase().includes(k));
    const score = Math.min(100, 30 + detected.length * 15 + (leadData.websiteUrl.includes('shop') || leadData.websiteUrl.includes('pay') ? 20 : 0));

    const lead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      leadScore: score,
      urgencyKeywords: detected,
      status: 'new',
      createdAt: new Date().toISOString(),
      convertedAt: null,
      customerId: null,
    };

    setLifecycle(prev => ({ ...prev, lead }));
    transitionTo('service_selection', 'new', `Lead captured: ${leadData.email} (score: ${score})`, 'customer');
  }, [transitionTo]);

  // ── Step 2: Service Selection ──
  const selectService = useCallback((service: ServiceSelection) => {
    setLifecycle(prev => ({ ...prev, serviceSelection: service }));
    transitionTo('checkout', 'payment_pending', `Selected ${service.type} — ${service.tier} ($${service.price})`, 'customer');
  }, [transitionTo]);

  // ── Step 3: Checkout Complete ──
  const completeCheckout = useCallback(() => {
    transitionTo('credential_submit', 'credentials_needed', 'Payment confirmed via Stripe', 'system');
  }, [transitionTo]);

  // ── Step 4: Credential Submitted ──
  const submitCredentials = useCallback(() => {
    transitionTo('triage_isolation', 'triaging', 'Credentials encrypted and stored in vault', 'customer');
  }, [transitionTo]);

  // ── Step 5: Start Triage ──
  const startTriage = useCallback(() => {
    transitionTo('triage_isolation', 'triaging', 'AI Agent TRIAGE: Classifying issue and assigning severity', 'ai');
  }, [transitionTo]);

  // ── Step 6: Start Repair ──
  const startRepair = useCallback(() => {
    transitionTo('repair_validate', 'repairing', 'AI Agent REPAIR: Executing fix on isolated VM', 'ai');
  }, [transitionTo]);

  // ── Step 7: Coordinator Gate ──
  const submitForApproval = useCallback(() => {
    transitionTo('coordinator_gate', 'pending_approval', 'Fix submitted for coordinator review', 'ai');
  }, [transitionTo]);

  const coordinatorApprove = useCallback(() => {
    transitionTo('deployment', 'approved', 'Coordinator approved deployment', 'coordinator');
  }, [transitionTo]);

  const coordinatorReject = useCallback((reason: string) => {
    transitionTo('repair_validate', 'repairing', `Coordinator rejected: ${reason}. Returning to repair.`, 'coordinator');
  }, [transitionTo]);

  // ── Step 8: Deploy ──
  const startDeployment = useCallback(() => {
    const deployState: DeploymentState = {
      status: 'backing_up',
      backupSnapshotId: `snap-${Date.now()}`,
      deployedAt: null,
      smokeTestResults: [],
      rollbackReason: null,
      deployDurationSeconds: null,
    };
    setLifecycle(prev => ({ ...prev, deploymentState: deployState }));
    transitionTo('deployment', 'deploying', 'Creating backup snapshot before deployment', 'ai');
  }, [transitionTo]);

  const completeDeployment = useCallback((passed: boolean) => {
    if (passed) {
      setLifecycle(prev => ({
        ...prev,
        deploymentState: {
          ...prev.deploymentState!,
          status: 'deployed',
          deployedAt: new Date().toISOString(),
          deployDurationSeconds: 180,
          smokeTestResults: [
            { id: 'st-1', name: 'HTTP Status', status: 'pass', duration: 142, detail: 'HTTP 200 OK', timestamp: new Date().toISOString() },
            { id: 'st-2', name: 'Homepage Load', status: 'pass', duration: 312, detail: '3.2s load time', timestamp: new Date().toISOString() },
            { id: 'st-3', name: 'Checkout Flow', status: 'pass', duration: 891, detail: 'End-to-end success', timestamp: new Date().toISOString() },
            { id: 'st-4', name: 'Payment Gateway', status: 'pass', duration: 523, detail: 'Stripe integration OK', timestamp: new Date().toISOString() },
          ],
        },
      }));
      transitionTo('customer_verify', 'deployed', 'Deployment successful, all smoke tests passed', 'ai');
    } else {
      setLifecycle(prev => ({
        ...prev,
        deploymentState: {
          ...prev.deploymentState!,
          status: 'rolled_back',
          rollbackReason: 'Smoke test failed: Payment gateway timeout',
          smokeTestResults: [
            { id: 'st-1', name: 'HTTP Status', status: 'pass', duration: 142, detail: 'HTTP 200 OK', timestamp: new Date().toISOString() },
            { id: 'st-2', name: 'Homepage Load', status: 'pass', duration: 312, detail: '3.2s load time', timestamp: new Date().toISOString() },
            { id: 'st-3', name: 'Checkout Flow', status: 'fail', duration: 30000, detail: 'Timeout after 30s', timestamp: new Date().toISOString() },
          ],
        },
      }));
      transitionTo('repair_validate', 'rollback', 'Smoke test failed — automatic rollback executed', 'ai');
    }
  }, [transitionTo]);

  // ── Step 9: Customer Verify ──
  const requestCustomerVerification = useCallback(() => {
    const verify: CustomerVerification = {
      status: 'requested',
      requestedAt: new Date().toISOString(),
      respondedAt: null,
      response: null,
      feedback: null,
      autoCloseAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    setLifecycle(prev => ({ ...prev, customerVerification: verify }));
    addHistory({ stage: 'customer_verify', status: 'deployed', note: 'Customer verification requested (5 min after deploy)', actor: 'system' });
  }, [addHistory]);

  const customerVerifyResponse = useCallback((confirmed: boolean, feedback?: string) => {
    setLifecycle(prev => ({
      ...prev,
      customerVerification: {
        ...prev.customerVerification!,
        status: confirmed ? 'confirmed_fixed' : 'still_broken',
        respondedAt: new Date().toISOString(),
        response: confirmed ? 'yes' : 'no',
        feedback: feedback || null,
      },
    }));
    if (confirmed) {
      transitionTo('audit_report', 'customer_verified', 'Customer confirmed fix is working', 'customer');
    } else {
      transitionTo('triage_isolation', 'customer_rejected', `Customer reports still broken: ${feedback}`, 'customer');
    }
  }, [transitionTo]);

  // ── Step 10: Audit ──
  const completeAudit = useCallback(() => {
    const report: AuditReport = {
      id: `audit-${Date.now()}`,
      incidentId: lifecycle.id,
      generatedAt: new Date().toISOString(),
      totalDuration: '28m 15s',
      totalCost: 3.42,
      agentsInvolved: ['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'],
      filesModified: 1,
      testsPassed: 8,
      testsFailed: 0,
      rootCause: 'WooCommerce 8.2.0 broke custom-gateway-plugin v1.4.2 — missing wc_get_checkout_url() function',
      fixDescription: 'Patched class-checkout.php line 142 to use wc_get_page_permalink("checkout") instead',
      complianceCertificateId: `cert-${Date.now()}`,
      vmDestroyedAt: new Date().toISOString(),
      credentialsPurgedAt: new Date().toISOString(),
      accessLog: [
        { timestamp: lifecycle.createdAt, actor: 'customer', action: 'submitted_credentials', resource: 'credentials_vault' },
        { timestamp: new Date(Date.now() - 25 * 60000).toISOString(), actor: 'AI:TRIAGE', action: 'classified_issue', resource: 'incident_record' },
        { timestamp: new Date(Date.now() - 20 * 60000).toISOString(), actor: 'AI:ISOLATE', action: 'spawned_vm', resource: 'sandbox-7f3a9e2d' },
        { timestamp: new Date(Date.now() - 15 * 60000).toISOString(), actor: 'AI:REPAIR', action: 'modified_file', resource: 'class-checkout.php' },
        { timestamp: new Date(Date.now() - 10 * 60000).toISOString(), actor: 'AI:VALIDATE', action: 'ran_tests', resource: 'test_suite (8/8 pass)' },
        { timestamp: new Date(Date.now() - 5 * 60000).toISOString(), actor: 'coordinator', action: 'approved_deploy', resource: 'deployment_request' },
        { timestamp: new Date(Date.now() - 3 * 60000).toISOString(), actor: 'AI:DEPLOY', action: 'deployed_fix', resource: 'production' },
        { timestamp: new Date(Date.now() - 1 * 60000).toISOString(), actor: 'customer', action: 'confirmed_fix', resource: 'verification_form' },
        { timestamp: new Date().toISOString(), actor: 'AI:AUDIT', action: 'generated_report', resource: 'audit_logs' },
      ],
    };
    setLifecycle(prev => ({ ...prev, auditReport: report }));
    transitionTo('follow_up', 'closed', 'Audit complete, incident closed', 'ai');
  }, [lifecycle.id, lifecycle.createdAt, transitionTo]);

  // ── Step 11: Follow-up ──
  const scheduleFollowUps = useCallback(() => {
    const emails: FollowUpEmail[] = [
      { id: `fu-${Date.now()}-1`, templateId: 'day1_thanks', scheduledAt: new Date(Date.now() + 60 * 60000).toISOString(), sentAt: null, openedAt: null, subject: 'How did we do? Your incident is resolved', status: 'scheduled' },
      { id: `fu-${Date.now()}-2`, templateId: 'day3_tips', scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60000).toISOString(), sentAt: null, openedAt: null, subject: 'Tips to keep your site healthy', status: 'scheduled' },
      { id: `fu-${Date.now()}-3`, templateId: 'day7_upgrade', scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60000).toISOString(), sentAt: null, openedAt: null, subject: 'Upgrade to subscription for proactive monitoring', status: 'scheduled' },
    ];
    setLifecycle(prev => ({ ...prev, followUpEmails: emails }));
    addHistory({ stage: 'follow_up', status: 'closed', note: '3 follow-up emails scheduled', actor: 'system' });
  }, [addHistory]);

  // ── Step 12: Start Monitoring (Subscription) ──
  const startMonitoring = useCallback(() => {
    const monitoring: MonitoringState = {
      isActive: true,
      uptimeChecks: [],
      lastCheckAt: new Date().toISOString(),
      uptimePercentage: 100,
      securityScans: [],
      performanceBenchmarks: [],
      autoFixesEnabled: true,
      autoFixesCount: 0,
      alerts: [],
    };
    setLifecycle(prev => ({ ...prev, monitoringState: monitoring }));
    addHistory({ stage: 'continuous_monitor', status: 'closed', note: 'Continuous monitoring activated', actor: 'system' });
  }, [addHistory]);

  // ── Full auto-simulation ──
  const runFullSimulation = useCallback(() => {
    setIsAutoAdvancing(true);
    const steps = [
      { delay: 800, action: () => captureLead({ email: 'admin@acme-corp.com', websiteUrl: 'https://shop.acme-corp.com', painPoint: 'Checkout is completely broken, customers cant pay. Critical emergency!', source: 'landing_page' }) },
      { delay: 1600, action: () => selectService({ type: 'one_time', tier: 'critical', price: 299, label: 'Critical Fix', description: '4-hour response, complex issues', features: ['4hr response', 'Full diagnostics', '90-day warranty'] }) },
      { delay: 2400, action: completeCheckout },
      { delay: 3200, action: submitCredentials },
      { delay: 4000, action: startTriage },
      { delay: 4800, action: () => transitionTo('triage_isolation', 'isolating', 'AI Agent ISOLATE: VM spawned, website cloned', 'ai') },
      { delay: 5600, action: startRepair },
      { delay: 6400, action: () => transitionTo('repair_validate', 'validating', 'AI Agent VALIDATE: Running tests, confidence 94%', 'ai') },
      { delay: 7200, action: submitForApproval },
      { delay: 8000, action: coordinatorApprove },
      { delay: 8800, action: startDeployment },
      { delay: 9600, action: () => completeDeployment(true) },
      { delay: 10400, action: requestCustomerVerification },
      { delay: 11200, action: () => customerVerifyResponse(true, 'Checkout working perfectly now, thank you!') },
      { delay: 12000, action: completeAudit },
      { delay: 12800, action: scheduleFollowUps },
      { delay: 13600, action: startMonitoring },
    ];

    steps.forEach(({ delay, action }) => {
      setTimeout(() => action(), delay);
    });

    setTimeout(() => setIsAutoAdvancing(false), 14000);
  }, [captureLead, selectService, completeCheckout, submitCredentials, startTriage, transitionTo, startRepair, submitForApproval, coordinatorApprove, startDeployment, completeDeployment, requestCustomerVerification, customerVerifyResponse, completeAudit, scheduleFollowUps, startMonitoring]);

  const resetLifecycle = useCallback(() => {
    setIsAutoAdvancing(false);
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setLifecycle({ ...INITIAL_LIFECYCLE, id: generateId() });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  return {
    lifecycle,
    isAutoAdvancing,
    captureLead,
    selectService,
    completeCheckout,
    submitCredentials,
    startTriage,
    startRepair,
    submitForApproval,
    coordinatorApprove,
    coordinatorReject,
    startDeployment,
    completeDeployment,
    requestCustomerVerification,
    customerVerifyResponse,
    completeAudit,
    scheduleFollowUps,
    startMonitoring,
    runFullSimulation,
    resetLifecycle,
    transitionTo,
  };
}
