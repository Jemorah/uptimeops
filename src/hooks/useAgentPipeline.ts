import { useState, useEffect, useCallback } from 'react';
import type {
  AgentName,
  AgentState,
  AgentStatus,
  PipelineIncident,
  AgentLogEntry,
} from '@/components/orchestration/types';
import { AGENT_ORDER, AGENT_CONFIGS } from '@/components/orchestration/types';

interface UseAgentPipelineOptions {
  autoSimulate?: boolean;
  simulationSpeed?: number;
}

export function useAgentPipeline(options: UseAgentPipelineOptions = {}) {
  const { autoSimulate = true, simulationSpeed = 1 } = options;
  const [incident, setIncident] = useState<PipelineIncident | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // ── Initialize with mock data ──
  const initializeIncident = useCallback(() => {
    const now = new Date().toISOString();
    const agents: Record<AgentName, AgentState> = {} as Record<AgentName, AgentState>;

    for (const name of AGENT_ORDER) {
      agents[name] = {
        name,
        status: 'queued',
        startedAt: null,
        completedAt: null,
        progress: 0,
        confidence: null,
        logs: [],
        output: null,
        cost: 0,
        elapsedSeconds: 0,
        timeoutSeconds: AGENT_CONFIGS[name].timeoutSeconds,
        errorMessage: null,
        escalatedTo: null,
      };
    }

    setIncident({
      id: `INC-${Date.now().toString(36).toUpperCase()}`,
      title: 'WordPress Plugin Conflict — WooCommerce checkout 500 error',
      customerId: 'cust_001',
      customerEmail: 'admin@acme-corp.com',
      websiteUrl: 'https://shop.acme-corp.com',
      severity: 'P2_HIGH',
      category: 'plugin_conflict',
      currentAgent: null,
      agents,
      overallStatus: 'running',
      totalCost: 0,
      startedAt: now,
      completedAt: null,
      vmSessionId: null,
      coordinatorApproved: false,
      rollbackSnapshotId: null,
    });
  }, []);

  // ── Start simulation ──
  const startSimulation = useCallback(() => {
    if (!incident) return;
    setIsSimulating(true);

    const log = (agent: AgentName, level: AgentLogEntry['level'], message: string, detail?: string) => {
      setIncident(prev => {
        if (!prev) return prev;
        const entry: AgentLogEntry = {
          timestamp: new Date().toISOString(),
          level,
          message,
          detail,
        };
        return {
          ...prev,
          agents: {
            ...prev.agents,
            [agent]: {
              ...prev.agents[agent],
              logs: [...prev.agents[agent].logs, entry],
            },
          },
        };
      });
    };

    // TRIAGE logs
    log('TRIAGE', 'system', 'Agent TRIAGE activated', 'Claude model loaded');
    log('TRIAGE', 'info', 'Analyzing customer submission...', 'URL: https://shop.acme-corp.com');
    log('TRIAGE', 'info', 'Screenshot analysis complete', 'Detected: WooCommerce checkout page with 500 error');
    log('TRIAGE', 'info', 'Keyword classification', 'Keywords: "plugin", "conflict", "WooCommerce", "500", "checkout"');
    log('TRIAGE', 'info', 'Issue categorized', 'Category: plugin_conflict | Severity: P2_HIGH');
    log('TRIAGE', 'info', 'Complexity estimation', 'Estimated: MEDIUM (single plugin scope)');
    log('TRIAGE', 'success', 'Triage complete', 'Proceeding to Agent 2: ISOLATE');

    // ISOLATE logs
    log('ISOLATE', 'system', 'Agent ISOLATE activated', 'Jules infrastructure automation');
    log('ISOLATE', 'info', 'Allocating VM resources', 'Type: container | CPU: 2 cores | RAM: 4GB | Region: us-east-1');
    log('ISOLATE', 'info', 'VM spawned', 'ID: vm-8x2k9p | Status: running');
    log('ISOLATE', 'info', 'Requesting credential decryption', 'Waiting for customer browser key relay...');
    log('ISOLATE', 'info', 'Credentials received via secure channel', 'SFTP access confirmed, WordPress admin verified');
    log('ISOLATE', 'info', 'Cloning website via SFTP', 'Source: shop.acme-corp.com → VM /var/www/html');
    log('ISOLATE', 'info', 'Clone progress: 15%', 'Downloading wp-content/plugins...');
    log('ISOLATE', 'info', 'Clone progress: 47%', 'Downloading wp-content/uploads...');
    log('ISOLATE', 'info', 'Clone progress: 82%', 'Downloading database dump...');
    log('ISOLATE', 'info', 'Creating rollback snapshot', 'Snapshot ID: snap_8x2k9p_pre');
    log('ISOLATE', 'info', 'Running security baseline scan', 'No malware detected, 3 outdated plugins found');
    log('ISOLATE', 'success', 'Isolation complete', 'Website cloned, snapshot created, baseline established');

    // REPAIR logs
    log('REPAIR', 'system', 'Agents REPAIR activated', 'Claude + Jules collaborative coding');
    log('REPAIR', 'info', 'Running diagnostics on cloned environment', 'Checking plugin compatibility matrix...');
    log('REPAIR', 'info', 'Root cause identified', 'WooCommerce 8.2.0 breaks custom-gateway-plugin v1.4.2');
    log('REPAIR', 'info', 'Error: Call to undefined function wc_get_checkout_url()', 'In: custom-gateway-plugin/includes/class-checkout.php:142');
    log('REPAIR', 'info', 'Generating fix plan', 'Option A: Update plugin | Option B: Patch function call | Selected: Option B');
    log('REPAIR', 'info', 'Executing fix', 'Patching class-checkout.php line 142');
    log('REPAIR', 'info', 'Code change', '- wc_get_checkout_url() → + wc_get_page_permalink(\'checkout\')');
    log('REPAIR', 'info', 'Running WP CLI to clear caches', 'wp cache flush && wp transient delete --all');
    log('REPAIR', 'info', 'Rebuild complete', 'Fix applied, caches cleared');
    log('REPAIR', 'success', 'Repair complete', '1 file modified, 1 line changed');

    // VALIDATE logs
    log('VALIDATE', 'system', 'Agent VALIDATE activated', 'Claude testing & confidence scoring');
    log('VALIDATE', 'info', 'Running automated test suite', 'Test 1/8: HTTP Status Code');
    log('VALIDATE', 'info', 'Test 1 PASSED', 'HTTP 200 OK | TTFB: 142ms');
    log('VALIDATE', 'info', 'Test 2/8: Checkout Flow', 'Adding product → cart → checkout → payment');
    log('VALIDATE', 'info', 'Test 2 PASSED', 'Complete checkout flow successful');
    log('VALIDATE', 'info', 'Test 3/8: Payment Gateway', 'Testing custom gateway integration');
    log('VALIDATE', 'info', 'Test 3 PASSED', 'Payment processed, order created #4821');
    log('VALIDATE', 'info', 'Test 4/8: Mobile Rendering', 'Chrome mobile viewport 375x812');
    log('VALIDATE', 'info', 'Test 4 PASSED', 'No layout shifts, responsive design intact');
    log('VALIDATE', 'info', 'Test 5/8: Cross-browser', 'Firefox, Safari, Edge');
    log('VALIDATE', 'info', 'Test 5 PASSED', 'All browsers render correctly');
    log('VALIDATE', 'info', 'Test 6/8: Database Integrity', 'Checking order tables post-repair');
    log('VALIDATE', 'info', 'Test 6 PASSED', 'No data corruption, indexes intact');
    log('VALIDATE', 'info', 'Test 7/8: Plugin Compatibility', 'Verifying no regressions in other plugins');
    log('VALIDATE', 'info', 'Test 7 PASSED', 'All 12 plugins functioning normally');
    log('VALIDATE', 'info', 'Test 8/8: Performance Benchmark', 'Before: 847ms | After: 312ms | Delta: -63%');
    log('VALIDATE', 'info', 'Test 8 PASSED', 'Performance improved significantly');
    log('VALIDATE', 'success', 'Validation complete', '8/8 tests passed | Confidence: 94.2%');

    // DEPLOY logs
    log('DEPLOY', 'system', 'Agent DEPLOY activated', 'Awaiting coordinator approval...');
    log('DEPLOY', 'info', 'Coordinator Morgan Lee reviewing', 'Examining fix summary and test results...');
    log('DEPLOY', 'info', 'Coordinator approved deployment', 'Approval ID: appr_9x3l0q');
    log('DEPLOY', 'info', 'Creating pre-deploy backup', 'Snapshot: snap_8x2k9p_deploy');
    log('DEPLOY', 'info', 'Deploying fix to production', 'rsync patched file → live server');
    log('DEPLOY', 'info', 'Clearing production cache', 'CDN purge + object cache flush');
    log('DEPLOY', 'info', 'Running smoke tests', 'HTTP check, checkout flow, payment test');
    log('DEPLOY', 'success', 'Deployment successful', 'All smoke tests passed, monitoring activated');

    // AUDIT logs
    log('AUDIT', 'system', 'Agent AUDIT activated', 'Compiling compliance report');
    log('AUDIT', 'info', 'Aggregating agent logs', 'Total actions: 47 | Total cost: $3.42');
    log('AUDIT', 'info', 'Generating customer report', 'Timeline: 4m 32s | Resolution: plugin_conflict patch');
    log('AUDIT', 'info', 'Writing audit trail to database', '47 log entries committed to audit_logs');
    log('AUDIT', 'info', 'Generating compliance certificate', 'SHA-256: a3f7c9... | Signed by: audit-agent-v2.1');
    log('AUDIT', 'info', 'Destroying VM', 'vm-8x2k9p terminated, ephemeral storage wiped');
    log('AUDIT', 'info', 'Purging credentials', 'SFTP keys removed from VM memory');
    log('AUDIT', 'success', 'Audit complete', 'Compliance certificate generated, incident closed');
  }, [incident]);

  // ── Pause simulation ──
  const pauseSimulation = useCallback(() => {
    setIsSimulating(false);
  }, []);

  // ── Escalate current agent ──
  const escalateAgent = useCallback((agentName: AgentName, engineerName: string) => {
    setIncident(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agents: {
          ...prev.agents,
          [agentName]: {
            ...prev.agents[agentName],
            status: 'escalated' as AgentStatus,
            escalatedTo: engineerName,
          },
        },
        overallStatus: 'escalated',
      };
    });
  }, []);

  // ── Pause specific agent ──
  const pauseAgent = useCallback((agentName: AgentName) => {
    setIncident(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agents: {
          ...prev.agents,
          [agentName]: {
            ...prev.agents[agentName],
            status: 'paused' as AgentStatus,
          },
        },
        overallStatus: 'paused',
      };
    });
  }, []);

  // ── Resume agent ──
  const resumeAgent = useCallback((agentName: AgentName) => {
    setIncident(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agents: {
          ...prev.agents,
          [agentName]: {
            ...prev.agents[agentName],
            status: 'running' as AgentStatus,
          },
        },
        overallStatus: 'running',
      };
    });
  }, []);

  // ── Trigger rollback ──
  const triggerRollback = useCallback(() => {
    setIncident(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        overallStatus: 'rolled_back',
        rollbackSnapshotId: prev.vmSessionId ? `rollback_${prev.vmSessionId}` : null,
        agents: {
          ...prev.agents,
          DEPLOY: {
            ...prev.agents.DEPLOY,
            status: 'rollback' as AgentStatus,
          },
        },
      };
    });
  }, []);

  // Auto-simulate on mount
  useEffect(() => {
    if (autoSimulate && !incident) {
      initializeIncident();
    }
  }, [autoSimulate, incident, initializeIncident]);

  // Simulate progress when simulating
  useEffect(() => {
    if (!isSimulating || !incident) return;

    const interval = setInterval(() => {
      setIncident(prev => {
        if (!prev) return prev;
        let updated = { ...prev };
        let changed = false;

        for (const name of AGENT_ORDER) {
          const agent = updated.agents[name];
          if (agent.status === 'running') {
            const newProgress = Math.min(100, agent.progress + Math.random() * 8 * simulationSpeed);
            const newElapsed = agent.elapsedSeconds + 1;
            const config = AGENT_CONFIGS[name];
            const newCost = (newElapsed / 60) * config.costPerMinute;

            // Check timeout
            let newStatus: AgentStatus = agent.status;
            if (newElapsed >= agent.timeoutSeconds) {
              newStatus = 'timeout';
            } else if (newProgress >= 100) {
              newStatus = 'completed';
            }

            // VALIDATE confidence
            let newConfidence = agent.confidence;
            if (name === 'VALIDATE' && newProgress > 50) {
              newConfidence = Math.min(100, 60 + (newProgress - 50) * 1.5);
            }

            updated = {
              ...updated,
              agents: {
                ...updated.agents,
                [name]: {
                  ...agent,
                  progress: newProgress,
                  elapsedSeconds: newElapsed,
                  cost: newCost,
                  status: newStatus,
                  confidence: newConfidence,
                },
              },
            };
            changed = true;
          }
        }

        // Chain agents
        for (let i = 0; i < AGENT_ORDER.length; i++) {
          const name = AGENT_ORDER[i];
          const agent = updated.agents[name];
          const prevAgent = i > 0 ? updated.agents[AGENT_ORDER[i - 1]] : null;

          if (agent.status === 'queued' && (!prevAgent || prevAgent.status === 'completed')) {
            updated = {
              ...updated,
              currentAgent: name,
              agents: {
                ...updated.agents,
                [name]: {
                  ...agent,
                  status: 'running' as AgentStatus,
                  startedAt: new Date().toISOString(),
                },
              },
            };
            changed = true;
            break;
          }
        }

        // Recalculate totals
        const totalCost = Object.values(updated.agents).reduce((sum, a) => sum + a.cost, 0);
        updated = { ...updated, totalCost };

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, incident, simulationSpeed]);

  return {
    incident,
    isSimulating,
    initializeIncident,
    startSimulation,
    pauseSimulation,
    escalateAgent,
    pauseAgent,
    resumeAgent,
    triggerRollback,
  };
}
