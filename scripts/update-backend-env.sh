#!/bin/bash

# Update Backend Environment Variables on Cloud Run
# This script updates all environment variables for the ishkul-backend service
# Including Firebase config, JWT secrets, and Google OAuth client IDs

set -e

echo "🔧 Updating Backend Environment Variables..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
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

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Configuration
SERVICE_NAME="ishkul-backend"
REGION="europe-west1"

# Get project ID (use env var or gcloud config)
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

if [ -z "$PROJECT_ID" ]; then
    print_error "No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Set gcloud project
gcloud config set project "$PROJECT_ID" 2>/dev/null

print_status "Project: $PROJECT_ID"
print_status "Service: $SERVICE_NAME"
print_status "Region: $REGION"

# Check if service exists
if ! gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    print_error "Service $SERVICE_NAME not found in region $REGION"
    print_status "Deploy the backend first with: cd backend && gcloud run deploy $SERVICE_NAME --source ."
    exit 1
fi

print_status "Service found. Updating environment variables..."

# ============================================
# Environment Variables Configuration
# ============================================

# Firebase Configuration
FIREBASE_DATABASE_URL="${FIREBASE_DATABASE_URL:-https://ishkul-org.firebaseio.com}"
FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-ishkul-org.appspot.com}"

# Production allowed origins (update these with your actual domains)
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://ishkul.vercel.app,https://ishkul-org.web.app,http://localhost:3000,http://localhost:8081,http://localhost:19006}"

# Google OAuth Client IDs (get from Google Cloud Console > APIs & Services > Credentials)
GOOGLE_WEB_CLIENT_ID="${GOOGLE_WEB_CLIENT_ID:-your-web-client-id.apps.googleusercontent.com}"
GOOGLE_IOS_CLIENT_ID="${GOOGLE_IOS_CLIENT_ID:-your-ios-client-id.apps.googleusercontent.com}"
GOOGLE_ANDROID_CLIENT_ID="${GOOGLE_ANDROID_CLIENT_ID:-your-android-client-id.apps.googleusercontent.com}"

# Environment
ENVIRONMENT="${ENVIRONMENT:-production}"

# ============================================
# Create JWT Secret in Secret Manager (if not exists)
# ============================================

JWT_SECRET_NAME="jwt-secret"

print_header "\n📦 Setting up JWT Secret in Secret Manager..."

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

if gcloud secrets describe $JWT_SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    print_status "JWT secret already exists in Secret Manager"
else
    print_status "Creating new JWT secret..."
    # Generate a secure random secret
    JWT_SECRET_VALUE=$(openssl rand -base64 32)
    echo -n "$JWT_SECRET_VALUE" | gcloud secrets create $JWT_SECRET_NAME \
        --data-file=- \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
    print_status "JWT secret created in Secret Manager"
fi

# Grant Cloud Run access to the secret
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding $JWT_SECRET_NAME \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

print_status "Secret Manager permissions configured"

# ============================================
# Update Cloud Run Environment Variables
# ============================================

print_header "\n🚀 Updating Cloud Run service..."

gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --set-env-vars="ENVIRONMENT=$ENVIRONMENT" \
    --set-env-vars="FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL" \
    --set-env-vars="FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET" \
    --set-env-vars="ALLOWED_ORIGINS=$ALLOWED_ORIGINS" \
    --set-env-vars="GOOGLE_WEB_CLIENT_ID=$GOOGLE_WEB_CLIENT_ID" \
    --set-env-vars="GOOGLE_IOS_CLIENT_ID=$GOOGLE_IOS_CLIENT_ID" \
    --set-env-vars="GOOGLE_ANDROID_CLIENT_ID=$GOOGLE_ANDROID_CLIENT_ID" \
    --set-secrets="JWT_SECRET=${JWT_SECRET_NAME}:latest"

print_status "Environment variables updated!"

# ============================================
# Summary
# ============================================

echo ""
print_header "============================================"
print_header "  Environment Variables Updated!"
print_header "============================================"
echo ""
print_status "Service: $SERVICE_NAME"
print_status "Region: $REGION"
echo ""
print_status "Variables set:"
print_status "  ENVIRONMENT=$ENVIRONMENT"
print_status "  FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL"
print_status "  FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET"
print_status "  ALLOWED_ORIGINS=$ALLOWED_ORIGINS"
print_status "  GOOGLE_WEB_CLIENT_ID=$GOOGLE_WEB_CLIENT_ID"
print_status "  GOOGLE_IOS_CLIENT_ID=$GOOGLE_IOS_CLIENT_ID"
print_status "  GOOGLE_ANDROID_CLIENT_ID=$GOOGLE_ANDROID_CLIENT_ID"
print_status "  JWT_SECRET=(from Secret Manager)"
echo ""

# Check if placeholder values are still used
if [[ "$GOOGLE_WEB_CLIENT_ID" == *"your-"* ]]; then
    print_warning "You're using placeholder Google OAuth Client IDs!"
    print_warning "Update them by passing environment variables:"
    echo ""
    print_status "  GOOGLE_WEB_CLIENT_ID=xxx GOOGLE_IOS_CLIENT_ID=xxx GOOGLE_ANDROID_CLIENT_ID=xxx ./scripts/update-backend-env.sh"
    echo ""
    print_status "Get your OAuth Client IDs from:"
    print_status "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
fi

echo ""
print_status "Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo 'N/A')"
echo ""
print_status "View service logs:"
print_status "  gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
