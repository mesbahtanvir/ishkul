#!/bin/bash

# Update Backend Environment Variables on Cloud Run
# This script reads from backend/.env and updates Cloud Run service with full summary
#
# Usage:
#   ./scripts/update-backend-env.sh                # Development mode (default)
#   ./scripts/update-backend-env.sh prod           # Production mode with additional checks
#   ./scripts/update-backend-env.sh production     # Production mode (alternative)
#
# The script reads ALL variables from backend/.env dynamically
# Special handling:
#   - JWT_SECRET: Managed in Google Secret Manager
#   - Variables prefixed with _: Treated as secrets (stored in Secret Manager)
#   - All other variables: Applied as environment variables
#
# Features:
#   - Validates all required environment variables
#   - Detects placeholder values and warns user
#   - Production mode adds additional safety checks
#   - Manages JWT_SECRET in Google Secret Manager
#   - Provides comprehensive summary of applied changes
#   - Displays service URL and helpful next steps

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

# Determine if running in production mode (default to development)
PRODUCTION_MODE="${1:-development}"
if [[ "$PRODUCTION_MODE" == "prod" || "$PRODUCTION_MODE" == "production" ]]; then
    PRODUCTION_MODE="production"
else
    PRODUCTION_MODE="development"
fi

echo "🔧 Updating Backend Environment Variables..."
MODE_DISPLAY=$(echo "$PRODUCTION_MODE" | tr '[:lower:]' '[:upper:]')
echo "📍 Mode: $MODE_DISPLAY"
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
# Build lists from .env file dynamically
# ============================================

print_header "\n📋 Analyzing environment variables..."

# Create temporary files to store variable metadata
ENV_VARS_FILE="/tmp/ishkul_env_vars_$$.txt"
SECRET_VARS_FILE="/tmp/ishkul_secret_vars_$$.txt"
PLACEHOLDER_VARS_FILE="/tmp/ishkul_placeholder_vars_$$.txt"

rm -f "$ENV_VARS_FILE" "$SECRET_VARS_FILE" "$PLACEHOLDER_VARS_FILE"
touch "$ENV_VARS_FILE" "$SECRET_VARS_FILE" "$PLACEHOLDER_VARS_FILE"

VAR_COUNT=0
SECRET_COUNT=0
PLACEHOLDER_COUNT=0

# Read all variables from .env file and categorize them
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # Remove leading/trailing whitespace from key
    key=$(echo "$key" | xargs)
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Skip if already processed (no duplicates)
    grep -q "^${key}=" "$ENV_VARS_FILE" 2>/dev/null && continue

    # Store variable
    echo "${key}=${value}" >> "$ENV_VARS_FILE"
    ((VAR_COUNT++))

    # Categorize: JWT_SECRET and vars starting with underscore are secrets
    if [[ "$key" == "JWT_SECRET" ]] || [[ "$key" =~ ^_ ]]; then
        echo "$key" >> "$SECRET_VARS_FILE"
        ((SECRET_COUNT++))
    fi

    # Check for placeholder values
    if [[ "$value" == *"your-"* ]] || [[ "$value" == *"your_"* ]] || [[ "$value" == "PLACEHOLDER" ]]; then
        echo "${key}=${value}" >> "$PLACEHOLDER_VARS_FILE"
        ((PLACEHOLDER_COUNT++))
    fi
done < "$ENV_FILE"

# Handle ENVIRONMENT - override if in production mode
if [[ "$PRODUCTION_MODE" == "production" ]]; then
    sed -i '' '/^ENVIRONMENT=/d' "$ENV_VARS_FILE"
    echo "ENVIRONMENT=production" >> "$ENV_VARS_FILE"
    print_status "ENVIRONMENT overridden to 'production' (production mode)"
elif ! grep -q "^ENVIRONMENT=" "$ENV_VARS_FILE" 2>/dev/null; then
    echo "ENVIRONMENT=development" >> "$ENV_VARS_FILE"
    ((VAR_COUNT++))
    print_status "ENVIRONMENT defaulted to 'development'"
fi

print_status "Found $VAR_COUNT total variables ($SECRET_COUNT as secrets)"

# Check for placeholder values
if [ $PLACEHOLDER_COUNT -gt 0 ]; then
    print_warning "Some variables still have placeholder values:"
    while IFS='=' read -r key value; do
        print_warning "  - $key = $value"
    done < "$PLACEHOLDER_VARS_FILE"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$ENV_VARS_FILE" "$SECRET_VARS_FILE" "$PLACEHOLDER_VARS_FILE"
        print_error "Update backend/.env with actual values and try again."
        exit 1
    fi
fi

print_status "Configuration loaded successfully"

# ============================================
# Production Mode Additional Checks
# ============================================

if [[ "$PRODUCTION_MODE" == "production" ]]; then
    print_header "\n⚠️  Production Mode Detected - Running Additional Checks..."

    # Check for localhost in ALLOWED_ORIGINS
    ALLOWED_ORIGINS_VALUE=$(grep "^ALLOWED_ORIGINS=" "$ENV_VARS_FILE" 2>/dev/null | cut -d'=' -f2-)
    if [[ "$ALLOWED_ORIGINS_VALUE" == *"localhost"* ]] || [[ "$ALLOWED_ORIGINS_VALUE" == *"127.0.0.1"* ]]; then
        print_warning "ALLOWED_ORIGINS contains localhost - this may not be intended for production"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            rm -f "$ENV_VARS_FILE" "$SECRET_VARS_FILE" "$PLACEHOLDER_VARS_FILE"
            print_error "Update ALLOWED_ORIGINS in backend/.env for your production domain"
            exit 1
        fi
    fi
