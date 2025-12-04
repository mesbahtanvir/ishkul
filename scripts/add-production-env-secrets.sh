#!/bin/bash

##############################################################################
# Add Production Environment Secrets
#
# This script adds all required secrets to the GitHub production environment.
# It's an interactive script that prompts for each secret value.
#
# IMPORTANT: Use PRODUCTION/LIVE credentials, not test keys!
#
# Usage:
#   chmod +x scripts/add-production-env-secrets.sh
#   ./scripts/add-production-env-secrets.sh
#
# What it does:
#   1. Prompts for 12 secrets (required and optional)
#   2. Uses 'gh secret set' to add each to the production environment
#   3. Displays which secrets were added
#   4. Verifies with 'gh secret list --env production'
#
##############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║       Adding Secrets to GitHub Production Environment             ║"
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
echo -e "${YELLOW}Note: Enter 'skip' to leave a secret empty (for optional secrets only)${NC}"
echo ""

# Track added secrets
ADDED_SECRETS=()
SKIPPED_SECRETS=()

# 1. STRIPE_SECRET_KEY
echo -e "${YELLOW}1. Stripe Live Secret Key${NC}"
echo "   From: https://dashboard.stripe.com/apikeys"
echo "   Should start with: sk_live_ (NOT sk_test_)"
echo "   ⚠️  MUST be the LIVE key, not test key"
read -p "   Value (or 'skip'): " STRIPE_SECRET_KEY
if [ "$STRIPE_SECRET_KEY" != "skip" ] && [ -n "$STRIPE_SECRET_KEY" ]; then
    if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_ ]]; then
        echo -e "${RED}Warning: Secret does not start with sk_live_ (might be test key)${NC}"
        read -p "Continue anyway? (yes/no): " CONTINUE
        if [ "$CONTINUE" != "yes" ]; then
            echo "Skipped."
            SKIPPED_SECRETS+=("STRIPE_SECRET_KEY")
        else
            gh secret set STRIPE_SECRET_KEY --env production --body "$STRIPE_SECRET_KEY"
            ADDED_SECRETS+=("STRIPE_SECRET_KEY")
            echo -e "   ${GREEN}✓ Added${NC}"
        fi
    else
        gh secret set STRIPE_SECRET_KEY --env production --body "$STRIPE_SECRET_KEY"
        ADDED_SECRETS+=("STRIPE_SECRET_KEY")
        echo -e "   ${GREEN}✓ Added${NC}"
    fi
else
    SKIPPED_SECRETS+=("STRIPE_SECRET_KEY")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 2. OPENAI_API_KEY
echo -e "${YELLOW}2. OpenAI API Key (Production)${NC}"
echo "   From: https://platform.openai.com/account/api-keys"
echo "   Should start with: sk-"
echo "   ⚠️  Use the PRODUCTION key, not a test key"
read -p "   Value (or 'skip'): " OPENAI_API_KEY
if [ "$OPENAI_API_KEY" != "skip" ] && [ -n "$OPENAI_API_KEY" ]; then
    gh secret set OPENAI_API_KEY --env production --body "$OPENAI_API_KEY"
    ADDED_SECRETS+=("OPENAI_API_KEY")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("OPENAI_API_KEY")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 3. FIREBASE_PRIVATE_KEY
echo -e "${YELLOW}3. Firebase Private Key (Production Project)${NC}"
echo "   From: Firebase Console > Project Settings > Service Accounts > Generate Key"
echo "   Use the PRODUCTION Firebase project, not staging"
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
        gh secret set FIREBASE_PRIVATE_KEY --env production --body "$FIREBASE_PRIVATE_KEY"
        ADDED_SECRETS+=("FIREBASE_PRIVATE_KEY")
        echo -e "   ${GREEN}✓ Added${NC}"
    fi
fi
echo ""

# 4. FIREBASE_CLIENT_EMAIL
echo -e "${YELLOW}4. Firebase Client Email (Production Project)${NC}"
echo "   From: Service account JSON file (client_email field)"
echo "   Format: firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com"
echo "   Use the PRODUCTION Firebase project service account"
read -p "   Value (or 'skip'): " FIREBASE_CLIENT_EMAIL
if [ "$FIREBASE_CLIENT_EMAIL" != "skip" ] && [ -n "$FIREBASE_CLIENT_EMAIL" ]; then
    gh secret set FIREBASE_CLIENT_EMAIL --env production --body "$FIREBASE_CLIENT_EMAIL"
    ADDED_SECRETS+=("FIREBASE_CLIENT_EMAIL")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("FIREBASE_CLIENT_EMAIL")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 5. FIREBASE_PROJECT_ID
echo -e "${YELLOW}5. Firebase Project ID (Production)${NC}"
echo "   From: Firebase Console > Project Settings"
echo "   Use the PRODUCTION project ID"
read -p "   Value (or 'skip'): " FIREBASE_PROJECT_ID
if [ "$FIREBASE_PROJECT_ID" != "skip" ] && [ -n "$FIREBASE_PROJECT_ID" ]; then
    gh secret set FIREBASE_PROJECT_ID --env production --body "$FIREBASE_PROJECT_ID"
    ADDED_SECRETS+=("FIREBASE_PROJECT_ID")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("FIREBASE_PROJECT_ID")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 6. GCP_PROJECT_NUMBER
