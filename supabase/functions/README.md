# UptimeOps Edge Functions

17 Deno Edge Functions for the UptimeOps platform.

## Deploy All Functions

```bash
supabase functions deploy
```

Or deploy individually:
```bash
supabase functions deploy ai-orchestrator
supabase functions deploy stripe-webhook
```

## Functions

### Core Pipeline (6 AI Agents)
| Function | Purpose | Endpoint |
|----------|---------|----------|
| `ai-orchestrator` | Master pipeline controller | `/ai-orchestrator` |
| `ai-triage` | Analyze severity, assign priority | `/ai-triage` |
| `ai-isolate` | Spin up isolated VM | `/ai-isolate` |
| `ai-repair` | Generate fix commands | `/ai-repair` |
| `ai-validate` | Run smoke tests | `/ai-validate` |
| `ai-deploy` | Deploy fix to production | `/ai-deploy` |

### Operations
| Function | Purpose | Endpoint |
|----------|---------|----------|
| `vm-manager` | Create/monitor/destroy VMs | `/vm-manager` |
| `credential-relay` | Store encrypted credentials | `/credential-relay` |
| `credential-decrypt` | Decrypt for authorized engineers | `/credential-decrypt` |
| `rollback-executor` | Rollback failed deployments | `/rollback-executor` |
| `temporary-link-generator` | Time-limited access tokens | `/temporary-link-generator` |

### Business Logic
| Function | Purpose | Endpoint |
|----------|---------|----------|
| `stripe-webhook` | Process Stripe events | `/stripe-webhook` |
| `subscription-manager` | Plans, pause, MRR | `/subscription-manager` |
| `engineer-availability` | On-call, assignment | `/engineer-availability` |
| `communication-sender` | Email, SMS, push, dashboard | `/communication-sender` |

### Integration
| Function | Purpose | Endpoint |
|----------|---------|----------|
| `webhook-alert` | External monitoring alerts | `/webhook-alert` |
| `audit-logger` | SHA-256 audit chain | `/audit-logger` |

## Shared Utilities

| File | Purpose |
|------|---------|
| `_shared/cors.ts` | CORS headers + preflight handler |
| `_shared/logger.ts` | Structured JSON logging |
| `_shared/supabase.ts` | Supabase client factory + auth helper |

## Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxx
TWILIO_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE=+1234567890
```

## Request Format

All functions accept POST with JSON body:
```json
{
  "action": "heartbeat",
  "param1": "value"
}
```

Response format:
```json
{
  "success": true,
  "data": {}
}
```
