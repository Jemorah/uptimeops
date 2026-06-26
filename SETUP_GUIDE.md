# UptimeOps — Complete Setup Guide
## From Zero to Production

---

## PHASE 1: Create Accounts (5 minutes)

### 1.1 Supabase (Database + Auth + Edge Functions)
1. Go to https://supabase.com and sign up (free tier is fine)
2. Click **New Project**
3. Name: `uptimeops`
4. Database Password: Generate a strong one, save it in a password manager
5. Region: Pick closest to your users (e.g., `US East`)
6. Click **Create new project** (takes ~2 minutes)

**Save these from your project dashboard:**
- Project URL (e.g., `https://xxxxx.supabase.co`)
- Project API Keys (anon public + service_role secret)

### 1.2 Vercel (Frontend Hosting)
1. Go to https://vercel.com and sign up with your GitHub account
2. Connect your GitHub account when prompted

### 1.3 Stripe (Payments)
1. Go to https://stripe.com and create an account
2. Activate your account (submit business details)
3. Get your API keys from Dashboard → Developers → API Keys
4. Create your products:
   - Product: "Guardian Plan" — Price: $99/month
   - Product: "Sentinel Plan" — Price: $249/month
   - Product: "Fortress Plan" — Price: $599/month
   - Product: "One-Time Emergency Fix" — Price: $99 one-time
5. Save the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

