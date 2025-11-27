#!/bin/bash

# Setup GitHub Actions for Ishkul
# This script creates a service account and configures GitHub secrets

set -e

echo "🔧 Setting up GitHub Actions for Ishkul..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# GCP Project ID
GCP_PROJECT_ID="ishkul-org"

print_status "GCP Project ID: $GCP_PROJECT_ID"

# Verify project exists
if ! gcloud projects describe "$GCP_PROJECT_ID" &>/dev/null; then
    print_error "Project '$GCP_PROJECT_ID' not found or you don't have access to it"
    echo ""
    echo "Please ensure:"
    echo "  1. The GCP project 'ishkul-org' exists"
    echo "  2. You have access to it"
    echo "  3. You're authenticated with gcloud: gcloud auth login"
    echo ""
    echo "Available projects:"
    gcloud projects list
    exit 1
fi

print_status "Project verified ✓"

# Get GitHub repo
echo ""
read -p "Enter your GitHub repository (format: username/repo): " GITHUB_REPO

if [ -z "$GITHUB_REPO" ]; then
    print_error "GitHub repository is required"
    exit 1
fi

print_status "GitHub Repository: $GITHUB_REPO"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_warning "GitHub CLI (gh) not installed"
    print_status "Install from: https://cli.github.com/"
    print_status "Or set secrets manually in GitHub UI"
    MANUAL_MODE=true
else
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        print_warning "Not authenticated with GitHub"
        print_status "Run: gh auth login"
        MANUAL_MODE=true
    else
        print_status "GitHub CLI authenticated ✓"
        MANUAL_MODE=false
    fi
fi

# Service account name
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Step 1: Create service account
print_step "Creating service account..."

if gcloud iam service-accounts describe $SA_EMAIL --project=$GCP_PROJECT_ID &>/dev/null; then
    print_warning "Service account already exists, skipping creation"
else
    gcloud iam service-accounts create $SA_NAME \
        --display-name "GitHub Actions Deployer" \
        --description "Service account for GitHub Actions CI/CD" \
        --project=$GCP_PROJECT_ID

    print_status "Service account created ✓"
fi

# Step 2: Grant permissions
print_step "Granting permissions..."

ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
    "roles/storage.admin"
    "roles/secretmanager.secretAccessor"
    "roles/cloudbuild.builds.editor"
    "roles/artifactregistry.admin"
    "roles/serviceusage.serviceUsageConsumer"
)

for ROLE in "${ROLES[@]}"; do
    print_status "Granting $ROLE..."
    gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="$ROLE" \
        --condition=None \
        --quiet 2>/dev/null || true
done

print_status "Permissions granted ✓"

# Step 2.5: Grant iam.serviceAccounts.actAs on the default compute service account
print_step "Granting iam.serviceAccounts.actAs on Compute Engine default service account..."

PROJECT_NUMBER=$(gcloud projects describe $GCP_PROJECT_ID --format='value(projectNumber)')
DEFAULT_SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

print_status "Default service account: $DEFAULT_SA_EMAIL"

gcloud iam service-accounts add-iam-policy-binding "$DEFAULT_SA_EMAIL" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" \
    --project="$GCP_PROJECT_ID" \
    --quiet 2>/dev/null || true

print_status "iam.serviceAccounts.actAs granted ✓"

# Step 3: Create service account key
print_step "Creating service account key..."

KEY_FILE="github-actions-key-$$.json"

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL \
    --project=$GCP_PROJECT_ID

print_status "Service account key created ✓"

# Step 4: Set up GitHub secrets
print_step "Setting up GitHub secrets..."

if [ "$MANUAL_MODE" = true ]; then
    print_warning "Manual setup required"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Add these secrets to GitHub:"
    echo "Go to: https://github.com/${GITHUB_REPO}/settings/secrets/actions"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. GCP_PROJECT_ID"
    echo "   Value: $GCP_PROJECT_ID"
    echo ""
    echo "2. GCP_SA_KEY"
    echo "   Value: (contents of $KEY_FILE)"
    cat $KEY_FILE
    echo ""
    echo "3. FIREBASE_SERVICE_ACCOUNT"
    echo "   Value: (same as GCP_SA_KEY)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    print_warning "After adding secrets, delete the key file: rm $KEY_FILE"
else
    # Use gh CLI to set secrets
    print_status "Setting GCP_PROJECT_ID..."
    echo "$GCP_PROJECT_ID" | gh secret set GCP_PROJECT_ID --repo $GITHUB_REPO

    print_status "Setting GCP_SA_KEY..."
    gh secret set GCP_SA_KEY < $KEY_FILE --repo $GITHUB_REPO

    print_status "Setting FIREBASE_SERVICE_ACCOUNT..."
    gh secret set FIREBASE_SERVICE_ACCOUNT < $KEY_FILE --repo $GITHUB_REPO

    print_status "GitHub secrets configured ✓"

    # Clean up key file
    rm $KEY_FILE
    print_status "Key file deleted ✓"
fi

# Step 5: Enable required APIs
print_step "Enabling required Google Cloud APIs..."

APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
)

for API in "${APIS[@]}"; do
    gcloud services enable $API --project=$GCP_PROJECT_ID 2>/dev/null || true
done

print_status "APIs enabled ✓"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   GitHub Actions Setup Complete! 🎉                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_status "Configuration:"
print_status "  GCP Project: $GCP_PROJECT_ID"
print_status "  Service Account: $SA_EMAIL"
print_status "  GitHub Repository: $GITHUB_REPO"
echo ""
print_status "GitHub Secrets Created:"
echo "  • GCP_PROJECT_ID = $GCP_PROJECT_ID"
echo "  • GCP_SA_KEY = (service account credentials)"
echo "  • FIREBASE_SERVICE_ACCOUNT = (service account credentials)"
echo ""
print_status "Next steps:"
echo "  1. Commit and push your code to GitHub"
echo "  2. Go to GitHub Actions tab to see deployments"
echo "  3. Every push to 'main' will trigger deployment"
echo ""
print_status "Manual deployment:"
echo "  - Go to GitHub → Actions → Deploy → Run workflow"
echo ""
print_status "Local deployment (for testing):"
echo "  - Run: ./deploy.sh"
echo ""

if [ "$MANUAL_MODE" = true ]; then
    print_warning "Don't forget to:"
    print_warning "  1. Add secrets to GitHub (instructions above)"
    print_warning "  2. Delete key file: rm $KEY_FILE"
fi
