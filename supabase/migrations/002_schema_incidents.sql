-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS MIGRATION 002: Incidents, Pipeline, VM Sessions
-- Tables: incidents, pipeline_states, human_escalations,
--         vm_sessions, vm_commands, deployment_snapshots, smoke_tests
-- Paste into Supabase SQL Editor → Click Run
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLE: incidents
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incidents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source_type         text NOT NULL DEFAULT 'subscription',
  source_id           uuid,
  title               text NOT NULL,
  description         text,
  website_url         text,
  status              incident_status NOT NULL DEFAULT 'lead_capture',
  priority            incident_priority NOT NULL DEFAULT 'P3_MEDIUM',
  ai_confidence       integer,
  assigned_engineer_id uuid,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_customer ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_engineer ON incidents(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(status) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX IF NOT EXISTS idx_incidents_composite ON incidents(status, priority, created_at DESC);

-- ═══════════════════════════════════════════
-- TABLE: pipeline_states
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pipeline_states (
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

CREATE INDEX IF NOT EXISTS idx_pipeline_incident ON pipeline_states(incident_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_fix ON pipeline_states(fix_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_states(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_active ON pipeline_states(created_at DESC) WHERE status IN ('running', 'awaiting_approval');

-- ═══════════════════════════════════════════
-- TABLE: human_escalations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS human_escalations (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id           uuid REFERENCES incidents(id) ON DELETE CASCADE,
  fix_id                uuid REFERENCES one_time_fixes(id) ON DELETE CASCADE,
  pipeline_id           text REFERENCES pipeline_states(pipeline_id) ON DELETE SET NULL,
  trigger_reason        text NOT NULL,
  failed_step           text,
  assigned_engineer_id  uuid,
  status                escalation_status NOT NULL DEFAULT 'pending_assignment',
  reason                text,
  metadata              jsonb DEFAULT '{}',
  assigned_at           timestamptz,
  acknowledged_at       timestamptz,
  resolved_at           timestamptz,
  reassigned_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_incident ON human_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalations_engineer ON human_escalations(assigned_engineer_id) WHERE assigned_engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escalations_status ON human_escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_pending ON human_escalations(created_at) WHERE status = 'pending_assignment';

-- ═══════════════════════════════════════════
-- TABLE: vm_sessions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vm_sessions (
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

CREATE INDEX IF NOT EXISTS idx_vm_incident ON vm_sessions(incident_id);
CREATE INDEX IF NOT EXISTS idx_vm_status ON vm_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vm_running ON vm_sessions(created_at) WHERE status = 'running';

-- ═══════════════════════════════════════════
-- TABLE: vm_commands
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vm_commands (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  command         text NOT NULL,
  status          text DEFAULT 'queued',
  output          text,
  exit_code       integer,
  started_at      timestamptz,
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_commands_vm ON vm_commands(vm_session_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON vm_commands(status);

-- ═══════════════════════════════════════════
-- TABLE: deployment_snapshots
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployment_snapshots (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  vm_session_id   uuid REFERENCES vm_sessions(id) ON DELETE SET NULL,
  status          text DEFAULT 'created',
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  used_at         timestamptz,
  rollback_reason text
);

CREATE INDEX IF NOT EXISTS idx_snapshots_incident ON deployment_snapshots(incident_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON deployment_snapshots(status);

-- ═══════════════════════════════════════════
-- TABLE: smoke_tests
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS smoke_tests (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vm_session_id   uuid NOT NULL REFERENCES vm_sessions(id) ON DELETE CASCADE,
  incident_id     uuid REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id     text,
  results         jsonb DEFAULT '[]',
  overall_passed  boolean,
  run_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smoke_incident ON smoke_tests(incident_id);

-- ═══════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at
-- ═══════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incidents_updated') THEN
    CREATE TRIGGER trg_incidents_updated
      BEFORE UPDATE ON incidents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pipeline_updated') THEN
    CREATE TRIGGER trg_pipeline_updated
      BEFORE UPDATE ON pipeline_states
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- RLS: Enable and create policies
-- ═══════════════════════════════════════════

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_tests ENABLE ROW LEVEL SECURITY;

-- incidents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_own' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_own ON incidents FOR SELECT USING (
      EXISTS (SELECT 1 FROM customers WHERE id = incidents.customer_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_engineer' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_engineer ON incidents FOR SELECT USING (
      assigned_engineer_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_admin' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_admin ON incidents FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_incidents' AND tablename = 'incidents') THEN
    CREATE POLICY service_incidents ON incidents FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- pipeline_states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_engineer' AND tablename = 'pipeline_states') THEN
    CREATE POLICY pipeline_engineer ON pipeline_states FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pipeline_admin' AND tablename = 'pipeline_states') THEN
    CREATE POLICY pipeline_admin ON pipeline_states FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_pipeline' AND tablename = 'pipeline_states') THEN
    CREATE POLICY service_pipeline ON pipeline_states FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- human_escalations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_engineer' AND tablename = 'human_escalations') THEN
    CREATE POLICY escalations_engineer ON human_escalations FOR SELECT USING (
      assigned_engineer_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_admin' AND tablename = 'human_escalations') THEN
    CREATE POLICY escalations_admin ON human_escalations FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_escalations' AND tablename = 'human_escalations') THEN
    CREATE POLICY service_escalations ON human_escalations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- vm_sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vm_engineer' AND tablename = 'vm_sessions') THEN
    CREATE POLICY vm_engineer ON vm_sessions FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_vm' AND tablename = 'vm_sessions') THEN
    CREATE POLICY service_vm ON vm_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- vm_commands
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vm_commands_engineer' AND tablename = 'vm_commands') THEN
    CREATE POLICY vm_commands_engineer ON vm_commands FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_vm_commands' AND tablename = 'vm_commands') THEN
    CREATE POLICY service_vm_commands ON vm_commands FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- deployment_snapshots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_engineer' AND tablename = 'deployment_snapshots') THEN
    CREATE POLICY snapshots_engineer ON deployment_snapshots FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_snapshots' AND tablename = 'deployment_snapshots') THEN
    CREATE POLICY service_snapshots ON deployment_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- smoke_tests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'smoke_engineer' AND tablename = 'smoke_tests') THEN
    CREATE POLICY smoke_engineer ON smoke_tests FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('engineer', 'coordinator', 'admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_smoke' AND tablename = 'smoke_tests') THEN
    CREATE POLICY service_smoke ON smoke_tests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

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
   'api.acme-corp.com', 'resolved', 'P2_HIGH', 95)
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_states (pipeline_id, incident_id, current_step, confidence, status) VALUES
  ('pl-2024-001-abc', '22222222-2222-2222-2222-222222222221', 'validate', 72, 'awaiting_approval')
ON CONFLICT DO NOTHING;

INSERT INTO human_escalations (incident_id, pipeline_id, trigger_reason, failed_step, status, reason) VALUES
  ('22222222-2222-2222-2222-222222222221', 'pl-2024-001-abc', 'ai_pipeline_failure', 'validate', 'pending_assignment',
   'AI confidence 72% below 90% auto-deploy threshold. Validation failed on 2/5 tests. Memory leak detected.')
ON CONFLICT DO NOTHING;
