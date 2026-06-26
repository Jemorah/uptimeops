# GitHub Actions Workflows

## 1. deploy-edge-functions.yml
Auto-deploys all 17 Supabase Edge Functions when you push changes to `supabase/functions/`.

### Required Secret
Add this to your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` or `sb_...` | https://supabase.com/dashboard/account/tokens → Generate new token |

### How It Works
1. You push code to `main` branch
2. GitHub Actions installs Supabase CLI
3. Links to your project (`npcopjsqgjvirfjnjemt`)
4. Deploys all functions in `supabase/functions/`

### Manual Trigger
You can also run it manually: **Actions tab → Deploy Supabase Edge Functions → Run workflow**
