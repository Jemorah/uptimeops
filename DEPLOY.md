# UptimeOps Backend Deployment Guide

## You CANNOT deploy from here directly — follow these steps locally.

---

## Prerequisites

1. **Supabase CLI** installed: `brew install supabase/tap/supabase` (Mac) or `npm install -g supabase`
2. **Logged in**: `supabase login`
3. **Linked project**: `supabase link --project-ref npcopjsqgjvirfjnjemt`

---

## Phase 1: Database Schema (5 minutes)

Open your **Supabase SQL Editor**:
`https://supabase.com/dashboard/project/npcopjsqgjvirfjnjemt/sql/editor`

Paste and run these 3 files **in order**:

### Step 1: Full Schema
```
File: supabase/migrations/000_combined_clean.sql
```
This creates all tables, enums, indexes, triggers, RLS policies, and seed data.
**Run time: ~10 seconds**

### Step 2: Auth Triggers
```
File: supabase/auth-triggers.sql
```
This auto-assigns `customer` role and creates customer profile on signup.
**Run time: ~2 seconds**

### Step 3: Realtime Setup
```
File: supabase/realtime-setup.sql
```
Enables realtime subscriptions for live dashboard updates.
**Run time: ~2 seconds**

### Step 4: Storage Policies
```
File: supabase/storage-policies.sql
```
Sets up encrypted file storage with proper access control.
**Run time: ~2 seconds**

---

## Phase 2: Enable Auth Providers (2 minutes)

Go to `https://supabase.com/dashboard/project/npcopjsqgjvirfjnjemt/auth/providers`

| Provider | Setting |
|----------|---------|
| **Email** | Toggle ON, "Confirm email" = OFF (for testing) |
| **GitHub** | Toggle ON, paste Client ID + Secret from GitHub OAuth App |
| **Google** | Toggle ON, paste Client ID + Secret from Google Cloud Console |

**GitHub OAuth App callback URL:**
```
https://npcopjsqgjvirfjnjemt.supabase.co/auth/v1/callback
```

**Google OAuth redirect URI:**
```
https://npcopjsqgjvirfjnjemt.supabase.co/auth/v1/callback
```

---

## Phase 3: Deploy Edge Functions (5 minutes)

Run these commands from your local machine:

```bash
# 1. Link project (if not already linked)
supabase link --project-ref npcopjsqgjvirfjnjemt

# 2. Set required secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SENTRY_DSN=https://...@sentry.io/...

# 3. Deploy all functions (run this one command)
supabase functions deploy
```

**That's it.** All 18 Edge Functions will be deployed.

---

## Phase 4: Configure Stripe Webhook (2 minutes)

1. Go to **Stripe Dashboard** → Developers → Webhooks
2. Add endpoint:
   ```
   https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/stripe-webhook
   ```
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_...`)
5. Re-set the secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Phase 5: Verify Everything Works (3 minutes)

### Test Auth:
1. Go to your deployed site
2. Try signing up with email
3. Check Supabase Dashboard → Table Editor → `user_roles` — your user should appear
4. Try Google/GitHub login

### Test Database:
```bash
# From your machine
supabase db dump --data-only > verify.sql
```

### Test Edge Functions:
```bash
curl -X POST \
  https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/stripe-webhook \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'
```
Expected: `400 Missing stripe-signature header` (not 404 = function exists)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `relation "user_roles" does not exist` | Run 000_combined_clean.sql first |
| `type "user_role" does not exist` | Same — schema not applied |
| `Unsupported provider` | Enable provider in Supabase Dashboard |
| `provider is not enabled` | Same as above |
| `404 on Edge Function` | Function not deployed — run `supabase functions deploy` |
| `RLS policy violation` | Check policies match user role; use service role for Edge Functions |
| `new row violates row-level security policy` | Auth trigger not running — run auth-triggers.sql |
| `Invalid login credentials` | User exists but wrong password; use "Forgot Password" |
| `{} on email login` | Email confirmation required; turn OFF "Confirm email" in provider settings |
| AI functions return empty | ANTHROPIC_API_KEY not set; run `supabase secrets set` |
| Stripe payment fails | STRIPE_SECRET_KEY not set or wrong key (test vs live) |

---

## What You Need to Provide

| Item | Where to Get It |
|------|-----------------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ → API Keys |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys (starts with `sk_live_` or `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint |
| GitHub OAuth Client ID/Secret | GitHub → Settings → Developer Settings → OAuth Apps |
| Google OAuth Client ID/Secret | Google Cloud Console → APIs & Services → Credentials |

---

## Post-Deployment Checklist

- [ ] Database schema applied (000_combined_clean.sql)
- [ ] Auth triggers installed (auth-triggers.sql)
- [ ] Realtime enabled (realtime-setup.sql)
- [ ] Storage policies set (storage-policies.sql)
- [ ] Email auth enabled in Supabase Dashboard
- [ ] GitHub auth enabled + credentials entered
- [ ] Google auth enabled + credentials entered
- [ ] All 18 Edge Functions deployed
- [ ] Secrets set (ANTHROPIC_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Stripe webhook endpoint configured
- [ ] Email sign-up works
- [ ] Google/ GitHub login works
- [ ] Dashboard loads with data

---

## Security Notes

- **NEVER** commit `STRIPE_SECRET_KEY` or `ANTHROPIC_API_KEY` to git
- **NEVER** use the service_role key in the frontend
- The `SUPABASE_SERVICE_ROLE_KEY` is automatically available to Edge Functions via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — do NOT set it manually
- RLS policies are already configured: users can only see their own data, admins see everything
- Audit logs are immutable (UPDATE/DELETE triggers block modifications)
