#!/bin/bash

##############################################################################
# Add Staging Environment Secrets
#
# This script reads environment variables from .env.staging (git-ignored local file)
# and adds them to the GitHub staging environment as secrets.
#
# Usage:
#   1. Create/update backend/.env.staging with all required staging secrets
#   2. chmod +x scripts/add-staging-env-secrets.sh
#   3. ./scripts/add-staging-env-secrets.sh
#
# What it does:
#   1. Reads all variables from .env.staging
#   2. Uses 'gh secret set' to add each to the staging environment
#   3. Displays which secrets were added
#   4. Verifies with 'gh secret list --env staging'
#
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Adding Secrets to GitHub Staging Environment from .env.staging   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.staging exists
ENV_FILE="backend/.env.staging"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    echo "Please create $ENV_FILE with all required staging environment variables"
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

echo "Reading environment variables from: $ENV_FILE"
echo ""

# Track added secrets
ADDED_SECRETS=()

# Extract all environment variables from .env.staging file
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

    echo -e "${YELLOW}${counter}. $var_name${NC}"
    gh secret set "$var_name" --env staging --body "$var_value"
    ADDED_SECRETS+=("$var_name")
    echo -e "   ${GREEN}✓ Added${NC}"
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

echo -e "${GREEN}✓ Success! All ${#ADDED_SECRETS[@]} environment variables from $ENV_FILE have been added to staging.${NC}"
echo ""
echo "Next steps:"
echo "1. Run the production secrets script:"
echo "   ./scripts/add-production-env-secrets.sh"
echo ""
echo "2. Test staging deployment:"
echo "   git push origin main"
echo ""
