# UptimeOps v2.1 — Production Deployment Checklist

## Phase 1: Supabase Configuration (Do This First)

### 1.1 Enable Email/Password Auth
1. Go to https://supabase.com/dashboard/project/npcopjsqgjvirfjnjemt
2. Navigate to **Authentication** → **Providers**
3. Find **Email** provider
4. Enable it:
   - Confirm email: `OFF` (disable for now — you can enable later)
   - Secure email change: `ON`
   - Max 1 account per email: `ON`
5. Click **Save**

### 1.2 Enable Google OAuth
1. In the same **Providers** page, find **Google**
2. Click **Enable**
3. You need a Google Client ID and Secret:
   - Go to https://console.cloud.google.com/
   - Create a new project (or use existing)
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `UptimeOps`
   - Authorized redirect URIs: Add `https://npcopjsqgjvirfjnjemt.supabase.co/auth/v1/callback`
   - Click **Create**
   - Copy the **Client ID** and **Client Secret**
4. Paste them into Supabase Google provider settings
5. Click **Save**

### 1.3 Enable GitHub OAuth
1. In **Providers**, find **GitHub**
2. Click **Enable**
3. You need a GitHub Client ID and Secret:
   - Go to https://github.com/settings/developers
   - Click **New OAuth App**
   - Application name: `UptimeOps`
   - Homepage URL: `https://uptimeops.vercel.app` (or your Vercel URL)
   - Authorization callback URL: `https://npcopjsqgjvirfjnjemt.supabase.co/auth/v1/callback`
   - Click **Register application**
   - Copy the **Client ID**
   - Click **Generate a new client secret** and copy it
4. Paste them into Supabase GitHub provider settings
5. Click **Save**

### 1.4 Configure Site URL (Critical for Auth Redirects)
1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel deployment URL:
   - Example: `https://uptimeops.vercel.app`
3. Add your Vercel URL to **Redirect URLs**:
   - `https://uptimeops.vercel.app/**`
   - `https://*.vercel.app/**`
4. Click **Save**

### 1.5 Create the Admin Account (Before First Login)
Option A — Sign up via the app (easiest):
1. Deploy the app first (Phase 2)
2. Go to your Vercel URL → **Sign In**
3. Enter `cumouat@gmail.com` + `Canaris92@`
4. You'll see "Admin account not found. Create it now?"
5. Click **"Create Admin Account & Sign In"**
6. Done — you're in as admin

Option B — Create directly in Supabase:
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Email: `cumouat@gmail.com`
4. Password: `Canaris92@`
5. Click **Create user**
6. The code automatically grants admin role based on email

---

## Phase 2: Deploy to Vercel

### 2.1 Connect GitHub Repo
1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Import your GitHub repo: `Jemorah/uptimeops`
4. Click **Import**

### 2.2 Configure Build Settings
1. **Framework Preset**: Select `Vite`
2. **Build Command**: `npm run build` (default, should be correct)
3. **Output Directory**: `dist` (default, should be correct)
4. **Install Command**: `npm install` (default)

### 2.3 Environment Variables
No environment variables needed — all Supabase credentials are baked into the code as public anon key.

If you want to add them as env vars anyway (better practice):
| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://npcopjsqgjvirfjnjemt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY29wanNxZ2p2aXJmam5qZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDkzMjgsImV4cCI6MjA5Nzk4NTMyOH0.5tm3GfGwUVT__BdxVgzXvf7FByxUShKKfdujTkVfXh8` |

Then update `src/lib/supabase/client.ts` to read from env vars.

### 2.4 Deploy
1. Click **Deploy**
2. Wait for build to complete (should show "Build Successful")
3. Vercel assigns a URL: `https://uptimeops-xxx.vercel.app`
4. **Copy this URL** — you'll need it for Supabase config

### 2.5 Update Supabase with Vercel URL
After first deploy, go back to Supabase:
1. **Authentication** → **URL Configuration**
2. Update **Site URL** to your actual Vercel URL
3. Add your Vercel URL to **Redirect URLs**
4. Update Google/GitHub OAuth apps with the real homepage URL

---

## Phase 3: Verify Everything Works

### 3.1 Test Direct URL Access
Open each URL directly in a new tab (not from within the app):

| URL | Expected Result |
|-----|----------------|
| `https://your-app.vercel.app/` | Landing page loads |
| `https://your-app.vercel.app/#/login` | Login page loads |
| `https://your-app.vercel.app/#/hq` | Redirects to login, then to HQ dashboard |
| `https://your-app.vercel.app/#/customer` | Redirects to login, then to customer dashboard |
| `https://your-app.vercel.app/#/engineer` | Redirects to login, then to engineer portal |

**If any of these show a 404**: The `vercel.json` rewrite isn't working. Check Vercel dashboard → Project → Settings → General → Output Directory is set to `dist`.

### 3.2 Test Email + Password Login (Admin)
1. Go to `/#/login`
2. Enter `cumouat@gmail.com` / `Canaris92@`
3. Click **Sign In**
4. **Expected**: "Signed in — admin access" toast → redirected to `/#/hq`
5. You should see the **HQ Dashboard** with full admin controls

**If you see "Invalid email or password"**: The account doesn't exist yet. Click **"Create Admin Account & Sign In"** button that appears.

### 3.3 Test Google OAuth
1. Go to `/#/login`
2. Click **Continue with Google**
3. Sign in with your `cumouat@gmail.com` Google account
4. **Expected**: Redirected to Google auth → back to app → `/#/hq`

