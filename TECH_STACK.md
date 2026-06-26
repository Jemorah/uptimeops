# UptimeOps — Technology Stack

Complete technical specification for the UptimeOps platform.

## Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Vite + React + TypeScript | Vite 7, React 19, TS 5.9 |
| Styling | Tailwind CSS + shadcn/ui | Tailwind 3.4, Radix UI |
| State | Zustand + TanStack Query | Zustand 5, Query 5 |
| Backend | Supabase | PostgreSQL 16, Deno 2 |
| AI | ANTIGRAVITY SDK + Claude 3.5 Sonnet | Multi-agent |
| Payments | Stripe | PaymentIntent + Subscription |
| Comms | Resend (email) | Transactional |
| Deploy | Vercel (FE) + Supabase (BE) | Global CDN, Edge Functions |

---

## Frontend Stack

### Core
- **Vite 7** — Build tool with HMR, code splitting, Terser minification
- **React 19** — UI framework with concurrent features
- **TypeScript 5.9** — Strict mode, no unchecked side effects
- **React Router v7** — SPA routing with 10 protected routes

### Styling
- **Tailwind CSS 3.4** — Utility-first CSS with custom cyberpunk palette
- **shadcn/ui** — 30+ Radix-based components (dark mode by default)
- **tailwindcss-animate** — Custom animations (fade, slide, glow, scan)
- **lucide-react** — 400+ icons

### State Management
- **Zustand 5** — Global store (auth, incidents, UI, notifications, presence)
  - `persist` middleware for localStorage sync
  - Slice pattern for modular state
- **TanStack Query 5** — Server state with automatic caching
  - Query key factory for type-safe invalidation
  - Stale time: 30s, GC time: 5min
  - Retry with exponential backoff

### Forms
- **React Hook Form 7** — Performance-optimized form handling
- **Zod 4** — Schema validation with TypeScript inference
- **@hookform/resolvers** — Zod resolver integration

### Real-time
- **Supabase Realtime** — WebSocket subscriptions
- **Custom hooks**: `useRealtime`, `useIncidentRealtime`, `useIncidentQueueRealtime`

### Charts
- **Recharts 2** — 4 chart types (Line, Area, Bar, Pie) with tooltips

### 3D / Animation
- **Three.js 0.185** — Hero section 3D visualizations
- **GSAP 3.15** — ScrollTrigger animations on landing page
- **postprocessing** — Bloom, noise, glitch effects

### Terminal
- **@xterm/xterm** — Browser-based VM terminal
- **xterm-addon-fit** — Auto-resize
- **monaco-editor** — Code editor with syntax highlighting

---

## Backend Stack

### Supabase Platform
| Feature | Technology | Purpose |
|---------|-----------|---------|
| Database | PostgreSQL 16 | Managed, auto-backup, PITR |
| Auth | Supabase Auth | Magic links, OAuth, MFA, RBAC |
| Edge Functions | Deno 2 | 10 serverless functions |
| Realtime | WebSocket | Live incident updates |
| Storage | S3-compatible | Encrypted backups, exports |
| Vector | pgvector | AI embeddings (future RAG) |
| Security | RLS + SSL | Row-level security, SOC 2 roadmap |

### Edge Functions (10)
| # | Function | Runtime | Trigger |
|---|----------|---------|---------|
| 1 | `stripe-webhook` | Deno 2 | Stripe events |
| 2 | `ai-orchestrator` | Deno 2 | HTTP / DB trigger |
| 3 | `vm-manager` | Deno 2 | HTTP / ai-orchestrator |
| 4 | `credential-decrypt` | Deno 2 | HTTP / engineer portal |
| 5 | `communication-sender` | Deno 2 | HTTP / DB trigger |
| 6 | `audit-logger` | Deno 2 | HTTP / DB trigger |
| 7 | `subscription-manager` | Deno 2 | Cron daily |
| 8 | `engineer-availability` | Deno 2 | Cron 2min |
| 9 | `temporary-link-generator` | Deno 2 | HTTP / incident close |
| 10 | `rollback-executor` | Deno 2 | HTTP / smoke fail |

### Shared Utilities
- `_shared/cors.ts` — CORS headers + response helpers
- `_shared/supabase.ts` — Service client + auth verification
- `_shared/logger.ts` — Structured JSON logging

### Database Schema (11 tables)
`customers`, `subscriptions`, `credentials_vault`, `incidents`, `one_time_fixes`, `vm_sessions`, `audit_logs`, `human_escalations`, `notifications`, `pipeline_states`, `deployment_snapshots`