### 1.4 GitHub (Code Repository)
1. Create a new repository: https://github.com/new
2. Name: `uptimeops`
3. Make it private
4. **Do NOT initialize with README** (we'll push our code)

---

## PHASE 2: Push Code to GitHub (3 minutes)

From your local terminal where you have the UptimeOps code:

```bash
cd uptimeops

# Initialize git (if not already)
git init

# Connect to your GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/uptimeops.git

# Stage everything
git add -A

# Commit
git commit -m "Initial UptimeOps commit"

# Push to main
git branch -M main
git push -u origin main
```

---

## PHASE 3: Configure Supabase Database (10 minutes)

### 3.1 Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase/migrations/001_schema_core.sql` from your repo
4. Copy the entire file contents and paste into the SQL Editor
5. Click **Run** — you should see "Success. No rows returned"
6. Repeat for migrations `002` through `005` in order
7. After running `005`, scroll to the bottom of the output — you'll see:
   ```
   UPTIMEOPS SCHEMA VALIDATION COMPLETE
   Tables:      18
   RLS Policies: 47
   Triggers:    12
   Indexes:     40+
   ```

### 3.2 Get Your Environment Variables

In Supabase Dashboard → Settings → API, copy:

| Variable | Value Example | Where to Find |
|----------|--------------|---------------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Settings → API → URL |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Settings → API → service_role secret |

### 3.3 Set Up Edge Functions

In your terminal:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all edge functions
supabase functions deploy
```

**Project ref** is the part after `https://` in your Supabase URL:
If URL is `https://abc123def.supabase.co`, then project ref is `abc123def`.

### 3.4 Set Secrets for Edge Functions

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FROM_EMAIL=alerts@uptimeops.com
supabase secrets set DIGITALOCEAN_TOKEN=dop_v1_...
supabase secrets set DIGITALOCEAN_SSH_KEY_ID=12345678
supabase secrets set FRONTEND_URL=https://uptimeops.vercel.app
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## PHASE 4: Configure Stripe Webhooks (5 minutes)

### 4.1 Set Up Webhook Endpoint

1. In Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy the **Webhook signing secret** (starts with `whsec_`)

### 4.2 Add Products and Prices

For each plan, create in Stripe Dashboard → Products:

| Plan | Type | Price | Recurring |
|------|------|-------|-----------|
| Guardian | Recurring | $99.00 | Monthly |
| Sentinel | Recurring | $249.00 | Monthly |
| Fortress | Recurring | $599.00 | Monthly |
| Emergency Fix | One-time | $99.00 | No |

---

## PHASE 5: Deploy Frontend to Vercel (5 minutes)

### 5.1 Import Project

1. Go to https://vercel.com/new
2. Import your `uptimeops` GitHub repository
3. Vercel will auto-detect Vite settings

### 5.2 Configure Environment Variables

In the Vercel project settings, add these **Environment Variables**:

| Name | Value | Category |
|------|-------|----------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` (anon key) | Frontend |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Frontend |
| `VITE_APP_URL` | `https://uptimeops.vercel.app` | Frontend |

### 5.3 Deploy

Click **Deploy** — Vercel will:
1. Detect `packageManager: "pnpm@9.15.0"` in package.json
2. Use pnpm to install dependencies
3. Run `npm run build`
4. Deploy to global CDN

**Your site will be live at:** `https://uptimeops.vercel.app`

---

## PHASE 6: Connect Domain (Optional, 5 minutes)

### 6.1 Custom Domain

1. Buy a domain (e.g., Namecheap, Cloudflare, GoDaddy)
2. In Vercel Dashboard → your project → Settings → Domains
3. Add your domain: `uptimeops.com`
4. Follow Vercel's DNS instructions to add the required records
5. Update `FRONTEND_URL` in Supabase secrets to your custom domain

### 6.2 Update Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://uptimeops.com`
- Redirect URLs: Add `https://uptimeops.com/auth/callback`

---

## PHASE 7: Test Everything (15 minutes)

### 7.1 Test Landing Page
- Visit your deployed URL
- Verify the landing page loads with all sections
- Test the "Get Started" and "Emergency Fix" CTAs

### 7.2 Test Authentication
- Click "Sign In" → try Magic Link login
- Verify you receive the email and can log in
- Check that you're redirected to the correct portal based on role

### 7.3 Test Emergency Flow
- Go to `/emergency`
- Fill out the form with a test website
- Submit credentials (these are encrypted client-side)
- Complete the Stripe payment (use test card: `4242 4242 4242 4242`)
- Verify the incident appears in the database

### 7.4 Test HQ Dashboard
- Log in as a coordinator/admin
- Visit `/hq`
- Verify all 10 sections load: Dashboard, Incidents, Approvals, Customers, Engineers, Subscriptions, Audit Logs, Communications, AI Cost Tracker, Gap Seal

### 7.5 Test the Gap Seal Audit
- Visit `/hq/gap-seal`
- Verify all 12 loops show with status indicators
- Check that broken/partial loops are highlighted

### 7.6 Test Engineer Portal
- Log in as an engineer
- Visit `/engineer`
- Verify the incident queue loads with priority sorting
- Click into an incident workspace
- Test the 5 tabs: Context, VM Terminal, Credentials, Communication, Submit Fix

---

## PHASE 8: Configure Additional Services (Optional)

### 8.1 Sentry (Error Tracking)
1. Sign up at https://sentry.io
2. Create a project for "uptimeops"
3. Copy your DSN
4. Add to Vercel env vars: `VITE_SENTRY_DSN=https://...@....ingest.sentry.io/...`

### 8.2 Resend (Email)
1. Sign up at https://resend.com
2. Verify your domain
3. Create an API key
4. Add to Supabase secrets (already done in Phase 3)

### 8.4 DigitalOcean (VMs for Repair)
1. Sign up at https://digitalocean.com
2. Create an API token
3. Upload an SSH key, note the key ID
4. Add to Supabase secrets (already done in Phase 3)

---

## Quick Reference: Environment Variables Summary

### Vercel (Frontend)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_APP_URL=https://uptimeops.com
VITE_SENTRY_DSN=... (optional)
```

### Supabase Edge Functions (Backend)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
FROM_EMAIL=alerts@uptimeops.com
DIGITALOCEAN_TOKEN=dop_v1_...
DIGITALOCEAN_SSH_KEY_ID=...
FRONTEND_URL=https://uptimeops.com
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Troubleshooting

### Build fails on Vercel
- Check that `.nvmrc` contains just `24`
- Check that `package.json` has `"packageManager": "pnpm@9.15.0"`
- Check that there's NO `package-lock.json` (pnpm uses `pnpm-lock.yaml`)

### Supabase migrations fail
- Run them in order: 001 → 002 → 003 → 004 → 005
- If one fails, the previous ones likely succeeded — just re-run the failed one
- Check for typos in the SQL (copy/paste can sometimes corrupt formatting)

### Stripe webhooks not working
- Verify the webhook URL is correct (no typos in the Supabase project ref)
- Check that the `STRIPE_WEBHOOK_SECRET` is set in Supabase secrets
- Look at the webhook delivery logs in Stripe Dashboard

### Page shows blank screen
- Check browser DevTools Console for errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel
- The app has graceful fallbacks — it should work even without Supabase connected

---

## What's Running After Setup

| Component | Technology | URL |
|-----------|-----------|-----|
| Frontend | Vite + React 19 | `https://uptimeops.com` |
| Database | PostgreSQL 16 (Supabase) | Managed |
| Auth | Supabase Auth | Built-in |
| API | 10 Edge Functions | `https://xxxxx.supabase.co/functions/v1/...` |
| Payments | Stripe | `https://stripe.com` |
| Email | Resend | `https://resend.com` |
| VMs | DigitalOcean | `https://digitalocean.com` |
| CDN | Vercel Edge | Global |