**If it says "Google login is not enabled"**: You haven't configured the Google OAuth provider in Supabase (Phase 1.2).

### 3.4 Test GitHub OAuth
1. Go to `/#/login`
2. Click **Continue with GitHub**
3. Authorize the UptimeOps app
4. **Expected**: Redirected to GitHub auth → back to app → `/#/hq`

**If your GitHub email is different from `cumouat@gmail.com`**: You'll be logged in as a regular user (role: `customer`), not admin. Admin is only granted when the email matches exactly.

### 3.5 Test Sign Out
1. While logged in, click **Sign Out** in the nav
2. **Expected**: Redirected to `/#/login?signed_out=true`
3. Try accessing `/#/hq` again → should redirect to login

### 3.6 Test Navigation from Landing Page
1. Visit `/` (landing page)
2. Click **Sign In** in the navbar
3. Log in as admin
4. **Expected**: Redirected to HQ dashboard
5. Go back to `/` (landing page)
6. **Expected**: Navbar now shows **"HQ Control"** button instead of "Sign In"
7. Click **"HQ Control"** → goes to `/#/hq`

---

## Phase 4: Subdomain Setup (Optional — For Custom Domain)

Skip this if you're fine with the Vercel URL. Do this when you want `uptimeops.org`.

### 4.1 Buy Domain
Purchase `uptimeops.org` at Namecheap, Cloudflare, or your preferred registrar.

### 4.2 Add Domain to Vercel
1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Enter `uptimeops.org` → **Add**
3. Vercel shows DNS records to add

### 4.3 Configure DNS
In your domain registrar's DNS settings, add:

| Type | Host | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `app` | `cname.vercel-dns.com` |
| CNAME | `dashboard` | `cname.vercel-dns.com` |
| CNAME | `engineers` | `cname.vercel-dns.com` |

### 4.4 Wait for DNS Propagation
Can take 5 minutes to 48 hours. Check with: `dig uptimeops.org +short`

### 4.5 Update Supabase URLs
1. **URL Configuration** → Update Site URL to `https://uptimeops.org`
2. Add all subdomains to Redirect URLs:
   - `https://uptimeops.org/**`
   - `https://www.uptimeops.org/**`
   - `https://app.uptimeops.org/**`
   - `https://dashboard.uptimeops.org/**`
   - `https://engineers.uptimeops.org/**`
3. Update Google/GitHub OAuth callback URLs to use the custom domain

### 4.6 The Code Auto-Switches
The `isSubdomainMode()` function detects `*.uptimeops.org` automatically. Zero code changes needed.

---

## Troubleshooting

### "404 Not Found" when refreshing a page
**Cause**: Vercel doesn't know about SPA routes.  
**Fix**: `vercel.json` must have the rewrite rule. Check it's committed:
```bash
git show HEAD:vercel.json
```
Should show `"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`.

### "Invalid login credentials" for admin
**Cause**: Account doesn't exist in Supabase Auth.  
**Fix**: Click **"Create Admin Account & Sign In"** button. Or create the user manually in Supabase dashboard.

### "Google login is not enabled"
**Cause**: Google provider not configured in Supabase.  
**Fix**: Complete Phase 1.2.

### "No session" after login
**Cause**: Cookie storage issue. The auth session isn't persisting.  
**Fix**: Check browser dev tools → Application → Cookies. Look for `sb-session` cookie. If missing, the cookie domain might be wrong. Check `getRootDomain()` in `client.ts`.

### Redirected to homepage instead of HQ
**Cause**: `redirect_to` parameter not being read correctly.  
**Fix**: Check the URL after login attempt. It should be `/#/login?redirect_to=%2Fhq`. If `redirect_to` is a full URL instead of a path, the `getLoginUrl()` function isn't stripping the domain correctly.

### Admin sees "Access Denied"
**Cause**: The email check in `isAdminEmail()` might be case-sensitive or have a typo.  
**Fix**: Check browser console for `[Auth] Admin override` log message. Verify `user?.email` matches exactly `cumouat@gmail.com`.

### OAuth callback loops back to login
**Cause**: PKCE session detection conflict with HashRouter.  
**Fix**: The `AuthCallbackPage` handles this. If stuck in a loop, check that `onAuthStateChange` is firing after OAuth redirect. Look for `[Auth Callback]` messages in the browser console.

---

## File Reference (What Controls What)

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Supabase client, cookie storage, mode detection, role mapping |
| `src/hooks/useAuth.tsx` | Auth context, signIn/signUp/OAuth, admin override, post-login redirect |
| `src/App.tsx` | Portal router — decides which router to render based on hostname/hash |
| `src/pages/public/LoginPage.tsx` | Login form, admin auto-signup, redirect handling |
| `src/pages/public/AuthCallbackPage.tsx` | OAuth callback handler, routes to correct portal |
| `src/components/ProtectedRoute.tsx` | Guards routes by role, redirects unauthenticated to login |
| `vercel.json` | SPA rewrite rules — all URLs → index.html |
| `src/routers/MarketingRouter.tsx` | Public pages: landing, login, pricing, status |
| `src/routers/CustomerRouter.tsx` | Customer portal: dashboard, billing, vault, etc. |
| `src/routers/HQRouter.tsx` | HQ portal: dashboard, incidents, approvals, scanners |
| `src/routers/EngineerRouter.tsx` | Engineer portal: dashboard, workspace, on-call |
