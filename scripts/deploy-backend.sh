#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# UPTIMEOPS BACKEND DEPLOYMENT SCRIPT
# Run this from the project root after setting your secrets below
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_REF="npcopjsqgjvirfjnjemt"
echo "═══════════════════════════════════════════════════════════════"
echo "  UptimeOps Backend Deployment"
echo "  Project: $PROJECT_REF"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Step 0: Check prerequisites ──
echo "[0/7] Checking prerequisites..."
command -v supabase >/dev/null 2>&1 || { echo "ERROR: supabase CLI not found. Install: brew install supabase/tap/supabase"; exit 1; }

# ── Step 1: Link project ──
echo "[1/7] Linking project..."
supabase link --project-ref "$PROJECT_REF" || true

# ── Step 2: Apply database migrations ──
echo "[2/7] Applying database schema..."
echo "  NOTE: This requires running SQL files manually in Supabase SQL Editor."
echo "  Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/editor"
echo "  Paste these files in order:"
echo "    1. supabase/migrations/000_combined_clean.sql"
echo "    2. supabase/auth-triggers.sql"
echo "    3. supabase/realtime-setup.sql"
echo "    4. supabase/storage-policies.sql"
echo ""
read -p "  Press ENTER after running all 4 SQL files..."

# ── Step 3: Set secrets ──
echo ""
echo "[3/7] Setting Edge Function secrets..."
echo "  You need to provide these API keys:"
echo ""

read -p "  ANTHROPIC_API_KEY (or press Enter to skip): " ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
  supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
  echo "  ✓ ANTHROPIC_API_KEY set"
fi

read -p "  OPENAI_API_KEY (or press Enter to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
  supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
  echo "  ✓ OPENAI_API_KEY set"
fi

read -p "  STRIPE_SECRET_KEY (or press Enter to skip): " STRIPE_KEY
if [ -n "$STRIPE_KEY" ]; then
  supabase secrets set STRIPE_SECRET_KEY="$STRIPE_KEY"
  echo "  ✓ STRIPE_SECRET_KEY set"
fi

read -p "  STRIPE_WEBHOOK_SECRET (or press Enter to skip): " WEBHOOK_SECRET
if [ -n "$WEBHOOK_SECRET" ]; then
  supabase secrets set STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET"
  echo "  ✓ STRIPE_WEBHOOK_SECRET set"
fi

# ── Step 4: Deploy Edge Functions ──
echo ""
echo "[4/7] Deploying all 18 Edge Functions..."
supabase functions deploy

# ── Step 5: Verify deployment ──
echo ""
echo "[5/7] Verifying deployment..."
sleep 3

FUNCTIONS=$(supabase functions list 2>/dev/null || echo "")
if [ -n "$FUNCTIONS" ]; then
  echo "  ✓ Functions deployed:"
  echo "$FUNCTIONS" | grep -oE '[a-z-]+' | sed 's/^/    - /'
else
  echo "  ! Could not verify functions list (check Supabase Dashboard)"
fi

# ── Step 6: Summary ──
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Enable Auth providers in Supabase Dashboard:"
echo "     https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo "     - Email: Toggle ON, "Confirm email" = OFF"
echo "     - GitHub: Toggle ON, enter Client ID + Secret"
echo "     - Google: Toggle ON, enter Client ID + Secret"
echo ""
echo "  2. Configure Stripe webhook:"
echo "     https://dashboard.stripe.com/webhooks"
echo "     Endpoint: https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo "     Events: payment_intent.succeeded, payment_intent.payment_failed,"
echo "             invoice.paid, invoice.payment_failed"
echo ""
echo "  3. Test the app:"
echo "     - Sign up with email"
echo "     - Verify user_roles table has your user"
echo "     - Test Google/GitHub login"
echo "     - Check dashboards load data"
echo ""
echo "═══════════════════════════════════════════════════════════════"
