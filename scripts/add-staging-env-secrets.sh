#!/bin/bash

##############################################################################
# Add Staging Environment Secrets
#
# This script adds all required secrets to the GitHub staging environment.
# It's an interactive script that prompts for each secret value.
#
# Usage:
#   chmod +x scripts/add-staging-env-secrets.sh
#   ./scripts/add-staging-env-secrets.sh
#
# What it does:
#   1. Prompts for 12 secrets (required and optional)
#   2. Uses 'gh secret set' to add each to the staging environment
#   3. Displays which secrets were added
#   4. Verifies with 'gh secret list --env staging'
#
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         Adding Secrets to GitHub Staging Environment              ║"
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

echo -e "${YELLOW}Note: Enter 'skip' to leave a secret empty (for optional secrets only)${NC}"
echo ""

# Track added secrets
ADDED_SECRETS=()
SKIPPED_SECRETS=()

# 1. STRIPE_SECRET_KEY_TEST
echo -e "${YELLOW}1. Stripe Test Secret Key${NC}"
echo "   From: https://dashboard.stripe.com/apikeys"
echo "   Should start with: sk_test_"
read -p "   Value (or 'skip'): " STRIPE_SECRET_KEY_TEST
if [ "$STRIPE_SECRET_KEY_TEST" != "skip" ] && [ -n "$STRIPE_SECRET_KEY_TEST" ]; then
    gh secret set STRIPE_SECRET_KEY_TEST --env staging --body "$STRIPE_SECRET_KEY_TEST"
    ADDED_SECRETS+=("STRIPE_SECRET_KEY_TEST")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("STRIPE_SECRET_KEY_TEST")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 2. OPENAI_API_KEY
echo -e "${YELLOW}2. OpenAI API Key${NC}"
echo "   From: https://platform.openai.com/account/api-keys"
echo "   Should start with: sk-"
read -p "   Value (or 'skip'): " OPENAI_API_KEY
if [ "$OPENAI_API_KEY" != "skip" ] && [ -n "$OPENAI_API_KEY" ]; then
    gh secret set OPENAI_API_KEY --env staging --body "$OPENAI_API_KEY"
    ADDED_SECRETS+=("OPENAI_API_KEY")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("OPENAI_API_KEY")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 3. FIREBASE_PRIVATE_KEY
echo -e "${YELLOW}3. Firebase Private Key${NC}"
echo "   From: Firebase Console > Project Settings > Service Accounts > Generate Key"
echo "   It's a multi-line PEM key. Paste it and press Ctrl+D when done:"
echo "   (Or type 'skip' on first line to skip)"
read -p "   First line (or 'skip'): " FIRST_LINE
if [ "$FIRST_LINE" = "skip" ]; then
    SKIPPED_SECRETS+=("FIREBASE_PRIVATE_KEY")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    # Read rest of the key
    FIREBASE_PRIVATE_KEY="$FIRST_LINE"
    while IFS= read -r line; do
        if [ -z "$line" ]; then
            break
        fi
        FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"$'\n'"$line"
    done

    if [ -n "$FIREBASE_PRIVATE_KEY" ]; then
        gh secret set FIREBASE_PRIVATE_KEY --env staging --body "$FIREBASE_PRIVATE_KEY"
        ADDED_SECRETS+=("FIREBASE_PRIVATE_KEY")
        echo -e "   ${GREEN}✓ Added${NC}"
    fi
fi
echo ""

# 4. FIREBASE_CLIENT_EMAIL
echo -e "${YELLOW}4. Firebase Client Email${NC}"
echo "   From: Service account JSON file (client_email field)"
echo "   Format: firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com"
read -p "   Value (or 'skip'): " FIREBASE_CLIENT_EMAIL
if [ "$FIREBASE_CLIENT_EMAIL" != "skip" ] && [ -n "$FIREBASE_CLIENT_EMAIL" ]; then
    gh secret set FIREBASE_CLIENT_EMAIL --env staging --body "$FIREBASE_CLIENT_EMAIL"
    ADDED_SECRETS+=("FIREBASE_CLIENT_EMAIL")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("FIREBASE_CLIENT_EMAIL")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 5. FIREBASE_PROJECT_ID
echo -e "${YELLOW}5. Firebase Project ID${NC}"
echo "   From: Firebase Console > Project Settings"
echo "   For staging: usually ishkul-org-staging or similar"
read -p "   Value (or 'skip'): " FIREBASE_PROJECT_ID
if [ "$FIREBASE_PROJECT_ID" != "skip" ] && [ -n "$FIREBASE_PROJECT_ID" ]; then
    gh secret set FIREBASE_PROJECT_ID --env staging --body "$FIREBASE_PROJECT_ID"
    ADDED_SECRETS+=("FIREBASE_PROJECT_ID")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("FIREBASE_PROJECT_ID")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 6. GCP_PROJECT_NUMBER
echo -e "${YELLOW}6. GCP Project Number${NC}"
echo "   From: GCP Console > Project selector > select project > copy project number"
echo "   Format: 12-digit number (e.g., 863006625304)"
read -p "   Value (or 'skip'): " GCP_PROJECT_NUMBER
if [ "$GCP_PROJECT_NUMBER" != "skip" ] && [ -n "$GCP_PROJECT_NUMBER" ]; then
    gh secret set GCP_PROJECT_NUMBER --env staging --body "$GCP_PROJECT_NUMBER"
    ADDED_SECRETS+=("GCP_PROJECT_NUMBER")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("GCP_PROJECT_NUMBER")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 7. GCP_REGION
