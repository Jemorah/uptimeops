# UptimeOps Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 2. Run the Schema
In the Supabase SQL Editor, run the entire contents of `schema.sql`. This creates:
- 15 custom enum types
- 11 tables with full constraints
- 20+ indexes for performance
- 8 automated triggers
- Row Level Security (RLS) policies on all tables
- Realtime publication setup
- 5 helper functions
- Seed data for development

### 3. Deploy Edge Functions
```bash
# Login to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Deploy all functions
npx supabase functions deploy ai-triage
npx supabase functions deploy ai-isolate
npx supabase functions deploy ai-repair
npx supabase functions deploy ai-validate
npx supabase functions deploy ai-deploy
npx supabase functions deploy ai-orchestrator
npx supabase functions deploy webhook-stripe
npx supabase functions deploy webhook-alert
```

### 4. Configure Database Webhooks (for auto-pipeline)
In Supabase Dashboard > Database > Webhooks:

**Webhook 1: Auto-Start Pipeline on New Incident**
- Table: `incidents`
- Events: `INSERT`
- HTTP Request: `POST` to `https://your-project.supabase.co/functions/v1/ai-orchestrator`
- Headers: `Authorization: Bearer SERVICE_ROLE_KEY`
- Body: `{"incident_id": "{{record.id}}", "trigger": "new_incident"}`

**Webhook 2: Auto-Start on Fix Payment**
- Table: `one_time_fixes`
- Events: `UPDATE` (when status changes to 'paid')
- HTTP Request: `POST` to `https://your-project.supabase.co/functions/v1/ai-orchestrator`
- Body: `{"fix_id": "{{record.id}}", "trigger": "payment_received"}`

### 5. Enable Auth
In Supabase Dashboard > Authentication:
- Enable Email provider
- Enable OAuth providers (GitHub, Google) as needed
- Configure Site URL to your frontend URL

### 6. Configure Storage
The schema creates 4 private buckets:
- `session-recordings` - Engineer session recordings
- `audit-artifacts` - Exported audit logs and reports
- `customer-uploads` - Screenshots and log files from customers
- `vm-snapshots` - Rollback snapshots for deployments

### 7. Configure Realtime
Realtime is automatically enabled on these tables:
- `incidents` - Live incident status updates
- `vm_sessions` - VM pipeline progress streaming
- `audit_logs` - Real-time audit trail
- `deployment_approvals` - Coordinator approval notifications
- `engineers` - Engineer availability changes
- `one_time_fixes` - Fix status updates

Client-side subscription example:
```typescript
const subscription = supabase
  .channel('incidents')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, callback)
  .subscribe();
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vite/React)                     │
│  Landing │ Customer │ Fix │ Engineer │ HQ │ Auth                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼ Supabase Client (RLS-enforced)
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE PLATFORM                              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Auth      │  │  Database   │  │    Realtime             │ │
│  │  (OAuth)    │  │ (PostgreSQL)│  │    (WebSocket)          │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                  │                      │               │
│         └──────────────────┼──────────────────────┘               │
│                            │                                      │
│         ┌──────────────────┼──────────────────────┐               │
│         ▼                  ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EDGE FUNCTIONS (Deno/TypeScript)              │   │
│  │                                                           │   │
│  │  ai-triage  ──► ai-isolate ──► ai-repair ──► ai-validate  │   │
│  │     ▲                                                        │   │
│  │     └────────────────────────────────────► ai-deploy ◄──────┘   │
│  │                                                    ▲            │
│  │                                                    │            │
│  │              webhook-stripe ◄── Stripe Payments    │            │
│  │              webhook-alert  ◄── Monitoring Tools   │            │
│  │                                                    │            │
│  │              ai-orchestrator (master pipeline) ────┘            │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Storage   │  │  Triggers   │  │    RLS Policies         │ │
│  │  (4 buckets)│  │  (8 total)  │  │    (11 tables)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Database Tables

| # | Table | Purpose | Rows (est) |
|---|-------|---------|-----------|
| 1 | `customers` | User accounts & subscription state | 10K+ |
| 2 | `one_time_fixes` | Pay-per-fix transactions | 5K+ |
| 3 | `subscriptions` | Recurring billing records | 8K+ |
| 4 | `incidents` | Infrastructure incidents | 50K+ |
| 5 | `vm_sessions` | Isolated repair environments | 50K+ |
| 6 | `engineers` | On-call engineering team | 20 |
| 7 | `coordinators` | Admin/coordinator accounts | 10 |
| 8 | `audit_logs` | Compliance audit trail | 500K+ |
| 9 | `credentials_vault` | Encrypted session credentials | 20K+ |
| 10 | `communications` | Customer notifications | 200K+ |
| 11 | `deployment_approvals` | Coordinator approval queue | 10K+ |

## Triggers

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `tr_customers_updated_at` | customers | UPDATE | Auto-set updated_at |
| `tr_fixes_updated_at` | one_time_fixes | UPDATE | Auto-set updated_at |
| `tr_subscriptions_updated_at` | subscriptions | UPDATE | Auto-set updated_at |
| `tr_incidents_updated_at` | incidents | UPDATE | Auto-set updated_at |
| `tr_vm_session_status` | vm_sessions | UPDATE | Cascade to fix + audit log |
| `tr_incident_status` | incidents | UPDATE | Audit log + comms on escalation |
| `tr_incident_created` | incidents | INSERT | Auto-audit log |
| `tr_fix_created` | one_time_fixes | INSERT | Auto-audit log |
| `tr_auto_vm_session` | incidents | INSERT | Auto-create VM session |
| `tr_cleanup_expired_creds` | credentials_vault | INSERT/UPDATE | Revoke expired credentials |

## Security

All tables have Row Level Security enabled:
- **Customers**: Can only read/update their own records
- **Engineers**: Can access assigned incidents and all engineer data
- **Coordinators**: Full read access to all records, can approve deployments
- **Audit Logs**: No direct customer access (engineer/coordinator only)
- **Credentials**: Time-bound and revocable, encrypted client-side
