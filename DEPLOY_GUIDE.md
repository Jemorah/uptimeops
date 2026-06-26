# UptimeOps Deployment Guide

Complete setup guide for deploying UptimeOps to production.

---

## Prerequisites

- GitHub account (repo: `Jemorah/uptimeops`)
- Vercel project (connected to GitHub)
- Supabase project (ID: `npcopjsqgjvirfjnjemt`)

---

## Step 1: Database Schema (SQL Editor)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/npcopjsqgjvirfjnjemt
2. Go to **SQL Editor** → **+ New query**
3. Paste the contents of `supabase/migrations/000_combined_clean.sql`
4. Click **Run**
5. Verify: you should see `UPTIMEOPS COMPLETE` with table/policy counts

### Then run auth triggers:
1. Open `supabase/auth-triggers.sql`
2. Paste into SQL Editor, click **Run**

---

## Step 2: Enable Realtime (SQL Editor)

Paste the contents of `supabase/realtime-setup.sql` into SQL Editor and click **Run**.

This enables live database subscriptions for: incidents, escalations, pipelines, notifications, VMs, audit logs, communications.

---

## Step 3: Storage Policies (SQL Editor)

Paste the contents of `supabase/storage-policies.sql` into SQL Editor and click **Run**.

This secures the `session-recordings` and `audit-evidence` buckets.

---

## Step 4: Deploy Edge Functions

Since you can't access the dashboard fully, use the Supabase CLI:

### Option A: Terminal (if you have one)
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login (opens browser)
supabase login

# Link to your project
supabase link --project-ref npcopjsqgjvirfjnjemt

# Deploy ALL functions at once
supabase functions deploy

# Or deploy individually:
supabase functions deploy ai-orchestrator
supabase functions deploy ai-triage
supabase functions deploy ai-isolate
supabase functions deploy ai-repair
supabase functions deploy ai-validate
supabase functions deploy ai-deploy
supabase functions deploy stripe-webhook
supabase functions deploy subscription-manager
supabase functions deploy engineer-availability
supabase functions deploy communication-sender
supabase functions deploy vm-manager
supabase functions deploy credential-relay
supabase functions deploy credential-decrypt
supabase functions deploy rollback-executor
supabase functions deploy temporary-link-generator
supabase functions deploy webhook-alert
supabase functions deploy audit-logger
```

### Option B: Via Kimi (ask me to generate a deploy script)
If you can't run terminal commands, I can generate a shell script that deploys all functions.

### Option C: Dashboard (if you gain access later)
1. Supabase Dashboard → Edge Functions
2. Click **Deploy Function** for each
3. Upload the `index.ts` file from each folder in `supabase/functions/`

---

## Step 5: Vercel Environment Variables

The Vercel-Supabase integration auto-populates these:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Add Stripe keys (for payments):
1. Go to https://vercel.com/dashboard → Your project
2. **Settings → Environment Variables**
3. Add:
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`

### Add Email key (optional):
- `RESEND_API_KEY` = `re_...` (for email alerts)

---

## Step 6: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. Endpoint URL: `https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Step 7: Redeploy Vercel

1. Push any code changes to GitHub
2. Vercel auto-deploys on push
3. Or: Vercel Dashboard → **Deployments** → **Redeploy** latest

---

## Verification Checklist

- [ ] Database schema ran successfully (validation query shows counts)
- [ ] Auth triggers installed (signup creates customer profile)
- [ ] Realtime enabled (no errors from realtime-setup.sql)
- [ ] Storage policies active (storage-policies.sql verification query shows policies)
- [ ] Edge Functions deployed (17 functions listed)
- [ ] Vercel env vars populated (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Stripe webhook configured
- [ ] Frontend loads without blank screen
- [ ] Login/signup works
- [ ] AI pipeline triggers on new incident

---

## Troubleshooting

**Blank screen on Vercel preview?**
- Check browser console for errors
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel

**SQL migration fails?**
- Check that `pg_cron` extension is enabled (or migration skips it gracefully)
- Run migrations in order: 001 → 002 → 003 → 004 → 005

**Edge Functions fail to deploy?**
- Verify `supabase/config.toml` has correct `project_id`
- Run `supabase login` first

**Realtime not working?**
- Check `supabase_realtime` publication exists: `SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime'`
- Tables must be explicitly added to the publication
