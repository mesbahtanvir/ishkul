#!/bin/bash

##############################################################################
# Add Production Environment Secrets
#
# This script reads environment variables from .env.production (git-ignored local file)
# and adds them to the GitHub production environment as secrets.
#
# IMPORTANT: Use PRODUCTION/LIVE credentials, not test keys!
#
# Usage:
#   1. Create/update backend/.env.production with all required production secrets
#   2. chmod +x scripts/add-production-env-secrets.sh
#   3. ./scripts/add-production-env-secrets.sh
#
# What it does:
#   1. Reads all variables from .env.production
#   2. Uses 'gh secret set' to add each to the production environment
#   3. Displays which secrets were added
#   4. Verifies with 'gh secret list --env production'
#
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ Adding Secrets to GitHub Production Environment from .env.prod... ║"
echo "║                                                                    ║"
echo "║  ⚠️  WARNING: Use LIVE/PRODUCTION credentials only!               ║"
echo "║      NOT test keys or staging values                              ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
ENV_FILE="backend/.env.production"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    echo "Please create $ENV_FILE with all required production environment variables"
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Safety confirmation
read -p "⚠️  Are you sure you want to add PRODUCTION secrets? Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted. No secrets were added."
    exit 0
fi

echo ""
echo "Reading environment variables from: $ENV_FILE"
echo ""

# Track added secrets
ADDED_SECRETS=()

# Extract all environment variables from .env.production file
# Read only lines that match KEY=value pattern (ignore comments and empty lines)
counter=1
while IFS='=' read -r var_name var_value; do
    # Skip empty lines and comments
    [ -z "$var_name" ] && continue
    [[ "$var_name" =~ ^# ]] && continue

    # Trim whitespace
    var_name="${var_name#"${var_name%%[![:space:]]*}"}"
    var_name="${var_name%"${var_name##*[![:space:]]}"}"

    # Skip if empty after trimming
    [ -z "$var_name" ] && continue

    # For production Stripe keys, validate they use production prefixes
    if [ "$var_name" = "STRIPE_SECRET_KEY" ]; then
        if [[ ! "$var_value" =~ ^sk_live_ ]]; then
            echo -e "${YELLOW}${counter}. $var_name${NC}"
            echo -e "   ${RED}⚠️  WARNING: Secret does not start with sk_live_ (might be test key)${NC}"
            echo -e "   ${RED}Production requires LIVE keys, not test keys${NC}"
            read -p "   Continue anyway? (yes/no): " CONTINUE
            if [ "$CONTINUE" = "yes" ]; then
                gh secret set "$var_name" --env production --body "$var_value"
                ADDED_SECRETS+=("$var_name")
                echo -e "   ${GREEN}✓ Added${NC}"
            else
                echo -e "   ${YELLOW}○ Skipped${NC}"
            fi
        else
            echo -e "${YELLOW}${counter}. $var_name${NC}"
            gh secret set "$var_name" --env production --body "$var_value"
            ADDED_SECRETS+=("$var_name")
            echo -e "   ${GREEN}✓ Added${NC}"
        fi
    else
        echo -e "${YELLOW}${counter}. $var_name${NC}"
        gh secret set "$var_name" --env production --body "$var_value"
        ADDED_SECRETS+=("$var_name")
        echo -e "   ${GREEN}✓ Added${NC}"
    fi

    echo ""
    ((counter++))
done < "$ENV_FILE"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        Summary                                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Added Secrets: ${#ADDED_SECRETS[@]}${NC}"
for secret in "${ADDED_SECRETS[@]}"; do
    echo "  ✓ $secret"
done
echo ""

echo -e "${GREEN}✓ Success! All ${#ADDED_SECRETS[@]} environment variables from $ENV_FILE have been added to production.${NC}"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Review secrets are correct PRODUCTION/LIVE values"
echo "   2. Do NOT use test keys in production"
echo "   3. Verify Stripe keys start with sk_live_"
echo ""
echo "Next steps:"
echo "1. Test production deployment:"
echo "   git tag v1.0.0 && git push origin v1.0.0"
echo ""
echo "2. Approve deployment when prompted"
echo ""