echo -e "${YELLOW}6. GCP Project Number${NC}"
echo "   From: GCP Console > Project selector > select production project > copy number"
echo "   Format: 12-digit number"
read -p "   Value (or 'skip'): " GCP_PROJECT_NUMBER
if [ "$GCP_PROJECT_NUMBER" != "skip" ] && [ -n "$GCP_PROJECT_NUMBER" ]; then
    gh secret set GCP_PROJECT_NUMBER --env production --body "$GCP_PROJECT_NUMBER"
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
echo "   Must match your production Cloud Run region"
read -p "   Value (or 'skip', default: northamerica-northeast1): " GCP_REGION
if [ "$GCP_REGION" = "skip" ]; then
    SKIPPED_SECRETS+=("GCP_REGION")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    GCP_REGION="${GCP_REGION:-northamerica-northeast1}"
    gh secret set GCP_REGION --env production --body "$GCP_REGION"
    ADDED_SECRETS+=("GCP_REGION")
    echo -e "   ${GREEN}✓ Added (value: $GCP_REGION)${NC}"
fi
echo ""

# 8. GOOGLE_OAUTH_CLIENT_ID
echo -e "${YELLOW}8. Google OAuth Client ID (Production)${NC}"
echo "   From: Google Cloud Console > OAuth 2.0 Client IDs"
echo "   Format: xxx-yyy.apps.googleusercontent.com"
echo "   Use the PRODUCTION OAuth client ID"
read -p "   Value (or 'skip'): " GOOGLE_OAUTH_CLIENT_ID
if [ "$GOOGLE_OAUTH_CLIENT_ID" != "skip" ] && [ -n "$GOOGLE_OAUTH_CLIENT_ID" ]; then
    gh secret set GOOGLE_OAUTH_CLIENT_ID --env production --body "$GOOGLE_OAUTH_CLIENT_ID"
    ADDED_SECRETS+=("GOOGLE_OAUTH_CLIENT_ID")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("GOOGLE_OAUTH_CLIENT_ID")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 9. GOOGLE_OAUTH_CLIENT_SECRET
echo -e "${YELLOW}9. Google OAuth Client Secret (Production)${NC}"
echo "   From: Same OAuth credentials page as above"
echo "   Should start with: GOCSPX-"
echo "   Use the PRODUCTION OAuth client secret"
read -p "   Value (or 'skip'): " GOOGLE_OAUTH_CLIENT_SECRET
if [ "$GOOGLE_OAUTH_CLIENT_SECRET" != "skip" ] && [ -n "$GOOGLE_OAUTH_CLIENT_SECRET" ]; then
    gh secret set GOOGLE_OAUTH_CLIENT_SECRET --env production --body "$GOOGLE_OAUTH_CLIENT_SECRET"
    ADDED_SECRETS+=("GOOGLE_OAUTH_CLIENT_SECRET")
    echo -e "   ${GREEN}✓ Added${NC}"
else
    SKIPPED_SECRETS+=("GOOGLE_OAUTH_CLIENT_SECRET")
    echo -e "   ${YELLOW}○ Skipped${NC}"
fi
echo ""

# 10. WEBHOOK_SECRET
echo -e "${YELLOW}10. Webhook Secret (Production/Live)${NC}"
echo "   From: Stripe Dashboard > Developers > Webhooks"
echo "   Should start with: whsec_ (live, not test)"
echo "   ⚠️  MUST be the LIVE webhook secret, not test"
read -p "   Value (or 'skip'): " WEBHOOK_SECRET
if [ "$WEBHOOK_SECRET" != "skip" ] && [ -n "$WEBHOOK_SECRET" ]; then
    gh secret set WEBHOOK_SECRET --env production --body "$WEBHOOK_SECRET"
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
echo "   Optional: specify only if using non-default database"
read -p "   Value (or 'skip', default: (default)): " DATABASE_NAME
if [ "$DATABASE_NAME" = "skip" ]; then
    SKIPPED_SECRETS+=("DATABASE_NAME")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    DATABASE_NAME="${DATABASE_NAME:-(default)}"
    gh secret set DATABASE_NAME --env production --body "$DATABASE_NAME"
    ADDED_SECRETS+=("DATABASE_NAME")
    echo -e "   ${GREEN}✓ Added (value: $DATABASE_NAME)${NC}"
fi
echo ""

# 12. LOG_LEVEL (optional)
echo -e "${YELLOW}12. Log Level${NC}"
echo "   Options: debug, info, warn, error"
echo "   Default for production: warn or error"
read -p "   Value (or 'skip', default: warn): " LOG_LEVEL
if [ "$LOG_LEVEL" = "skip" ]; then
    SKIPPED_SECRETS+=("LOG_LEVEL")
    echo -e "   ${YELLOW}○ Skipped${NC}"
else
    LOG_LEVEL="${LOG_LEVEL:-warn}"
    gh secret set LOG_LEVEL --env production --body "$LOG_LEVEL"
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

echo -e "${YELLOW}Verifying secrets in production environment...${NC}"
SECRET_COUNT=$(gh secret list --env production | wc -l)
echo "Total secrets in production: $SECRET_COUNT"
echo ""

if [ "$SECRET_COUNT" -ge 12 ]; then
    echo -e "${GREEN}✓ Success! All secrets have been added to the production environment.${NC}"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "   1. Review secrets are correct production/live values"
    echo "   2. Do NOT use test keys in production"
    echo "   3. Verify Stripe keys start with sk_live_"
    echo ""
    echo "Next steps:"
    echo "1. Test staging deployment (if not done already):"
    echo "   git push origin main"
    echo ""
    echo "2. Test production deployment:"
    echo "   git tag v1.0.0 && git push origin v1.0.0"
    echo ""
    echo "3. Approve deployment when prompted"
    echo ""
    echo "4. Clean up old STAGING_* secrets:"
    echo "   ./scripts/cleanup-old-secrets.sh"
else
    echo -e "${YELLOW}Note: You have $SECRET_COUNT secrets. Recommended minimum is 12.${NC}"
    echo ""
    echo "You can add individual secrets manually:"
    echo "  gh secret set SECRET_NAME --env production --body 'value'"
fi
echo ""
