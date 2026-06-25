-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 002: Incidents, Pipeline, VM Sessions, Snapshots
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLE: incidents
-- ═══════════════════════════════════════════
CREATE TABLE incidents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_type     text NOT NULL DEFAULT 'subscription',  -- 'subscription', 'one_time_fix', 'manual'
  source_id       uuid,  -- references one_time_fixes.id or subscriptions.id
  title           text NOT NULL,
  description     text,
  website_url     text,
  status          incident_status NOT NULL DEFAULT 'lead_capture',
  priority        incident_priority NOT NULL DEFAULT 'P3_MEDIUM',
  ai_confidence   integer,  -- 0-100
  assigned_engineer_id  uuid,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_customer ON incidents(customer_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_engineer ON incidents(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_active ON incidents(status) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_incidents_composite ON incidents(status, priority, created_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: pipeline_states
-- ═══════════════════════════════════════════
CREATE TABLE pipeline_states (
  pipeline_id     text PRIMARY KEY,
  incident_id     uuid REFERENCES incidents(id) ON DELETE SET NULL,
  fix_id          uuid REFERENCES one_time_fixes(id) ON DELETE SET NULL,
  current_step    text NOT NULL DEFAULT 'triage',
  step_results    jsonb DEFAULT '{}',
  confidence      integer DEFAULT 0,
  status          pipeline_status NOT NULL DEFAULT 'running',
  started_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  error_count     integer DEFAULT 0
);

CREATE INDEX idx_pipeline_incident ON pipeline_states(incident_id);
CREATE INDEX idx_pipeline_fix ON pipeline_states(fix_id);
CREATE INDEX idx_pipeline_status ON pipeline_states(status);
CREATE INDEX idx_pipeline_active ON pipeline_states(created_at DESC) WHERE status IN ('running', 'awaiting_approval');

-- ═══════════════════════════════════════════
-- TABLE: human_escalations
-- ═══════════════════════════════════════════
CREATE TABLE human_escalations (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id         uuid REFERENCES incidents(id) ON DELETE CASCADE,
  fix_id              uuid REFERENCES one_time_fixes(id) ON DELETE CASCADE,
  pipeline_id         text REFERENCES pipeline_states(pipeline_id) ON DELETE SET NULL,
  trigger_reason      text NOT NULL,
  failed_step         text,
  assigned_engineer_id uuid,
  status              escalation_status NOT NULL DEFAULT 'pending_assignment',
  reason              text,
  metadata            jsonb DEFAULT '{}',
  assigned_at         timestamptz,
  acknowledged_at     timestamptz,
  resolved_at         timestamptz,
  reassigned_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalations_incident ON human_escalations(incident_id);
CREATE INDEX idx_escalations_engineer ON human_escalations(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX idx_escalations_status ON human_escalations(status);
CREATE INDEX idx_escalations_pending ON human_escalations(created_at) WHERE status = 'pending_assignment';

-- ═══════════════════════════════════════════
-- TABLE: vm_sessions
-- ═══════════════════════════════════════════
CREATE TABLE vm_sessions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE SET NULL,
  provider_vm_id  text,
  ip_address      text,
  ssh_key         text,
  status          vm_status NOT NULL DEFAULT 'creating',
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  destroyed_at    timestamptz,
  destroy_reason  text
);

CREATE INDEX idx_vm_incident ON vm_sessions(incident_id);
CREATE INDEX idx_vm_status ON vm_sessions(status);
CREATE INDEX idx_vm_running ON vm_sessions(created_at) WHERE status = 'running';

-- ═══════════════════════════════════════════
-- TABLE: vm_commands
-- ═══════════════════════════════════════════
CREATE TABLE vm_commands (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  command         text NOT NULL,
  status          text DEFAULT 'queued',
  output          text,
  exit_code       integer,
  started_at      timestamptz,
  completed_at    timestamptz
);

CREATE INDEX idx_commands_vm ON vm_commands(vm_session_id);
CREATE INDEX idx_commands_status ON vm_commands(status);

-- ═══════════════════════════════════════════
-- TABLE: deployment_snapshots
-- ═══════════════════════════════════════════
CREATE TABLE deployment_snapshots (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  vm_session_id   uuid REFERENCES vm_sessions(id) ON DELETE SET NULL,
  status          text DEFAULT 'created',
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  used_at         timestamptz,
  rollback_reason text
);

CREATE INDEX idx_snapshots_incident ON deployment_snapshots(incident_id);
CREATE INDEX idx_snapshots_status ON deployment_snapshots(status);

-- ═══════════════════════════════════════════
-- TABLE: smoke_tests
-- ═══════════════════════════════════════════
CREATE TABLE smoke_tests (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id     text,
  results         jsonb DEFAULT '[]',
  overall_passed  boolean,
  run_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_smoke_incident ON smoke_tests(incident_id);

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

CREATE TRIGGER trg_incidents_updated
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pipeline_updated
  BEFORE UPDATE ON pipeline_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_tests ENABLE ROW LEVEL SECURITY;

-- incidents: own records + engineers can read assigned + coordinator/admin all
CREATE POLICY incidents_own ON incidents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = incidents.customer_id AND user_id = auth.uid())
  );
CREATE POLICY incidents_engineer ON incidents
  FOR SELECT USING (
    assigned_engineer_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
  );
CREATE POLICY incidents_admin ON incidents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_incidents ON incidents FOR ALL USING (true) WITH CHECK (true);

-- pipeline_states: admin/engineer read, coordinator full access
CREATE POLICY pipeline_engineer ON pipeline_states
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
  );
CREATE POLICY pipeline_admin ON pipeline_states
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_pipeline ON pipeline_states FOR ALL USING (true) WITH CHECK (true);

-- human_escalations: engineer can read own, coordinator/admin all
CREATE POLICY escalations_engineer ON human_escalations
  FOR SELECT USING (
    assigned_engineer_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
  );
CREATE POLICY escalations_admin ON human_escalations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
CREATE POLICY service_escalations ON human_escalations FOR ALL USING (true) WITH CHECK (true);

-- vm_sessions: engineer/coordinator read
CREATE POLICY vm_engineer ON vm_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
  );
CREATE POLICY service_vm ON vm_sessions FOR ALL USING (true) WITH CHECK (true);

-- deployment_snapshots: engineer/coordinator/admin
CREATE POLICY snapshots_engineer ON deployment_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
  );
CREATE POLICY service_snapshots ON deployment_snapshots FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════

INSERT INTO incidents (id, customer_id, source_type, title, description, website_url, status, priority, ai_confidence) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'subscription',
   'Database connection pool exhaustion on acme-corp.com',
   'PostgreSQL rejecting connections with "too many clients already". Affects checkout flow, user authentication, and order processing.',
   'acme-corp.com', 'triage', 'P1_CRITICAL', 72),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'subscription',
   'SSL certificate expired on api.acme-corp.com',
   'SSL certificate expired 14 hours ago. API endpoints returning CERT_EXPIRED errors.',
   'api.acme-corp.com', 'resolved', 'P2_HIGH', 95);

INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-001-abc', '22222222-2222-2222-2222-222222222221', 'validate', 72, 'awaiting_approval');

INSERT INTO human_escalations (incident_id, pipeline_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc', 'ai_pipeline_failure', 'validate', 'pending_assignment',
   'AI confidence 72% below 90% auto-deploy threshold. Validation failed on 2/5 tests. Memory leak detected.');