---

## AI Stack

| Component | Technology | Role |
|-----------|-----------|------|
| Orchestration | ANTIGRAVITY SDK | Multi-agent framework |
| LLM Primary | Claude 3.5 Sonnet | Triage, Repair, Validate, Audit |
| LLM Secondary | Jules | Infrastructure automation |
| Fallback | GPT-4o | Auto-switch if Claude unavailable |
| Cost Model | Pay-as-you-go | Backend-only, absorbed into pricing |

### Agent Pipeline
```
TRIAGE → ISOLATE → REPAIR → VALIDATE → DEPLOY → AUDIT
  ↑___________________________________________↓ (rollback loop)
  ↓___________________________________________↑ (escalation loop)
```

---

## Payment Stack

| Component | Technology |
|-----------|-----------|
| Processor | Stripe (PaymentIntent + Subscription) |
| Webhooks | Supabase Edge Function (`stripe-webhook`) |
| Invoicing | Stripe-generated, auto-emailed |
| Tax | Stripe Tax (location-based) |
| Retry | 3 attempts with exponential backoff |
| Dunning | Auto-email on payment failure |

### Plans
| Plan | Price | Incidents | Response |
|------|-------|-----------|----------|
| Guardian | $99/mo | 3 | 15 min |
| Sentinel | $249/mo | 10 | 5 min |
| Fortress | $599/mo | Unlimited | 2 min |

---

## Communication Stack

| Channel | Provider | Use Case |
|---------|----------|----------|
| Email (transactional) | Resend | Status updates, invoices, approvals |
| Email (marketing) | Mailchimp | Nurture sequences, newsletters |
| Push | Web Push API | Real-time dashboard notifications |
| Dashboard | Supabase Realtime | In-app notifications |

---

## Monitoring & Observability

| Layer | Tool | Purpose |
|-------|------|---------|
| Application | Vercel Analytics + Speed Insights | Web vitals, performance |
| Error Tracking | Sentry | Frontend + Edge Function errors |
| Uptime (external) | UptimeRobot + Pingdom | Service availability |
| AI Costs | Custom HQ dashboard | Per-incident cost tracking |
| Logs | Supabase + Vercel | 30-day retention |

---

## Security Hardening

| Layer | Implementation |
|-------|---------------|
| CSP | Strict headers, no inline scripts |
| Transport | HSTS (max-age=63072000), SSL |
| Headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| Rate Limiting | 100 req/min (public), 500 (auth), 10 (sensitive) |
| Input | Zod schemas, SQL injection prevention |
| CORS | Strict origin whitelist |
| Dependencies | Snyk weekly automated scans |
| Credentials | Zero-knowledge AES-256-GCM (browser-side encryption) |
| Audit | Immutable SHA-256 chain, append-only logs |

---

## Deployment Pipeline

```
Git Push
   │
   ├── GitHub Actions CI
   │      ├── TypeScript type check
   │      ├── ESLint
   │      ├── Prettier format check
   │      └── Build (Vite)
   │
   ├── Parallel Deploy
   │      ├── Vercel (frontend → global CDN)
   │      └── Supabase (edge functions)
   │
   └── Smoke Test
          ├── curl / (200 OK)
          ├── curl /pricing (200 OK)
          ├── curl /emergency (200 OK)
          └── curl Edge Functions (200 OK)
```

---

## Environment Variables

### Required (17 total)

| Variable | Used By | Source |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | Frontend | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase Dashboard |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Supabase Dashboard |
| `STRIPE_SECRET_KEY` | Edge Functions | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Stripe Dashboard |
| `RESEND_API_KEY` | communication-sender | Resend Dashboard |
| `DIGITALOCEAN_TOKEN` | vm-manager | DO Control Panel |
| `DIGITALOCEAN_SSH_KEY_ID` | vm-manager | DO Control Panel |
| `FRONTEND_URL` | Multiple | Vercel Dashboard |
| `ANTIGRAVITY_API_KEY` | ai-orchestrator | ANTIGRAVITY |
| `ANTHROPIC_API_KEY` | ai-orchestrator | Anthropic Console |
| `VITE_SENTRY_DSN` | Frontend | Sentry Dashboard |
| `SENTRY_AUTH_TOKEN` | Build | Sentry Dashboard |

### File Locations
- `.env.example` — Production template (committed)
- `.env.local.example` — Local dev template (committed)
- `.env` — Production secrets (gitignored, Vercel/Supabase Vault)
- `.env.local` — Local dev secrets (gitignored)
