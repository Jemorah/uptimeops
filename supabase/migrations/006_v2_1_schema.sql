-- ═══════════════════════════════════════════════════════════════
-- UPTIMEOPS v2.1 — ZERO-TRUST AI REPAIR + 42-SCANNER SECURITY
-- Schema Migration 006
-- Atomic, backward-compatible with existing customer data
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. MODIFY EXISTING incidents TABLE ──
ALTER TABLE IF EXISTS incidents
  ADD COLUMN IF NOT EXISTS security_score integer DEFAULT 0 CHECK (security_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS hash_chain_root text;

COMMENT ON COLUMN incidents.security_score IS 'Aggregate 0-100 from all scanner results';
COMMENT ON COLUMN incidents.hash_chain_root IS 'SHA-256 root hash of the immutable audit chain';

-- ── 2. CREATE NEW ENUMS ──
DO $$ BEGIN
  CREATE TYPE scanner_category AS ENUM ('triage', 'isolate', 'repair', 'validate', 'deploy', 'audit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE guideline_severity AS ENUM ('blocker', 'critical', 'warning', 'info');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create pipeline_stage enum if it doesn't exist (for scan_results.agent_stage)
DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM ('triage', 'isolate', 'repair', 'validate', 'deploy', 'audit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. CREATE projects TABLE ──
CREATE TABLE IF NOT EXISTS projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  repo_url    text,
  stack_type  text,
  created_at  timestamptz DEFAULT NOW(),
  updated_at  timestamptz DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY projects_own ON projects FOR ALL USING (EXISTS (
    SELECT 1 FROM customers c WHERE c.id = projects.customer_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY projects_admin ON projects FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. CREATE scanner_registry TABLE ──
CREATE TABLE IF NOT EXISTS scanner_registry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  category          scanner_category NOT NULL,
  tool_type         text NOT NULL,
  version           text DEFAULT 'latest',
  command_template  text NOT NULL,
  output_format     text NOT NULL DEFAULT 'SARIF' CHECK (output_format IN ('SARIF', 'JSON', 'XML', 'text')),
  severity_rules    jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT NOW()
);

ALTER TABLE scanner_registry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY scanner_registry_all ON scanner_registry FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. CREATE scan_results TABLE ──
CREATE TABLE IF NOT EXISTS scan_results (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  agent_stage       text NOT NULL DEFAULT 'triage' CHECK (agent_stage IN ('triage', 'isolate', 'repair', 'validate', 'deploy', 'audit')),
  scanner_id        uuid REFERENCES scanner_registry(id) ON DELETE SET NULL,
  scanner_name      text NOT NULL,
  findings          jsonb DEFAULT '{}',
  raw_output        text,
  parsed_output     jsonb DEFAULT '{}',
  severity_counts   jsonb DEFAULT '{}',
  confidence_score  integer CHECK (confidence_score BETWEEN 0 AND 100),
  execution_time_ms integer,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  created_at        timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_incident ON scan_results(incident_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_stage ON scan_results(agent_stage);
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);

ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY scan_results_customer ON scan_results FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = scan_results.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY scan_results_admin ON scan_results FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. CREATE custom_guidelines TABLE ──
CREATE TABLE IF NOT EXISTS custom_guidelines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_name         text NOT NULL,
  rule_pattern      text NOT NULL,
  language          text,
  severity          guideline_severity NOT NULL DEFAULT 'warning',
  auto_fix_template text,
  description       text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT NOW(),
  updated_at        timestamptz DEFAULT NOW()
);

ALTER TABLE custom_guidelines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY guidelines_project ON custom_guidelines FOR ALL USING (EXISTS (
    SELECT 1 FROM projects p JOIN customers c ON p.customer_id = c.id
    WHERE p.id = custom_guidelines.project_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY guidelines_admin ON custom_guidelines FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 7. CREATE codegraph_snapshots TABLE ──
CREATE TABLE IF NOT EXISTS codegraph_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  repo_url            text NOT NULL,
  commit_hash         text,
  graph_data          jsonb DEFAULT '{}',
  entry_points        text[] DEFAULT '{}',
  dead_code_paths     text[] DEFAULT '{}',
  auth_flow_paths     text[] DEFAULT '{}',
  db_query_paths      text[] DEFAULT '{}',
  created_at          timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codegraph_incident ON codegraph_snapshots(incident_id);

ALTER TABLE codegraph_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY codegraph_customer ON codegraph_snapshots FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = codegraph_snapshots.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY codegraph_admin ON codegraph_snapshots FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8. CREATE audit_hash_chain TABLE ──
CREATE TABLE IF NOT EXISTS audit_hash_chain (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  block_index     integer NOT NULL,
  agent_stage     text NOT NULL DEFAULT 'triage' CHECK (agent_stage IN ('triage', 'isolate', 'repair', 'validate', 'deploy', 'audit')),
  artifact_hash   text NOT NULL,
  previous_hash   text NOT NULL,
  combined_hash   text NOT NULL,
  timestamp       timestamptz DEFAULT NOW(),
  UNIQUE(incident_id, block_index)
);

CREATE INDEX IF NOT EXISTS idx_hash_chain_incident ON audit_hash_chain(incident_id);
CREATE INDEX IF NOT EXISTS idx_hash_chain_index ON audit_hash_chain(block_index);

ALTER TABLE audit_hash_chain ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY hash_chain_customer ON audit_hash_chain FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = audit_hash_chain.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY hash_chain_admin ON audit_hash_chain FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8a. CREATE repair_patches TABLE ──
CREATE TABLE IF NOT EXISTS repair_patches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  pipeline_id   text,
  patches       text[] DEFAULT '{}',
  status        text DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'needs_review', 'applied', 'rejected')),
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW(),
  UNIQUE(incident_id, pipeline_id)
);

ALTER TABLE repair_patches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY repair_patches_customer ON repair_patches FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = repair_patches.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY repair_patches_admin ON repair_patches FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8b. CREATE audit_reports TABLE ──
CREATE TABLE IF NOT EXISTS audit_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id             uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_data             jsonb DEFAULT '{}',
  generated_at            timestamptz DEFAULT NOW(),
  total_duration_minutes  integer,
  total_cost              numeric(10,2),
  root_cause              text,
  fix_description         text,
  compliance_certificate_id text,
  files_modified          integer DEFAULT 0,
  tests_passed            integer DEFAULT 0,
  tests_failed            integer DEFAULT 0,
  created_at              timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_reports_incident ON audit_reports(incident_id);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY audit_reports_customer ON audit_reports FOR SELECT USING (EXISTS (
    SELECT 1 FROM incidents i JOIN customers c ON i.customer_id = c.id
    WHERE i.id = audit_reports.incident_id AND c.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY audit_reports_admin ON audit_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 9. CREATE opsgenie_sync TABLE ──
CREATE TABLE IF NOT EXISTS opsgenie_sync (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opsgenie_user_id  text,
  opsgenie_username text,
  schedule_id       text,
  last_synced_at    timestamptz,
  sync_status       text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'disabled')),
  created_at        timestamptz DEFAULT NOW()
);

ALTER TABLE opsgenie_sync ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY opsgenie_admin ON opsgenie_sync FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY opsgenie_engineer ON opsgenie_sync FOR SELECT USING (
    engineer_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 10. CREATE engineer_invitations TABLE ──
CREATE TABLE IF NOT EXISTS engineer_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE,
  token           text NOT NULL UNIQUE,
  specialization  text[] DEFAULT '{}',
  invited_by      uuid NOT NULL REFERENCES auth.users(id),
  expires_at      timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at         timestamptz,
  created_at      timestamptz DEFAULT NOW()
);

ALTER TABLE engineer_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY invitations_admin ON engineer_invitations FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 11. CREATE oncall_schedules TABLE ──
CREATE TABLE IF NOT EXISTS oncall_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_date       date NOT NULL,
  is_on_call          boolean DEFAULT false,
  opsgenie_schedule_id text,
  created_at          timestamptz DEFAULT NOW(),
  UNIQUE(engineer_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_oncall_date ON oncall_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_oncall_engineer ON oncall_schedules(engineer_id);

ALTER TABLE oncall_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY oncall_admin ON oncall_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordinator', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY oncall_engineer ON oncall_schedules FOR SELECT USING (
    engineer_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 12. ENSURE is_admin() FUNCTION EXISTS ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('coordinator', 'admin')
  );
$$;

-- ── 13. TRIGGER: Prevent audit_hash_chain modification ──
CREATE OR REPLACE FUNCTION prevent_hash_chain_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_hash_chain entries are immutable';
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER immutable_hash_chain
    BEFORE UPDATE OR DELETE ON audit_hash_chain
    FOR EACH ROW EXECUTE FUNCTION prevent_hash_chain_update();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 14. TRIGGER: Update incidents.security_score from scan_results ──
CREATE OR REPLACE FUNCTION update_incident_security_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE incidents
  SET security_score = (
    SELECT COALESCE(AVG(confidence_score), 0)::integer
    FROM scan_results
    WHERE incident_id = NEW.incident_id
    AND status = 'completed'
  )
  WHERE id = NEW.incident_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_update_security_score
    AFTER INSERT OR UPDATE ON scan_results
    FOR EACH ROW EXECUTE FUNCTION update_incident_security_score();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 15. SEED: 42 Scanners ──
INSERT INTO scanner_registry (name, category, tool_type, version, command_template, output_format, severity_rules, is_active)
VALUES
  -- TRIAGE (8 scanners)
  ('Semgrep', 'triage', 'static_analysis', 'latest', 'semgrep --config=auto --json {target}', 'JSON',
   '{"critical": ["owasp", "cwe-89"], "warning": ["style"]}', true),
  ('TruffleHog', 'triage', 'secret_scanner', 'latest', 'trufflehog filesystem --json {target}', 'JSON',
   '{"critical": ["aws_key", "private_key"]}', true),
  ('GitLeaks', 'triage', 'secret_scanner', 'latest', 'gitleaks detect --source {target} --verbose --json', 'JSON',
   '{"critical": ["generic_api_key"]}', true),
  ('npm audit', 'triage', 'dependency_scanner', 'latest', 'npm audit --json', 'JSON',
   '{"critical": ["critical"], "warning": ["high", "moderate"]}', true),
  ('Snyk CLI', 'triage', 'dependency_scanner', 'latest', 'snyk test --json {target}', 'JSON',
   '{"critical": ["critical"]}', true),
  ('OWASP Dependency-Check', 'triage', 'dependency_scanner', 'latest', 'dependency-check --project {name} --scan {target} --format JSON', 'JSON',
   '{"critical": ["9.0-10.0"]}', true),
  ('Trivy FS', 'triage', 'vulnerability_scanner', 'latest', 'trivy filesystem --format json {target}', 'JSON',
   '{"critical": ["CRITICAL"]}', true),
  ('CodeGraph Engine', 'triage', 'graph_builder', 'latest', 'codegraph analyze --repo {target} --output json', 'JSON',
   '{"info": ["graph_built"]}', true),

  -- ISOLATE (7 scanners)
  ('nmap', 'isolate', 'network_scanner', 'latest', 'nmap -sV -sC -oX - {target}', 'XML',
   '{"critical": ["open_port"], "warning": ["service_version"]}', true),
  ('masscan', 'isolate', 'network_scanner', 'latest', 'masscan {target} -p0-65535 --output-format json', 'JSON',
   '{"critical": ["open_port"]}', true),
  ('iptables audit', 'isolate', 'firewall_auditor', 'latest', 'iptables -L -n -v --line-numbers', 'text',
   '{"critical": ["permissive_rule"]}', true),
  ('Checkov', 'isolate', 'infrastructure_scanner', 'latest', 'checkov -d {target} --output json', 'JSON',
   '{"critical": ["CKV_*"]}', true),
  ('Docker Bench', 'isolate', 'container_scanner', 'latest', 'docker-bench-security -j', 'JSON',
   '{"critical": ["warn"]}', true),
  ('Lynis', 'isolate', 'system_auditor', 'latest', 'lynis audit system --json', 'JSON',
   '{"critical": ["hardening_index_low"]}', true),
  ('OpenSCAP', 'isolate', 'compliance_scanner', 'latest', 'oscap xccdf eval --profile standard --results {output} {target}', 'XML',
   '{"critical": ["fail"]}', true),

  -- REPAIR (10 linters)
  ('ESLint', 'repair', 'linter', 'latest', 'eslint {target} --format json', 'JSON',
   '{"warning": ["error"]}', true),
  ('Prettier', 'repair', 'formatter', 'latest', 'prettier --check {target} --json', 'JSON',
   '{"info": ["format_issue"]}', true),
  ('TypeScript Compiler', 'repair', 'type_checker', 'latest', 'tsc --noEmit --pretty false --project {target}', 'text',
   '{"warning": ["error"]}', true),
  ('SonarQube', 'repair', 'code_quality', 'latest', 'sonar-scanner -Dsonar.projectKey={name} -Dsonar.sources={target}', 'text',
   '{"critical": ["BLOCKER"], "warning": ["CRITICAL", "MAJOR"]}', true),
  ('Pylint', 'repair', 'linter', 'latest', 'pylint {target} --output-format=json', 'JSON',
   '{"warning": ["error", "convention"]}', true),
  ('RuboCop', 'repair', 'linter', 'latest', 'rubocop {target} --format json', 'JSON',
   '{"warning": ["convention"]}', true),
  ('Go vet', 'repair', 'linter', 'latest', 'go vet -json {target}', 'JSON',
   '{"warning": ["error"]}', true),
  ('ShellCheck', 'repair', 'linter', 'latest', 'shellcheck --format=json {target}', 'JSON',
   '{"warning": ["error", "warning"]}', true),
  ('Custom Guideline Engine', 'repair', 'rule_engine', 'latest', 'custom-guidelines --project {project_id} --scan {target} --json', 'JSON',
   '{"critical": ["blocker"], "warning": ["critical", "warning"]}', true),
  ('CodeGraph Auto-Fix', 'repair', 'auto_fixer', 'latest', 'codegraph fix --repo {target} --output json', 'JSON',
   '{"info": ["fix_applied"]}', true),

  -- VALIDATE (9 scanners)
  ('ClamAV', 'validate', 'malware_scanner', 'latest', 'clamscan -ri --stdout {target}', 'text',
   '{"critical": ["FOUND"]}', true),
  ('YARA', 'validate', 'malware_scanner', 'latest', 'yara -r {rules} {target}', 'text',
   '{"critical": ["match"]}', true),
  ('chkrootkit', 'validate', 'rootkit_scanner', 'latest', 'chkrootkit', 'text',
   '{"critical": ["INFECTED"]}', true),
  ('OWASP ZAP', 'validate', 'web_scanner', 'latest', 'zap-baseline.py -t {target} -J {output}', 'JSON',
   '{"critical": ["High"]}', true),
  ('Nuclei', 'validate', 'vulnerability_scanner', 'latest', 'nuclei -u {target} -json -o {output}', 'JSON',
   '{"critical": ["critical"]}', true),
  ('Bandit', 'validate', 'security_linter', 'latest', 'bandit -r {target} -f json', 'JSON',
   '{"critical": ["HIGH"]}', true),
  ('CodeQL', 'validate', 'semantic_analysis', 'latest', 'codeql analyze --format=sarifv2.1.0 --output={output} {target}', 'SARIF',
   '{"critical": ["error"]}', true),
  ('Customer Tests', 'validate', 'test_runner', 'latest', 'jest --json --outputFile={output} {target}', 'JSON',
   '{"critical": ["failed"]}', true),
  ('E2E Tests', 'validate', 'test_runner', 'latest', 'cypress run --record --json --project {target}', 'JSON',
   '{"critical": ["failed"]}', true),

  -- DEPLOY (4 scanners)
  ('tfsec', 'deploy', 'infrastructure_scanner', 'latest', 'tfsec {target} --format json', 'JSON',
   '{"critical": ["CRITICAL"]}', true),
  ('cfn-lint', 'deploy', 'infrastructure_scanner', 'latest', 'cfn-lint {target} --format json', 'JSON',
   '{"warning": ["E*"]}', true),
  ('Hadolint', 'deploy', 'container_scanner', 'latest', 'hadolint --format json {target}', 'JSON',
   '{"warning": ["DL*"]}', true),
  ('Dockle', 'deploy', 'container_scanner', 'latest', 'dockle --format json {target}', 'JSON',
   '{"critical": ["FATAL"]}', true),

  -- AUDIT (4 meta-scanners)
  ('SHA-256 Chain Engine', 'audit', 'hash_chain', 'latest', 'hashchain build --incident {incident_id} --output json', 'JSON',
   '{"info": ["chain_built"]}', true),
  ('SARIF Merger', 'audit', 'report_builder', 'latest', 'sarif-merger --input {scans} --output {output}', 'SARIF',
   '{"info": ["merged"]}', true),
  ('Compliance Mapper', 'audit', 'compliance_mapper', 'latest', 'compliance-map --scans {scans} --framework soc2 --output json', 'JSON',
   '{"info": ["mapped"]}', true),
  ('Timeline Reconstructor', 'audit', 'timeline_builder', 'latest', 'timeline-reconstruct --incident {incident_id} --output json', 'JSON',
   '{"info": ["timeline_built"]}', true)

ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  tool_type = EXCLUDED.tool_type,
  command_template = EXCLUDED.command_template,
  output_format = EXCLUDED.output_format,
  severity_rules = EXCLUDED.severity_rules,
  is_active = EXCLUDED.is_active;

COMMIT;
