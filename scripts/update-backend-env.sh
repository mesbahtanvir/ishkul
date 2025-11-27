#!/bin/bash

# Update Backend Environment Variables on Cloud Run
# This script reads from backend/.env and updates Cloud Run service
#
# Usage:
#   ./scripts/update-backend-env.sh
#
# The script expects a backend/.env file with the following variables:
#   - FIREBASE_DATABASE_URL
#   - FIREBASE_STORAGE_BUCKET
#   - ALLOWED_ORIGINS
#   - JWT_SECRET
#   - GOOGLE_WEB_CLIENT_ID
#   - GOOGLE_IOS_CLIENT_ID
#   - GOOGLE_ANDROID_CLIENT_ID
#   - ENVIRONMENT

set -e

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

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"

echo "🔧 Updating Backend Environment Variables..."
echo ""

# ============================================
# Load environment variables from backend/.env
# ============================================

if [ ! -f "$ENV_FILE" ]; then
    print_error "backend/.env file not found!"
    print_status "Create it from the example:"
    print_status "  cp backend/.env.example backend/.env"
    print_status "  # Then edit backend/.env with your actual values"
    exit 1
fi

print_status "Loading environment from: $ENV_FILE"

# Load .env file (handling comments and empty lines)
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # Remove leading/trailing whitespace from key
    key=$(echo "$key" | xargs)
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    # Export the variable
    export "$key=$value"
done < "$ENV_FILE"

# ============================================
# Configuration
# ============================================

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

# ============================================
# Validate required environment variables
# ============================================

print_header "\n📋 Validating environment variables..."

MISSING_VARS=()

[ -z "$FIREBASE_DATABASE_URL" ] && MISSING_VARS+=("FIREBASE_DATABASE_URL")
[ -z "$FIREBASE_STORAGE_BUCKET" ] && MISSING_VARS+=("FIREBASE_STORAGE_BUCKET")
[ -z "$ALLOWED_ORIGINS" ] && MISSING_VARS+=("ALLOWED_ORIGINS")
[ -z "$GOOGLE_WEB_CLIENT_ID" ] && MISSING_VARS+=("GOOGLE_WEB_CLIENT_ID")
[ -z "$GOOGLE_IOS_CLIENT_ID" ] && MISSING_VARS+=("GOOGLE_IOS_CLIENT_ID")
[ -z "$GOOGLE_ANDROID_CLIENT_ID" ] && MISSING_VARS+=("GOOGLE_ANDROID_CLIENT_ID")
[ -z "$ENVIRONMENT" ] && MISSING_VARS+=("ENVIRONMENT")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing required environment variables in backend/.env:"
    for var in "${MISSING_VARS[@]}"; do
        print_error "  - $var"
    done
    exit 1
fi

# Check for placeholder values
PLACEHOLDER_VARS=()
[[ "$GOOGLE_WEB_CLIENT_ID" == *"your-"* ]] && PLACEHOLDER_VARS+=("GOOGLE_WEB_CLIENT_ID")
[[ "$GOOGLE_IOS_CLIENT_ID" == *"your-"* ]] && PLACEHOLDER_VARS+=("GOOGLE_IOS_CLIENT_ID")
[[ "$GOOGLE_ANDROID_CLIENT_ID" == *"your-"* ]] && PLACEHOLDER_VARS+=("GOOGLE_ANDROID_CLIENT_ID")
[[ "$FIREBASE_DATABASE_URL" == *"your-project"* ]] && PLACEHOLDER_VARS+=("FIREBASE_DATABASE_URL")
[[ "$FIREBASE_STORAGE_BUCKET" == *"your-project"* ]] && PLACEHOLDER_VARS+=("FIREBASE_STORAGE_BUCKET")

if [ ${#PLACEHOLDER_VARS[@]} -ne 0 ]; then
    print_warning "Some variables still have placeholder values:"
    for var in "${PLACEHOLDER_VARS[@]}"; do
        print_warning "  - $var"
    done
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Update backend/.env with actual values and try again."
        exit 1
    fi
fi

print_status "All required variables found"

# ============================================
# Check if service exists
# ============================================

if ! gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    print_error "Service $SERVICE_NAME not found in region $REGION"
    print_status "Deploy the backend first with: cd backend && gcloud run deploy $SERVICE_NAME --source ."
    exit 1
fi

print_status "Service found"

# ============================================
# Handle JWT Secret
# ============================================

JWT_SECRET_NAME="jwt-secret"

print_header "\n📦 Setting up JWT Secret in Secret Manager..."

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

# Check if JWT_SECRET is provided in .env
if [ -n "$JWT_SECRET" ] && [[ "$JWT_SECRET" != *"your-"* ]]; then
    # Use the JWT_SECRET from .env file
    if gcloud secrets describe $JWT_SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
        print_status "Updating JWT secret in Secret Manager..."
        echo -n "$JWT_SECRET" | gcloud secrets versions add $JWT_SECRET_NAME \
            --data-file=- \
            --project=$PROJECT_ID
    else
        print_status "Creating JWT secret in Secret Manager..."
        echo -n "$JWT_SECRET" | gcloud secrets create $JWT_SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
    fi
    print_status "JWT secret updated from .env file"
else
    # Generate a new secret if none exists
    if gcloud secrets describe $JWT_SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
        print_status "JWT secret already exists in Secret Manager"
    else
        print_status "No JWT_SECRET in .env, generating new secret..."
        JWT_SECRET_VALUE=$(openssl rand -base64 32)
        echo -n "$JWT_SECRET_VALUE" | gcloud secrets create $JWT_SECRET_NAME \
            --data-file=- \
            --replication-policy="automatic" \
            --project=$PROJECT_ID
        print_status "JWT secret created (consider adding it to backend/.env)"
    fi
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
print_status "Source: $ENV_FILE"
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
print_status "Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo 'N/A')"
echo ""
print_status "View service logs:"
print_status "  gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
echo ""
