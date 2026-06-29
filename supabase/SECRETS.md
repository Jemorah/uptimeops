# ═══════════════════════════════════════════════════════════════
# UptimeOps Edge Function Secrets Configuration
# Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets
# ═══════════════════════════════════════════════════════════════

# ── Core Supabase (REQUIRED for all functions) ──
SUPABASE_URL=https://npcopjsqgjvirfjnjemt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── AI Providers (REQUIRED for AI pipeline) ──
# Set at least one. Anthropic (Claude) is preferred.
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# ── Stripe (REQUIRED for payments) ──
STRIPE_WEBHOOK_SECRET=whsec_...
# NOTE: stripe-webhook validates signatures using this secret

# ── OpsGenie (REQUIRED for on-call scheduling) ──
OPSGENIE_API_KEY=GenieKey ...

# ── Resend (REQUIRED for email sending) ──
RESEND_API_KEY=re_...

# ── Site URL (REQUIRED for email links) ──
SITE_URL=https://uptimeops.com

# ── Token Security (REQUIRED for temporary links) ──
TOKEN_SALT=change-this-to-a-random-32-char-string

# ── AWS (OPTIONAL — for VM provisioning) ──
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# ── Sentry (OPTIONAL — for error tracking) ──
SENTRY_DSN=https://...@....ingest.sentry.io/...

# ═══════════════════════════════════════════════════════════════
# HOW TO SET SECRETS
# ═══════════════════════════════════════════════════════════════
#
# Method 1: Supabase CLI
#   supabase secrets set --env-file ./supabase/.env
#
# Method 2: Supabase Dashboard
#   Dashboard → Project Settings → Edge Functions → Secrets
#
# Method 3: One by one
#   supabase secrets set SUPABASE_URL=https://...
#   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
#   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
#   ... etc
#
# ═══════════════════════════════════════════════════════════════
# SECRET → FUNCTION MAPPING
# ═══════════════════════════════════════════════════════════════
#
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
#   → ai-orchestrator, ai-* (all 6), engineer-availability,
#     stripe-webhook, webhook-alert, _shared/supabase.ts
#
# ANTHROPIC_API_KEY or OPENAI_API_KEY
#   → ai-orchestrator, ai-triage, ai-isolate, ai-repair,
#     ai-validate, ai-deploy, ai-audit, _shared/ai.ts
#
# OPSGENIE_API_KEY
#   → opsgenie-sync
#
# RESEND_API_KEY
#   → communication-sender
#
# STRIPE_WEBHOOK_SECRET
#   → stripe-webhook (signature verification)
#
# SITE_URL
#   → send-engineer-invite
#
# TOKEN_SALT
#   → temporary-link-generator
#
# AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
#   → vm-manager
#
# SENTRY_DSN
#   → All functions (via Sentry.init in _shared/sentry.ts)
#