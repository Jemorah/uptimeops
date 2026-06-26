# UptimeOps Database Migrations

Complete PostgreSQL schema for the UptimeOps platform. Run these in order in the Supabase SQL Editor.

## Quick Start

### Option A: Single File (Recommended)
1. Open `000_combined_clean.sql`
2. Paste entire contents into Supabase SQL Editor
3. Click Run

### Option B: Individual Files
Run in order: `001` → `002` → `003` → `004` → `005`

## Migration Files

| File | Tables | Purpose |
|------|--------|---------|
| `000_combined_clean.sql` | All 20 | Single-file complete schema |
| `001_schema_core.sql` | 6 | Users, customers, subscriptions, credentials, payments |
| `002_schema_incidents.sql` | 7 | Incidents, pipeline, escalations, VMs, snapshots, smoke tests |
| `003_schema_audit_comms.sql` | 7 | Audit logs, communications, notifications, profiles, churn |
| `004_functions_cron.sql` | 0 | Dashboard functions, 7 cron jobs, storage buckets |
| `005_webhooks_seed.sql` | 0 | Triggers, comprehensive seed data, validation |

## Tables (20 total)

**Core:** user_roles, customers, subscriptions, one_time_fixes, credentials_vault, payment_methods
**Incidents:** incidents, pipeline_states, human_escalations, vm_sessions, vm_commands, deployment_snapshots, smoke_tests
**Audit/Comms:** audit_logs, communications_log, notifications, temporary_links
**Profiles:** engineer_profiles, coordinator_profiles, churn_events
**Archive:** temporary_links_archive

## Security

- **Row Level Security (RLS)** on all tables
- **47+ policies** — own-record, role-based, service role bypass
- **Audit logs are immutable** — UPDATE/DELETE blocked
- **SHA-256 chain** for audit integrity
- **Zero-knowledge credentials** — server never sees plaintext

## Post-Migration Setup

1. **Auth → URL Configuration**: Set your production URL
2. **Auth → Email Templates**: Customize magic link
3. **Database → Replication**: Enable realtime for key tables
4. **Storage**: Buckets auto-created (session-recordings, audit-evidence)
5. **Settings → API**: Copy keys to your `.env`

## Auth Triggers

After migrations, run `auth-triggers.sql` to enable auto-role assignment on signup.
