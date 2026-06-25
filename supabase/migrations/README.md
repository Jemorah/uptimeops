# UptimeOps Database Migrations

Complete PostgreSQL schema for the UptimeOps platform. Run these in order in the Supabase SQL Editor.

## Quick Start

1. Go to your Supabase project Dashboard → SQL Editor
2. Run each migration file in order (001 → 005)
3. Verify with the validation output at the end of migration 005

## Migration Order

| File | Tables Created | Purpose |
|------|---------------|---------|
| `001_schema_core.sql` | 5 tables + enums | Customers, auth roles, subscriptions, one-time fixes, credentials vault |
| `002_schema_incidents.sql` | 6 tables | Incidents, pipeline states, escalations, VM sessions, snapshots, smoke tests |
| `003_schema_audit_comms.sql` | 7 tables | Audit logs (immutable), communications, notifications, temp links, engineer/coord profiles, churn |
| `004_functions_cron.sql` | 0 tables | 9 cron jobs, 3 helper functions, storage buckets, realtime config |
| `005_webhooks_seed.sql` | 0 tables | 3 webhooks, auto-log triggers, comprehensive seed data |

## Tables Overview (18 total)

### Core (5)
- `user_roles` — Maps auth.users to application roles
- `customers` — Customer profiles with plan, MRR, risk scoring
- `subscriptions` — Stripe subscription tracking with incident allowances
- `one_time_fixes` — Emergency one-time fix payment tracking
- `credentials_vault` — Zero-knowledge encrypted credential storage

### Incidents & Pipeline (6)
- `incidents` — Incident lifecycle from lead_capture to closed
- `pipeline_states` — AI 6-agent pipeline execution tracking
- `human_escalations` — Engineer assignment and escalation queue
- `vm_sessions` — Cloud VM lifecycle (create → run → destroy)
- `vm_commands` — Command history per VM session
- `deployment_snapshots` — Pre-deployment immutable snapshots
- `smoke_tests` — Post-deployment validation test results

### Audit & Communications (4)
- `audit_logs` — **Immutable** append-only audit trail with SHA-256 chain
- `communications_log` — All SMS/email/push/dashboard messages
- `notifications` — In-app dashboard notifications
- `temporary_links` — 72h expiring access tokens for fix verification

### Profiles (3)
- `engineer_profiles` — Engineer presence, workload, performance
- `coordinator_profiles` — Coordinator permissions and contact info
- `churn_events` — Customer churn tracking with win-back sequences

## Enums (7)

| Enum | Values |
|------|--------|
| `user_role` | public, customer, engineer, coordinator, admin |
| `plan_tier` | guardian ($99), sentinel ($249), fortress ($599) |
| `subscription_status` | active, paused, past_due, cancelled, trialing |
| `incident_priority` | P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW |
| `incident_status` | 14 stages from lead_capture to closed |
| `pipeline_status` | running, awaiting_approval, completed, failed, escalated, rollback |
| `escalation_status` | pending_assignment, assigned, acknowledged, in_progress, resolved |

## Security

### Row Level Security (RLS)
- **47 policies** across all tables
- Own-record access for customers
- Role-based access for engineers and coordinators
- Service role bypass for edge functions
- **Audit logs are immutable** — UPDATE/DELETE triggers raise exceptions

### Indexes (40+)
- Composite indexes on active incidents (status + priority + created)
- Partial indexes for active subscriptions and running VMs
- Fingerprint index on credentials for zero-knowledge lookup
- Hash index on temporary link tokens

## Automation

### Cron Jobs (9)
| Job | Schedule | Purpose |
|-----|----------|---------|
| `subscription-daily` | Daily 9AM | Renewals, reminders, allowance reset |
| `engineer-check` | Every 2 min | Online status, auto-assignment, timeout |
| `cleanup-links` | Every 6 hours | Expire stale temporary links |
| `archive-links` | Daily 3AM | Archive 30+ day old links |
| `cleanup-vms` | Hourly | Destroy 4h+ old VMs |
| `cleanup-credentials` | Daily 4AM | Revoke expired credentials |
| `winback-30d` | Daily 10AM | 30-day churn win-back email |
| `winback-60d` | Daily 10AM | 60-day churn win-back email |
| `winback-90d` | Daily 10AM | 90-day churn win-back email |

### Webhooks (3)
| Trigger | Action |
|---------|--------|
| Incident INSERT | Auto-trigger AI orchestrator |
| Pipeline → awaiting_approval | Notify coordinator via dashboard |
| Incident → resolved | Send notification + generate temp link |

### Functions (6)
| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Auto-timestamp on all tables |
| `prevent_audit_modification()` | Blocks UPDATE/DELETE on audit_logs |
| `calculate_audit_hash()` | SHA-256 chain for audit integrity |
| `log_table_change()` | Auto-log table changes to audit_logs |
| `get_dashboard_metrics()` | HQ dashboard KPI aggregation |
| `get_engineer_performance()` | Engineer performance report |
| `get_customer_health()` | Customer health scoring (0-100) |
| `archive_expired_links()` | Bulk archive old temporary links |

## Seed Data

Migration 005 includes realistic seed data:
- 8 customers (active, leads, churned)
- 4 subscriptions across all 3 plans
- 8+ incidents (P1 through P4, various stages)
- 3 engineers + 2 coordinators
- 3 one-time fixes (paid, failed, pending)
- Pipeline states, communications, notifications, VM sessions

## Post-Migration Setup

After running all migrations, configure these in the Supabase Dashboard:

1. **Auth → URL Configuration**: Set Site URL to `https://uptimeops.com`
2. **Auth → Email Templates**: Customize magic link email
3. **Database → Webhooks**: Verify pg_net extension for HTTP webhooks
4. **Storage**: Upload your logo to `reports` bucket
5. **Settings → API**: Copy `anon` and `service_role` keys to your `.env`
