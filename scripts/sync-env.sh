#!/bin/bash

##############################################################################
# Sync Environment Variables to GitHub Environment
#
# This script reads environment variables from a local .env file and syncs
# them to the corresponding GitHub Environment as secrets.
#
# Usage:
#   ./scripts/sync-env.sh staging      # Sync .env.staging → GitHub staging
#   ./scripts/sync-env.sh production   # Sync .env.production → GitHub production
#
# Prerequisites:
#   1. GitHub CLI (gh) installed and authenticated
#   2. Local env file exists: backend/.env.staging or backend/.env.production
#
# The GitHub Environment must already exist. Create via:
#   GitHub → Settings → Environments → New environment
#
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get environment from argument
ENV="${1}"

if [ -z "$ENV" ]; then
    echo -e "${RED}Error: Environment argument required${NC}"
    echo ""
    echo "Usage:"
    echo "  ./scripts/sync-env.sh staging"
    echo "  ./scripts/sync-env.sh production"
    exit 1
fi

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment '$ENV'${NC}"
    echo "Valid environments: staging, production"
    exit 1
fi

# Set env file path
ENV_FILE="backend/.env.${ENV}"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Sync Environment Variables to GitHub                              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENV}${NC}"
echo -e "Source file: ${YELLOW}${ENV_FILE}${NC}"
echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    echo ""
    echo "Create it from the example:"
    echo "  cp backend/.env.example backend/.env.${ENV}"
    echo "  # Then edit with your ${ENV} values"
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

# Production safety check
if [ "$ENV" == "production" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to sync PRODUCTION secrets!${NC}"
    echo ""
    read -p "Type 'yes' to confirm: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# Track stats
ADDED_COUNT=0
SKIPPED_COUNT=0

echo -e "${CYAN}Syncing secrets...${NC}"
echo ""

# Read and sync each variable
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip empty lines
    [ -z "$key" ] && continue

    # Skip comments
    [[ "$key" =~ ^[[:space:]]*# ]] && continue

    # Trim whitespace from key
    key=$(echo "$key" | xargs)

    # Skip if key is empty after trimming
    [ -z "$key" ] && continue

    # Handle values with = signs (take everything after first =)
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Skip if value is empty
    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⊘${NC} $key (empty value, skipped)"
        ((SKIPPED_COUNT++))
        continue
    fi

    # Validate production Stripe keys
    if [ "$ENV" == "production" ] && [ "$key" == "STRIPE_SECRET_KEY" ]; then
        if [[ ! "$value" =~ ^sk_live_ ]]; then
            echo -e "  ${RED}⚠${NC} $key - WARNING: Not a live key (sk_live_*)"
            read -p "    Continue anyway? (yes/no): " STRIPE_CONFIRM
            if [ "$STRIPE_CONFIRM" != "yes" ]; then
                echo -e "  ${YELLOW}⊘${NC} $key (skipped)"
                ((SKIPPED_COUNT++))
                continue
            fi
        fi
    fi

    # Sync to GitHub Environment
    if gh secret set "$key" --env "$ENV" --body "$value" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $key"
        ((ADDED_COUNT++))
    else
        echo -e "  ${RED}✗${NC} $key (failed)"
    fi

done < "$ENV_FILE"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Synced: $ADDED_COUNT secrets${NC}"
if [ $SKIPPED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Skipped: $SKIPPED_COUNT${NC}"
fi
echo ""

# Verify
echo -e "${CYAN}Verifying...${NC}"
SECRET_COUNT=$(gh secret list --env "$ENV" 2>/dev/null | wc -l | xargs)
echo -e "Total secrets in ${ENV} environment: ${GREEN}${SECRET_COUNT}${NC}"
echo ""

# Check for required deployment secrets
echo -e "${CYAN}Checking deployment secrets...${NC}"
MISSING_DEPLOY_SECRETS=()

for secret in GCP_PROJECT_ID GCP_SA_KEY; do
    if ! gh secret list --env "$ENV" 2>/dev/null | grep -q "^${secret}"; then
        MISSING_DEPLOY_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_DEPLOY_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Missing deployment secrets (required for GitHub Actions):${NC}"
    for secret in "${MISSING_DEPLOY_SECRETS[@]}"; do
        echo -e "  - $secret"
    done
    echo ""
    echo "These are NOT in .env files - they're only for CI/CD."
    echo "Add them manually:"
    echo ""
    for secret in "${MISSING_DEPLOY_SECRETS[@]}"; do
        echo "  gh secret set $secret --env $ENV"
    done
    echo ""
fi

echo -e "${GREEN}✓ Done!${NC}"
echo ""