echo -e "${YELLOW}7. GCP Region${NC}"
echo "   Default: northamerica-northeast1"
echo "   Other options: us-central1, europe-west1, asia-northeast1, etc."
read -p "   Value (or 'skip', default: northamerica-northeast1): " GCP_REGION
if [ "$GCP_REGION" = "skip" ]; then
    SKIPPED_SECRETS+=("GCP_REGION")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    GCP_REGION="${GCP_REGION:-northamerica-northeast1}"
    gh secret set GCP_REGION --env staging --body "$GCP_REGION"
    ADDED_SECRETS+=("GCP_REGION")
    echo -e "   ${GREEN}✓ Added (value: $GCP_REGION)${NC}"
fi
echo ""

# 8. GOOGLE_OAUTH_CLIENT_ID
echo -e "${YELLOW}8. Google OAuth Client ID${NC}"
echo "   From: Google Cloud Console > OAuth 2.0 Client IDs"
echo "   Format: xxx-yyy.apps.googleusercontent.com"
read -p "   Value (or 'skip'): " GOOGLE_OAUTH_CLIENT_ID
if [ "$GOOGLE_OAUTH_CLIENT_ID" != "skip" ] && [ -n "$GOOGLE_OAUTH_CLIENT_ID" ]; then
    gh secret set GOOGLE_OAUTH_CLIENT_ID --env staging --body "$GOOGLE_OAUTH_CLIENT_ID"
    ADDED_SECRETS+=("GOOGLE_OAUTH_CLIENT_ID")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("GOOGLE_OAUTH_CLIENT_ID")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 9. GOOGLE_OAUTH_CLIENT_SECRET
echo -e "${YELLOW}9. Google OAuth Client Secret${NC}"
echo "   From: Same OAuth credentials page as above"
echo "   Should start with: GOCSPX-"
read -p "   Value (or 'skip'): " GOOGLE_OAUTH_CLIENT_SECRET
if [ "$GOOGLE_OAUTH_CLIENT_SECRET" != "skip" ] && [ -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]; then
    gh secret set GOOGLE_OAUTH_CLIENT_SECRET --env staging --body "$GOOGLE_OAUTH_CLIENT_SECRET"
    ADDED_SECRETS+=("GOOGLE_OAUTH_CLIENT_SECRET")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("GOOGLE_OAUTH_CLIENT_SECRET")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 10. WEBHOOK_SECRET
echo -e "${YELLOW}10. Webhook Secret${NC}"
echo "   From: Stripe Dashboard > Developers > Webhooks"
echo "   Should start with: whsec_test_"
echo "   (Or a random string if self-signed)"
read -p "   Value (or 'skip'): " WEBHOOK_SECRET
if [ "$WEBHOOK_SECRET" != "skip" ] && [ -n "$WEBHOOK_SECRET" ]; then
    gh secret set WEBHOOK_SECRET --env staging --body "$WEBHOOK_SECRET"
    ADDED_SECRETS+=("WEBHOOK_SECRET")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("WEBHOOK_SECRET")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 11. DATABASE_NAME (optional)
echo -e "${YELLOW}11. Firestore Database Name${NC}"
echo "   Default: (default)"
echo "   Optional: leave blank for default database"
read -p "   Value (or 'skip', default: (default)): " DATABASE_NAME
if [ "$DATABASE_NAME" = "skip" ]; then
    SKIPPED_SECRETS+=("DATABASE_NAME")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    DATABASE_NAME="${DATABASE_NAME:-(default)}"
    gh secret set DATABASE_NAME --env staging --body "$DATABASE_NAME"
    ADDED_SECRETS+=("DATABASE_NAME")
    echo -e "   ${GREEN}✓ Added (value: $DATABASE_NAME)${NC}"
fi
echo ""

# 12. LOG_LEVEL (optional)
echo -e "${YELLOW}12. Log Level${NC}"
echo "   Options: debug, info, warn, error"
echo "   Default: info"
read -p "   Value (or 'skip', default: info): " LOG_LEVEL
if [ "$LOG_LEVEL" = "skip" ]; then
    SKIPPED_SECRETS+=("LOG_LEVEL")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    LOG_LEVEL="${LOG_LEVEL:-info}"
    gh secret set LOG_LEVEL --env staging --body "$LOG_LEVEL"
    ADDED_SECRETS+=("LOG_LEVEL")
    echo -e "   ${GREEN}✓ Added (value: $LOG_LEVEL)${NC}"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        Summary                                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Added Secrets: ${#ADDED_SECRETS[@]}${NC}"
for secret in "${ADDED_SECRETS[@]}"; do
    echo "  ✓ $secret"
done
echo ""

if [ ${#SKIPPED_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Skipped Secrets: ${#SKIPPED_SECRETS[@]}${NC}"
    for secret in "${SKIPPED_SECRETS[@]}"; do
        echo "  ○ $secret"
    done
    echo ""
fi

echo -e "${YELLOW}Verifying secrets in staging environment...${NC}"
SECRET_COUNT=$(gh secret list --env staging | wc -l)
echo "Total secrets in staging: $SECRET_COUNT"
echo ""

if [ "$SECRET_COUNT" -ge 12 ]; then
    echo -e "${GREEN}✓ Success! All secrets have been added to the staging environment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run the production secrets script:"
    echo "   ./scripts/add-production-env-secrets.sh"
    echo ""
    echo "2. Test staging deployment:"
    echo "   git push origin main"
    echo ""
    echo "3. Test production deployment:"
    echo "   git tag v1.0.0 && git push origin v1.0.0"
else
    echo -e "${YELLOW}Note: You have $SECRET_COUNT secrets. Recommended minimum is 12.${NC}"
    echo ""
    echo "You can add individual secrets manually:"
    echo "  gh secret set SECRET_NAME --env staging --body 'value'"
fi
echo ""
