#!/bin/bash

# Setup Google Cloud Secret Manager for Ishkul Backend
# This script stores sensitive credentials in Secret Manager

set -e

echo "🔐 Setting up Google Cloud Secret Manager..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    print_error "No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Project: $PROJECT_ID"

# Enable Secret Manager API
print_status "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Check if service account key exists
if [ -f "backend/serviceAccountKey.json" ]; then
    print_status "Found service account key"

    # Create or update secret
    print_status "Storing service account key in Secret Manager..."

    if gcloud secrets describe firebase-service-account --project=$PROJECT_ID &>/dev/null; then
        print_status "Updating existing secret..."
        gcloud secrets versions add firebase-service-account \
            --data-file=backend/serviceAccountKey.json \
            --project=$PROJECT_ID
    else
        print_status "Creating new secret..."
        gcloud secrets create firebase-service-account \
            --data-file=backend/serviceAccountKey.json \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
    fi

    print_status "✓ Service account key stored in Secret Manager"
    print_warning "You can now delete backend/serviceAccountKey.json (it's in Secret Manager)"
else
    print_warning "Service account key not found at backend/serviceAccountKey.json"
    print_status "To create one:"
    print_status "  1. Go to Firebase Console → Project Settings → Service Accounts"
    print_status "  2. Click 'Generate New Private Key'"
    print_status "  3. Save as backend/serviceAccountKey.json"
    print_status "  4. Run this script again"
fi

# Set up storage bucket env var
STORAGE_BUCKET="${PROJECT_ID}.appspot.com"
print_status "Storage bucket: $STORAGE_BUCKET"

if gcloud secrets describe storage-bucket --project=$PROJECT_ID &>/dev/null; then
    echo -n "$STORAGE_BUCKET" | gcloud secrets versions add storage-bucket \
        --data-file=- \
        --project=$PROJECT_ID
else
    echo -n "$STORAGE_BUCKET" | gcloud secrets create storage-bucket \
        --data-file=- \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
fi

print_status "✓ Storage bucket configured"

# Grant Cloud Run access to secrets
print_status "Setting up Cloud Run service account permissions..."

# Get the default compute service account
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant access to secrets
gcloud secrets add-iam-policy-binding firebase-service-account \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

gcloud secrets add-iam-policy-binding storage-bucket \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

print_status "✓ Permissions configured"

echo ""
print_status "Secret Manager setup complete! 🎉"
echo ""
print_status "Secrets created:"
print_status "  • firebase-service-account"
print_status "  • storage-bucket"
echo ""
print_status "Next steps:"
print_status "  1. Run ./deploy.sh to deploy your application"
print_status "  2. The backend will automatically use secrets from Secret Manager"
