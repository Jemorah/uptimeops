# UptimeOps Supabase Edge Functions

Complete serverless backend with 10 Edge Functions powering the UptimeOps platform.

## Architecture

```
Frontend / Webhooks
       |
       v
+------+------+------+------+------+------+------+------+------+-------+
|stripe|  ai  |  vm  | cred | comm |audit | sub  | eng  | temp |rollback|
|webhook|orch  |mgr   |decrypt|send |logger|mgr   |avail |link  |exec   |
+------+------+------+------+------+------+------+------+------+-------+
       |              |              |              |
       v              v              v              v
   +-----------------------------------------------+
   |           Supabase PostgreSQL                 |
   |  customers | incidents | subscriptions | etc   |
   +-----------------------------------------------+
```

## Function Reference

| # | Function | Trigger | Purpose |
|---|----------|---------|---------|
| 1 | `stripe-webhook` | Stripe events | Payment processing, subscription management, retry logic |
| 2 | `ai-orchestrator` | HTTP / DB trigger | 6-agent pipeline with state machine, retry, escalation |
| 3 | `vm-manager` | HTTP / ai-orchestrator | VM spawn/destroy/run, cloud provider integration |
| 4 | `credential-decrypt` | HTTP / engineer portal | Approval flow, ephemeral key relay, zero-knowledge |
| 5 | `communication-sender` | HTTP / DB trigger | SMS (Twilio), Email (Resend), Dashboard notifications |
| 6 | `audit-logger` | HTTP / DB trigger | Immutable audit trail, CSV/JSON export |
| 7 | `subscription-manager` | Cron daily | Renewals, allowance reset, churn prediction, overage |
| 8 | `engineer-availability` | Cron 2min | Presence check, round-robin assignment, zero-eng alert |
| 9 | `temporary-link-generator` | HTTP / incident close | 64-char tokens, 72h expiry, auto-cleanup, archive |
| 10 | `rollback-executor` | HTTP / smoke fail | Snapshot restore, coordinator gate, re-escalation |

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- Deno runtime (bundled with Supabase CLI)

## Environment Variables

Set these in your Supabase Dashboard (Project Settings > Functions):

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (SMS)
TWILIO_SID=AC...
TWILIO_TOKEN=...
TWILIO_FROM=+1...

# Resend (Email)
RESEND_API_KEY=re_...
FROM_EMAIL=alerts@uptimeops.com

# VM Provider (DigitalOcean)
DIGITALOCEAN_TOKEN=dop_v1_...
DIGITALOCEAN_SSH_KEY_ID=12345678
VM_PROVIDER=digitalocean
VM_SIZE=s-1vcpu-1gb
VM_IMAGE=ubuntu-22-04-x64
VM_REGION=nyc1

# Frontend
FRONTEND_URL=https://uptimeops.com

# Logging
LOG_LEVEL=info
```

## Deploy All Functions

### 1. Login
```bash
supabase login
```

### 2. Link project
```bash
supabase link --project-ref your-project-ref
```

### 3. Deploy functions
```bash
# Deploy all at once
supabase functions deploy

# Or deploy individually
supabase functions deploy stripe-webhook
supabase functions deploy ai-orchestrator
supabase functions deploy vm-manager
supabase functions deploy credential-decrypt
supabase functions deploy communication-sender
supabase functions deploy audit-logger
supabase functions deploy subscription-manager
supabase functions deploy engineer-availability
supabase functions deploy temporary-link-generator
supabase functions deploy rollback-executor
```

### 4. Set secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set TWILIO_SID=AC...
supabase secrets set TWILIO_TOKEN=...
supabase secrets set TWILIO_FROM=+1...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set DIGITALOCEAN_TOKEN=dop_v1_...
supabase secrets set DIGITALOCEAN_SSH_KEY_ID=12345678
supabase secrets set FRONTEND_URL=https://uptimeops.com
```

### 5. Configure Stripe webhook
In Stripe Dashboard, set webhook endpoint to:
```
https://your-project.supabase.co/functions/v1/stripe-webhook
```
Events to listen for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

### 6. Configure Database Webhooks
In Supabase Dashboard (Database > Webhooks):

**Trigger: `incidents` table INSERT**
```sql
-- When a new incident is created, trigger AI orchestrator
-- Webhook URL: https://your-project.supabase.co/functions/v1/ai-orchestrator
```

**Trigger: Any table INSERT/UPDATE (for audit)**
```sql
-- For immutable audit logging
-- Webhook URL: https://your-project.supabase.co/functions/v1/audit-logger
```

### 7. Configure Cron Jobs
In Supabase Dashboard (Database > Cron Jobs) or via SQL:

```sql
-- Daily subscription check (Function 7)
SELECT cron.schedule('subscription-daily', '0 9 * * *', $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/subscription-manager',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "daily_cron"}'::jsonb
  ) AS request_id;
$$);

-- Engineer availability check every 2 minutes (Function 8)
SELECT cron.schedule('engineer-check', '*/2 * * * *', $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/engineer-availability',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "cron_check"}'::jsonb
  ) AS request_id;
$$);

-- Cleanup expired temporary links (Function 9)
SELECT cron.schedule('cleanup-links', '0 */6 * * *', $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/temporary-link-generator',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "cleanup_expired"}'::jsonb
  ) AS request_id;
$$);

-- Archive old temporary links daily (Function 9)
SELECT cron.schedule('archive-links', '0 3 * * *', $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/temporary-link-generator',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{"action": "archive_old"}'::jsonb
  ) AS request_id;
$$);
```

## Testing

### Local development
```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve stripe-webhook --env-file .env

# Test with curl
curl -X POST http://localhost:54321/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_test","amount_received":9900}}}'
```

### Invoking deployed functions
```bash
# With service role key
curl -X POST https://your-project.supabase.co/functions/v1/ai-orchestrator \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"incident_id":"test-id","trigger":"payment_received"}'
```

## Security

- All functions require `SUPABASE_SERVICE_ROLE_KEY` in Authorization header
- Stripe webhooks verify signature with `STRIPE_WEBHOOK_SECRET`
- Credentials never touch plaintext (Function 4)
- Audit logs are append-only with SHA-256 chain verification
- VM sessions auto-destroy after 4 hours
- Temporary links use SHA-256 hashed tokens (raw tokens never stored)
- Rollback requires coordinator permission for manual execution

## Monitoring

Enable Supabase Logs Explorer to view function execution logs:
```sql
-- Recent function invocations
SELECT timestamp, event_message
FROM edge_logs
WHERE path LIKE '/functions/v1/%'
ORDER BY timestamp DESC
LIMIT 100;
```