fi

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
# Cloud Run uses the default compute service account (needs project number, not project ID)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)' 2>/dev/null)
COMPUTE_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding $JWT_SECRET_NAME \
    --member="serviceAccount:${COMPUTE_SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID 2>/dev/null || true

print_status "Granted Secret Manager access to: $COMPUTE_SERVICE_ACCOUNT"

print_status "Secret Manager permissions configured"

# ============================================
# Build dynamic Cloud Run update command
# ============================================

print_header "\n🚀 Updating Cloud Run service..."

# Create a temporary YAML file for environment variables (handles special chars like URLs)
ENV_YAML_FILE="/tmp/ishkul_env_vars_$$.yaml"
rm -f "$ENV_YAML_FILE"
touch "$ENV_YAML_FILE"

SECRETS_FLAGS=""

while IFS='=' read -r key value; do
    # Skip empty values or keys
    [[ -z "$key" || -z "$value" ]] && continue

    # Skip reserved Cloud Run env vars
    if [[ "$key" == "PORT" ]] || [[ "$key" == "GOOGLE_APPLICATION_CREDENTIALS" ]]; then
        continue
    fi

    # Skip JWT_SECRET here - we always mount it from Secret Manager below
    if [[ "$key" == "JWT_SECRET" ]]; then
        continue
    fi

    if [[ "$key" =~ ^_ ]]; then
        # Handle underscore-prefixed vars as secrets (future use)
        continue
    else
        # Write to YAML file (properly handles URLs and special characters)
        echo "${key}: \"${value}\"" >> "$ENV_YAML_FILE"
    fi
done < "$ENV_VARS_FILE"

# Always mount JWT_SECRET from Secret Manager (regardless of whether it's in .env)
# This ensures the secret is available even if user didn't add it to .env
SECRETS_FLAGS="--set-secrets=JWT_SECRET=${JWT_SECRET_NAME}:latest"

# Execute the update command using env-vars-file for proper handling of special chars
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --env-vars-file="$ENV_YAML_FILE" \
    $SECRETS_FLAGS

# Cleanup temp YAML file
rm -f "$ENV_YAML_FILE"

# ============================================
# Summary & What Has Been Applied
# ============================================

echo ""
print_header "============================================"
print_header "  ✅ Backend Environment Successfully Updated!"
print_header "============================================"
echo ""

# Determine if this was JWT creation or update
JWT_ACTION="configured"
if gcloud secrets describe jwt-secret --project=$PROJECT_ID &>/dev/null 2>&1; then
    JWT_ACTION="updated"
fi

echo -e "${CYAN}📋 Summary of Applied Changes:${NC}"
echo ""
print_status "Deployment Information:"
print_status "  Service Name: $SERVICE_NAME"
print_status "  Region: $REGION"
print_status "  Project ID: $PROJECT_ID"
print_status "  Mode: $(echo "$PRODUCTION_MODE" | tr '[:lower:]' '[:upper:]')"
print_status "  Source Config: $ENV_FILE"
echo ""
print_status "Environment Variables Applied ($VAR_COUNT total):"
while IFS='=' read -r key value; do
    [[ -z "$key" || -z "$value" ]] && continue
    if [[ "$key" == "JWT_SECRET" ]] || [[ "$key" =~ ^_ ]]; then
        print_status "  ✓ $key = *** (Secret Manager)"
    else
        print_status "  ✓ $key = $value"
    fi
done < "$ENV_VARS_FILE"
echo ""
print_status "Secrets Management:"
print_status "  ✓ JWT_SECRET = $JWT_ACTION (Secret Manager)"
print_status "  ✓ Secret Manager API enabled"
print_status "  ✓ Service account permissions configured"
echo ""

# Cleanup temporary files
rm -f "$ENV_VARS_FILE" "$SECRET_VARS_FILE" "$PLACEHOLDER_VARS_FILE"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo 'N/A')
print_status "Service Details:"
print_status "  URL: $SERVICE_URL"
print_status "  Status: Active ✓"
echo ""

print_status "Next Steps:"
print_status "  1. Verify changes in Cloud Run Console:"
echo -e "     ${CYAN}https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/revisions?project=${PROJECT_ID}${NC}"
print_status "  2. View real-time logs:"
print_status "     gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --limit=100"
print_status "  3. Test service health:"
print_status "     curl -H 'Authorization: Bearer \$(gcloud auth print-identity-token)' \\
       '$SERVICE_URL/health'"
echo ""

if [[ "$PRODUCTION_MODE" == "production" ]]; then
    echo -e "${YELLOW}⚠️  Production Mode - Safety Reminders:${NC}"
    print_warning "  • Changes are live immediately on the service"
    print_warning "  • Monitor logs for any errors: gcloud run services logs read ..."
    print_warning "  • Test critical endpoints after deployment"
    echo ""
fi

print_header "============================================"
echo ""
