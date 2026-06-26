#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# UPTIMEOPS EDGE FUNCTIONS DEPLOY SCRIPT
# Run this to deploy all 17 Edge Functions to Supabase
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_REF="npcopjsqgjvirfjnjemt"
FUNCTIONS_DIR="./supabase/functions"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "═══════════════════════════════════════════════"
echo "  UPTIMEOPS EDGE FUNCTIONS DEPLOY"
echo "  Project: $PROJECT_REF"
echo "═══════════════════════════════════════════════"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi

# Login check
echo -e "${YELLOW}Checking Supabase login...${NC}"
supabase projects list > /dev/null 2>&1 || {
    echo -e "${YELLOW}Please login first:${NC}"
    supabase login
}

# Link project
echo -e "${YELLOW}Linking project $PROJECT_REF...${NC}"
supabase link --project-ref "$PROJECT_REF" || true

# Deploy all functions
declare -a FUNCTIONS=(
    "ai-orchestrator"
    "ai-triage"
    "ai-isolate"
    "ai-repair"
    "ai-validate"
    "ai-deploy"
    "stripe-webhook"
    "subscription-manager"
    "engineer-availability"
    "communication-sender"
    "vm-manager"
    "credential-relay"
    "credential-decrypt"
    "rollback-executor"
    "temporary-link-generator"
    "webhook-alert"
    "audit-logger"
)

TOTAL=${#FUNCTIONS[@]}
SUCCESS=0
FAILED=0

for fn in "${FUNCTIONS[@]}"; do
    echo -e "\n${YELLOW}[$((SUCCESS+FAILED+1))/$TOTAL] Deploying: $fn...${NC}"
    if supabase functions deploy "$fn"; then
        echo -e "${GREEN}  ✓ $fn deployed${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}  ✗ $fn failed${NC}"
        ((FAILED++))
    fi
    sleep 1
done

echo ""
echo "═══════════════════════════════════════════════"
echo -e "  DEPLOY COMPLETE: ${GREEN}$SUCCESS success${NC}, ${RED}$FAILED failed${NC}"
echo "═══════════════════════════════════════════════"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some functions failed to deploy. Check errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}All Edge Functions deployed successfully!${NC}"
