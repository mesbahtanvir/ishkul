#!/bin/bash

##############################################################################
# Clean Up Old Repository-Level Secrets
#
# This script deletes all old STAGING_* prefixed secrets from the repository
# level. It's safe to run after both staging and production environments are
# fully configured and tested.
#
# IMPORTANT: Only run this AFTER:
#   1. staging environment is created with 12 secrets
#   2. production environment is created with 12 secrets
#   3. Both deployments have been tested successfully
#
# Usage:
#   chmod +x scripts/cleanup-old-secrets.sh
#   ./scripts/cleanup-old-secrets.sh
#
# What it does:
#   1. Lists all STAGING_* secrets
#   2. Asks for confirmation before deleting
#   3. Deletes each STAGING_* secret
#   4. Verifies cleanup
#
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║      Clean Up Old Repository-Level STAGING_* Secrets              ║"
echo "║                                                                    ║"
echo "║  This will DELETE all STAGING_* secrets from the repository.      ║"
echo "║  Only run this AFTER both staging and production are working.     ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

echo -e "${YELLOW}Checking for STAGING_* secrets...${NC}"
echo ""

# List all STAGING_* secrets
STAGING_SECRETS=$(gh secret list | grep "^STAGING_" || true)

if [ -z "$STAGING_SECRETS" ]; then
    echo -e "${GREEN}✓ No STAGING_* secrets found. Nothing to clean up.${NC}"
    exit 0
fi

echo "Found the following STAGING_* secrets:"
echo "$STAGING_SECRETS" | awk '{print "  - " $1}'
echo ""

# Count secrets to delete
TOTAL_COUNT=$(echo "$STAGING_SECRETS" | wc -l)
echo -e "${YELLOW}Total secrets to delete: $TOTAL_COUNT${NC}"
echo ""

# Safety confirmations
echo -e "${RED}⚠️  WARNING: This action cannot be undone!${NC}"
echo ""
read -p "Type 'delete STAGING secrets' to confirm deletion: " CONFIRM
if [ "$CONFIRM" != "delete STAGING secrets" ]; then
    echo "Cleanup cancelled. No secrets were deleted."
    exit 0
fi

echo ""
echo -e "${YELLOW}Final safety check...${NC}"
read -p "Verify staging environment has 12 secrets? (yes/no): " STAGING_OK
if [ "$STAGING_OK" != "yes" ]; then
    echo "Cleanup cancelled."
    echo ""
    echo "Before cleanup, verify:"
    echo "1. Run: ./scripts/add-staging-env-secrets.sh"
    echo "2. Verify: gh secret list --env staging | wc -l  (should be 12)"
    exit 0
fi

read -p "Verify production environment has 12 secrets? (yes/no): " PROD_OK
if [ "$PROD_OK" != "yes" ]; then
    echo "Cleanup cancelled."
    echo ""
    echo "Before cleanup, verify:"
    echo "1. Run: ./scripts/add-production-env-secrets.sh"
    echo "2. Verify: gh secret list --env production | wc -l  (should be 12)"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting STAGING_* secrets...${NC}"
echo ""

# Delete each STAGING_* secret
DELETED_COUNT=0
FAILED_SECRETS=()

while IFS= read -r line; do
    # Extract secret name (first column)
    SECRET_NAME=$(echo "$line" | awk '{print $1}')

    if [ -z "$SECRET_NAME" ]; then
        continue
    fi

    echo -n "Deleting $SECRET_NAME ... "

    if gh secret delete "$SECRET_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓ Deleted${NC}"
        ((DELETED_COUNT++))
    else
        echo -e "${RED}✗ Failed${NC}"
        FAILED_SECRETS+=("$SECRET_NAME")
    fi
done <<< "$STAGING_SECRETS"

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        Summary                                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Deleted: $DELETED_COUNT secrets${NC}"

if [ ${#FAILED_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}Failed to delete: ${#FAILED_SECRETS[@]} secrets${NC}"
    for secret in "${FAILED_SECRETS[@]}"; do
        echo "  ✗ $secret"
    done
    echo ""
    echo "You can delete manually:"
    echo "  gh secret delete SECRET_NAME"
fi

echo ""
echo -e "${YELLOW}Verifying cleanup...${NC}"

# Check remaining STAGING_* secrets
REMAINING=$(gh secret list | grep "^STAGING_" || true)
REMAINING_COUNT=$(echo "$REMAINING" | grep -c "^STAGING_" || echo 0)

if [ "$REMAINING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ All STAGING_* secrets have been removed!${NC}"
    echo ""
    echo "Repository cleanup complete:"
    echo "  ✓ Staging environment: 12 secrets configured"
    echo "  ✓ Production environment: 12 secrets configured"
    echo "  ✓ Repository-level STAGING_* secrets: DELETED"
    echo ""
    echo "Your deployment pipeline is now using GitHub Environments!"
else
    echo -e "${YELLOW}⚠️  Some STAGING_* secrets remain:${NC}"
    echo "$REMAINING" | awk '{print "  - " $1}'
    echo ""
    echo "Delete manually with:"
    echo "  gh secret delete SECRET_NAME"
fi

echo ""
echo "Total repository secrets now:"
TOTAL_REPO_SECRETS=$(gh secret list | wc -l)
echo "  $TOTAL_REPO_SECRETS secrets (should be 0 or very few)"
echo ""

if [ "$REMAINING_COUNT" -eq 0 ] && [ "$DELETED_COUNT" -eq "$TOTAL_COUNT" ]; then
    echo -e "${GREEN}✓ Cleanup successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Push changes to main:"
    echo "   git push origin main"
    echo ""
    echo "2. Monitor staging deployment in GitHub Actions"
    echo ""
    echo "3. Create release for production:"
    echo "   git tag v1.0.1 && git push origin v1.0.1"
    echo ""
    echo "4. Approve production deployment when prompted"
    exit 0
else
    echo -e "${RED}✗ Cleanup incomplete. Manual intervention needed.${NC}"
    exit 1
fi
