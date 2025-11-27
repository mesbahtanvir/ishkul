#!/bin/bash

# Update Cloud Run Backend Environment Variables
# Usage: ./scripts/update-backend-env.sh
# Or with custom values: ./scripts/update-backend-env.sh --firebase-db-url "..." --storage-bucket "..." --environment "staging"

set -e

# Default values (from cloudbuild.yaml)
FIREBASE_DATABASE_URL="https://ishkul-org.firebaseio.com"
FIREBASE_STORAGE_BUCKET="https://ishkul-org-default-rtdb.firebaseio.com/"
ENVIRONMENT="production"
REGION="europe-west1"
SERVICE_NAME="ishkul-backend"
PROJECT_ID="${GCP_PROJECT_ID:-ishkul-org}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --firebase-db-url)
      FIREBASE_DATABASE_URL="$2"
      shift 2
      ;;
    --storage-bucket)
      FIREBASE_STORAGE_BUCKET="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --project-id)
      PROJECT_ID="$2"
      shift 2
      ;;
    --help)
      echo "Update Cloud Run Backend Environment Variables"
      echo ""
      echo "Usage: ./scripts/update-backend-env.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --firebase-db-url URL           Firebase Realtime Database URL"
      echo "  --storage-bucket BUCKET         Firebase Storage Bucket"
      echo "  --environment ENV               Environment (development/staging/production)"
      echo "  --region REGION                 GCP Region (default: europe-west1)"
      echo "  --service-name NAME             Cloud Run Service Name (default: ishkul-backend)"
      echo "  --project-id PROJECT            GCP Project ID (default: ishkul-org)"
      echo "  --help                          Show this help message"
      echo ""
      echo "Examples:"
      echo "  # Update with defaults from cloudbuild.yaml"
      echo "  ./scripts/update-backend-env.sh"
      echo ""
      echo "  # Update staging environment"
      echo "  ./scripts/update-backend-env.sh --environment staging"
      echo ""
      echo "  # Update with custom Firebase URL"
      echo "  ./scripts/update-backend-env.sh --firebase-db-url https://my-db.firebaseio.com"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Verify gcloud is authenticated
echo "🔐 Checking GCP authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"

# Set the project
echo "📦 Setting GCP Project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

if [ $? -ne 0 ]; then
  echo "❌ Failed to set project. Make sure the project ID is correct."
  exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project)
echo "✅ Project set to: $CURRENT_PROJECT"

# Display values to be updated
echo ""
echo "📋 Environment Variables to Update:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Service:                  $SERVICE_NAME"
echo "Region:                   $REGION"
echo "Project:                  $PROJECT_ID"
echo ""
echo "Variables:"
echo "  FIREBASE_DATABASE_URL:    $FIREBASE_DATABASE_URL"
echo "  FIREBASE_STORAGE_BUCKET:  $FIREBASE_STORAGE_BUCKET"
echo "  ENVIRONMENT:              $ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Confirm before updating
read -p "Update environment variables? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Update cancelled"
  exit 0
fi

# Update Cloud Run service
echo ""
echo "🚀 Updating Cloud Run service..."
echo "Command: gcloud run services update $SERVICE_NAME \\"
echo "  --region=$REGION \\"
echo "  --set-env-vars=FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL,FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET,ENVIRONMENT=$ENVIRONMENT \\"
echo "  --project=$PROJECT_ID"
echo ""

gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --set-env-vars="FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL,FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET,ENVIRONMENT=$ENVIRONMENT" \
  --project="$PROJECT_ID"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Environment variables updated successfully!"
  echo ""
  echo "📍 Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)')"
  echo ""
  echo "💡 Tip: It may take a few seconds for the new environment variables to take effect."
else
  echo "❌ Failed to update environment variables"
  exit 1
fi
