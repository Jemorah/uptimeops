# UptimeOps Production Environment Variables — Complete Checklist

## How to Set Each Variable

| Section | Where to Set | How |
|---------|-------------|-----|
| Supabase (URL/Keys) | Vercel Dashboard | Auto-filled by Vercel-Supabase integration |
| Frontend (VITE_*) | Vercel Dashboard | Settings → Environment Variables |
| Backend Secrets | Supabase Dashboard | Project Settings → Edge Function Secrets |
| Stripe Webhook | Stripe Dashboard | Developers → Webhooks → Add endpoint |

---

## SECTION 1: SUPABASE (Already Done ✅)

| Variable | Status | Value | Source |
|----------|--------|-------|--------|
| `SUPABASE_URL` | ✅ Set by integration | `https://npcopjsqgjvirfjnjemt.supabase.co` | Vercel integration |
| `SUPABASE_ANON_KEY` | ✅ Set by integration | `eyJhbGci...` | Vercel integration |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set by integration | `sb_secret_...` | Vercel integration |

**Action required:** None. Already working.

---

## SECTION 2: FRONTEND (Set in Vercel Dashboard)

| # | Variable | Required? | Example Value | Where It's Used |
|---|----------|-----------|---------------|-----------------|
| 2.1 | `VITE_SUPABASE_URL` | **Required** | `https://npcopjsqgjvirfjnjemt.supabase.co` | Supabase client connection |
| 2.2 | `VITE_SUPABASE_ANON_KEY` | **Required** | `eyJhbGciOiJIUzI1NiIs...` | Supabase auth + database |
| 2.3 | `VITE_APP_URL` | Optional | `https://uptimeops.vercel.app` | Auth redirects, email links |
| 2.4 | `VITE_STRIPE_PUBLISHABLE_KEY` | **Required for payments** | `pk_live_51Oxxxx...` | Stripe checkout on Pricing + Emergency pages |
| 2.5 | `VITE_SENTRY_DSN` | Optional | `https://...@...ingest.sentry.io/...` | Error tracking |

---

## SECTION 3: STRIPE SECRETS (Set in Supabase Edge Function Secrets)

| # | Variable | Required? | How to Get It |
|---|----------|-----------|---------------|
| 3.1 | `STRIPE_SECRET_KEY` | **Required for payments** | Stripe Dashboard → Developers → API Keys → Secret key |
| 3.2 | `STRIPE_WEBHOOK_SECRET` | **Required for payments** | Stripe Dashboard → Developers → Webhooks → Create endpoint → Copy signing secret |
| 3.3 | `STRIPE_GUARDIAN_PRICE_ID` | **Required for subscriptions** | Stripe Dashboard → Products → Create Product "Guardian ($99/mo)" → Copy Price ID |
| 3.4 | `STRIPE_SENTINEL_PRICE_ID` | **Required for subscriptions** | Stripe Dashboard → Products → Create Product "Sentinel ($249/mo)" → Copy Price ID |
| 3.5 | `STRIPE_FORTRESS_PRICE_ID` | **Required for subscriptions** | Stripe Dashboard → Products → Create Product "Fortress ($599/mo)" → Copy Price ID |

### Stripe Webhook Endpoint URL:
```
https://npcopjsqgjvirfjnjemt.supabase.co/functions/v1/stripe-webhook
```

### Required Stripe Webhook Events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

---

## SECTION 4: EMAIL & SMS (Set in Supabase Edge Function Secrets)

| # | Variable | Required? | How to Get It |
|---|----------|-----------|---------------|
| 4.1 | `RESEND_API_KEY` | Optional — for email alerts | https://resend.com → API Keys → Create |
| 4.2 | `TWILIO_SID` | Optional — for SMS alerts | https://console.twilio.com → Account Info |
| 4.3 | `TWILIO_AUTH_TOKEN` | Optional — for SMS alerts | https://console.twilio.com → Account Info |
| 4.4 | `TWILIO_PHONE` | Optional — for SMS alerts | https://console.twilio.com → Phone Numbers → Copy number |

---

## SECTION 5: SECURITY (Set in Supabase Edge Function Secrets)

| # | Variable | Required? | How to Generate |
|---|----------|-----------|-----------------|
| 5.1 | `TOKEN_SALT` | **Recommended** | `openssl rand -hex 32` (or any 64-char random string) |

Used for hashing temporary access tokens. If not set, falls back to a default (less secure).

---

## SECTION 6: AI (Set in Supabase Edge Function Secrets)

| # | Variable | Required? | How to Get It |
|---|----------|-----------|---------------|
| 6.1 | `ANTIGRAVITY_API_KEY` | Optional — for AI agents | ANTIGRAVITY SDK dashboard |

---

## How to Set Supabase Edge Function Secrets

### Option A: Dashboard
1. Supabase Dashboard → Your Project → **Settings**
2. Click **Edge Function Secrets**
3. Click **Add secret**
4. Add each key-value pair from Sections 3-6 above

### Option B: Supabase CLI
```bash
supabase login
supabase link --project-ref npcopjsqgjvirfjnjemt

supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_GUARDIAN_PRICE_ID=price_...
supabase secrets set STRIPE_SENTINEL_PRICE_ID=price_...
supabase secrets set STRIPE_FORTRESS_PRICE_ID=price_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set TWILIO_SID=AC_...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE=+1234567890
supabase secrets set TOKEN_SALT=$(openssl rand -hex 32)
supabase secrets set ANTIGRAVITY_API_KEY=ag_...
```

---

## Total Count

| Category | Count | Required |
|----------|-------|----------|
| Supabase (auto) | 3 | 3 ✅ Done |
| Frontend (VITE_*) | 4 | 2 |
| Stripe secrets | 5 | 5 for payments |
| Email/SMS | 4 | 0 (optional) |
| Security | 1 | 0 (recommended) |
| AI | 1 | 0 (optional) |
| **Total** | **18** | **10 required** |
