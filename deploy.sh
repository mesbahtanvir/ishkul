#!/bin/bash

# Ishkul One-Command Deployment Script
# This script deploys both frontend and backend to Firebase/Google Cloud

set -e  # Exit on error

echo "🚀 Starting Ishkul Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."

    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI not found. Install it with: npm install -g firebase-tools"
        exit 1
    fi

    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Install Node.js from: https://nodejs.org/"
        exit 1
    fi

    if ! command -v go &> /dev/null; then
        print_error "Go not found. Install from: https://golang.org/dl/"
        exit 1
    fi

    print_status "All requirements met ✓"
}

# Get project configuration
get_config() {
    print_status "Loading configuration..."

    # Check if .firebaserc exists and has project ID
    if [ ! -f ".firebaserc" ]; then
        print_error ".firebaserc not found. Run: firebase init"
        exit 1
    fi

    PROJECT_ID=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)

    if [ "$PROJECT_ID" == "YOUR_PROJECT_ID" ] || [ -z "$PROJECT_ID" ]; then
        print_error "Firebase project not configured. Please update .firebaserc with your project ID"
        exit 1
    fi

    print_status "Project ID: $PROJECT_ID"

    # Set region (can be customized)
    REGION="${REGION:-us-central1}"
    print_status "Region: $REGION"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."

    cd frontend

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi

    # Build for web
    print_status "Building Expo web app..."
    npm run build

    cd ..

    print_status "Frontend build complete ✓"
}

# Deploy frontend to Firebase Hosting
deploy_frontend() {
    print_status "Deploying frontend to Firebase Hosting..."

    firebase deploy --only hosting

    print_status "Frontend deployed ✓"
}

# Build backend
build_backend() {
    print_status "Building backend Docker image..."

    cd backend

    # Build and submit to Google Cloud Build
    gcloud builds submit --tag gcr.io/$PROJECT_ID/ishkul-backend .

    cd ..

    print_status "Backend build complete ✓"
}

# Deploy backend to Cloud Run
deploy_backend() {
    print_status "Deploying backend to Cloud Run..."

    # Get storage bucket name (usually project-id.appspot.com)
    STORAGE_BUCKET="${PROJECT_ID}.appspot.com"

    # Get frontend URL for CORS
    FRONTEND_URL="https://${PROJECT_ID}.web.app"

    # Check if secrets exist in Secret Manager
    if gcloud secrets describe firebase-service-account --project=$PROJECT_ID &>/dev/null; then
        print_status "Using Firebase credentials from Secret Manager"
        SECRET_MOUNT="firebase-service-account=firebase-credentials:latest"
    else
        print_warning "Firebase service account not found in Secret Manager"
        print_warning "Run: ./scripts/setup-secrets.sh to configure secrets"
        SECRET_MOUNT=""
    fi

    # Deploy to Cloud Run with secrets
    if [ -n "$SECRET_MOUNT" ]; then
        gcloud run deploy ishkul-backend \
            --image gcr.io/$PROJECT_ID/ishkul-backend \
            --platform managed \
            --region $REGION \
            --allow-unauthenticated \
            --set-env-vars "FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}" \
            --set-env-vars "ALLOWED_ORIGINS=${FRONTEND_URL},https://${PROJECT_ID}.firebaseapp.com" \
            --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-credentials" \
            --set-secrets "/secrets/firebase-credentials=${SECRET_MOUNT}" \
            --project $PROJECT_ID
    else
        # Deploy without secrets (will use default service account)
        gcloud run deploy ishkul-backend \
            --image gcr.io/$PROJECT_ID/ishkul-backend \
            --platform managed \
            --region $REGION \
            --allow-unauthenticated \
            --set-env-vars "FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}" \
            --set-env-vars "ALLOWED_ORIGINS=${FRONTEND_URL},https://${PROJECT_ID}.firebaseapp.com" \
            --project $PROJECT_ID
    fi

    # Get the backend URL
    BACKEND_URL=$(gcloud run services describe ishkul-backend \
        --region $REGION \
        --format 'value(status.url)' \
        --project $PROJECT_ID)

    print_status "Backend deployed ✓"
    print_status "Backend URL: $BACKEND_URL"
}

# Deploy Firestore rules and indexes
deploy_firestore() {
    print_status "Deploying Firestore rules and indexes..."

    firebase deploy --only firestore

    print_status "Firestore configuration deployed ✓"
}

# Deploy Storage rules
deploy_storage() {
    print_status "Deploying Storage rules..."

    firebase deploy --only storage

    print_status "Storage configuration deployed ✓"
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Ishkul Deployment Script             ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    # Check requirements
    check_requirements

    # Get configuration
    get_config

    # Ask for confirmation
    echo ""
    print_warning "This will deploy to project: $PROJECT_ID"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi

    # Build and deploy
    echo ""
    print_status "Step 1/6: Building frontend..."
    build_frontend

    echo ""
    print_status "Step 2/6: Deploying frontend..."
    deploy_frontend

    echo ""
    print_status "Step 3/6: Building backend..."
    build_backend

    echo ""
    print_status "Step 4/6: Deploying backend..."
    deploy_backend

    echo ""
    print_status "Step 5/6: Deploying Firestore..."
    deploy_firestore

    echo ""
    print_status "Step 6/6: Deploying Storage..."
    deploy_storage

    # Summary
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Deployment Complete! 🎉              ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    print_status "Frontend URL: https://${PROJECT_ID}.web.app"
    print_status "Backend URL: $BACKEND_URL"
    echo ""
    print_status "Next steps:"
    echo "  1. Update frontend/.env with EXPO_PUBLIC_API_URL=${BACKEND_URL}/api"
    echo "  2. Rebuild and redeploy frontend if API URL changed"
    echo "  3. Test your application"
    echo ""
}

# Run main function
main
