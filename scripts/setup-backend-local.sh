#!/bin/bash

# Backend Local Development Setup Script
# This script automates the initial setup for local backend development
#
# Usage:
#   ./scripts/setup-backend-local.sh              # Full setup
#   ./scripts/setup-backend-local.sh --no-compose # Skip docker-compose start
#   ./scripts/setup-backend-local.sh --verify     # Only verify setup
#
# What this script does:
#   1. Check prerequisites (Docker, gcloud, git)
#   2. Generate Firebase service account key
#   3. Verify .env file is configured
#   4. Start Docker Compose
#   5. Verify backend is healthy
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Helper functions
print_header() {
    echo -e "${CYAN}$1${NC}"
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_step() {
    echo ""
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_header "  $1"
    print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Parse arguments
SKIP_COMPOSE=false
VERIFY_ONLY=false

for arg in "$@"; do
    case $arg in
        --no-compose) SKIP_COMPOSE=true ;;
        --verify) VERIFY_ONLY=true ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo ""
print_header "════════════════════════════════════════════════════════"
print_header "  Backend Local Development Setup"
print_header "════════════════════════════════════════════════════════"
echo ""

# ============================================
# Check Prerequisites
# ============================================

print_step "Checking Prerequisites"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "  Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_status "Docker installed ($(docker --version))"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    echo "  Usually included with Docker Desktop"
    exit 1
fi
print_status "Docker Compose installed ($(docker-compose --version | head -1))"

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    echo "  Start Docker Desktop and try again"
    exit 1
fi
print_status "Docker daemon is running"

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed"
    echo "  Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
print_status "gcloud CLI installed ($(gcloud --version | head -1))"

# Check gcloud authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    print_error "Not authenticated with gcloud"
    echo "  Run: gcloud auth login"
    exit 1
fi
GCLOUD_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
print_status "Authenticated as: $GCLOUD_ACCOUNT"

# Check project is set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" != "ishkul-org" ]; then
    print_warning "GCP project is not set to ishkul-org"
    echo "  Current project: $PROJECT_ID"
    echo "  Setting project..."
    gcloud config set project ishkul-org
    print_status "Project set to: ishkul-org"
else
    print_status "GCP project: ishkul-org"
fi

# ============================================
# Verify Backend Directory
# ============================================

print_step "Verifying Backend Directory"

if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi
print_status "Backend directory found: $BACKEND_DIR"

if [ ! -f "$BACKEND_DIR/Dockerfile" ]; then
    print_error "Dockerfile not found in backend directory"
    exit 1
fi
print_status "Dockerfile found"

if [ ! -f "$BACKEND_DIR/docker-compose.yml" ]; then
    print_error "docker-compose.yml not found in backend directory"
    exit 1
fi
print_status "docker-compose.yml found"

cd "$BACKEND_DIR"
print_status "Changed to backend directory: $BACKEND_DIR"

# ============================================
# Generate Service Account Key
# ============================================

print_step "Setting Up Firebase Credentials"

if [ -f "serviceAccountKey.json" ]; then
    print_warning "serviceAccountKey.json already exists"
    read -p "Regenerate? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing serviceAccountKey.json"
    else
        print_status "Regenerating service account key..."
        gcloud iam service-accounts keys create serviceAccountKey.json \
            --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com \
            --project=ishkul-org
        print_status "Service account key regenerated"
    fi
else
    print_status "Generating Firebase service account key..."
    gcloud iam service-accounts keys create serviceAccountKey.json \
        --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com \
        --project=ishkul-org
    print_status "Service account key generated: serviceAccountKey.json"
fi

# Verify key exists and is readable
if [ ! -r "serviceAccountKey.json" ]; then
    print_error "serviceAccountKey.json is not readable"
    exit 1
fi
print_status "Service account key is readable"

# ============================================
# Verify Environment Configuration
# ============================================

print_step "Verifying Environment Configuration"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning ".env not found, copying from .env.example"
        cp .env.example .env
        print_status "Created .env from .env.example"
        print_warning "Please review and update .env with your values:"
        print_warning "  - FIREBASE_DATABASE_URL"
        print_warning "  - FIREBASE_STORAGE_BUCKET"
        print_warning "  - ALLOWED_ORIGINS"
        print_warning "  - GOOGLE_WEB_CLIENT_ID"
    else
        print_error ".env and .env.example not found"
        exit 1
    fi
else
    print_status ".env file exists"
fi

# Check for critical variables
CRITICAL_VARS=("FIREBASE_DATABASE_URL" "FIREBASE_STORAGE_BUCKET" "GOOGLE_WEB_CLIENT_ID")
MISSING_VARS=()

for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^$var=" .env; then
        VALUE=$(grep "^$var=" .env | cut -d'=' -f2)
        if [[ "$VALUE" == *"your-"* ]] || [ -z "$VALUE" ]; then
            MISSING_VARS+=("$var (placeholder value)")
        else
            print_status "$var is set"
        fi
    else
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_warning "Some environment variables need to be configured:"
    for var in "${MISSING_VARS[@]}"; do
        print_warning "  - $var"
    done
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please configure .env and try again"
        exit 1
    fi
fi

# ============================================
# Verify Credentials are Protected
# ============================================

print_step "Verifying Security"

if grep -q "serviceAccountKey.json" .gitignore 2>/dev/null; then
    print_status "serviceAccountKey.json is in .gitignore"
else
    print_warning "serviceAccountKey.json may not be protected in .gitignore"
fi

if grep -q "serviceAccountKey.json" .dockerignore 2>/dev/null; then
    print_status "serviceAccountKey.json is in .dockerignore"
else
    print_warning "serviceAccountKey.json may not be protected in .dockerignore"
fi

if [ "$VERIFY_ONLY" = true ]; then
    print_step "Verification Complete"
    print_status "All checks passed"
    echo ""
    echo "To start the backend, run:"
    echo "  docker-compose up -d"
    echo ""
    exit 0
fi

# ============================================
# Start Docker Compose
# ============================================

if [ "$SKIP_COMPOSE" = true ]; then
    print_step "Skipping Docker Compose Startup"
    echo ""
    echo "To start the backend, run:"
    echo "  cd $BACKEND_DIR"
    echo "  docker-compose up -d"
    echo ""
    exit 0
fi

print_step "Building Docker Image"

docker-compose build
if [ $? -ne 0 ]; then
    print_error "Docker build failed"
    exit 1
fi
print_status "Docker image built successfully"

print_step "Starting Backend Service"

docker-compose up -d
if [ $? -ne 0 ]; then
    print_error "Docker Compose startup failed"
    exit 1
fi
print_status "Docker Compose started"

# Wait for service to start
print_status "Waiting for backend to start..."
sleep 3

# ============================================
# Verify Backend Health
# ============================================

print_step "Verifying Backend Health"

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null | grep -o '"status":"healthy"' || echo "")

    if [ -n "$HEALTH" ]; then
        print_status "Backend is healthy"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
        echo -n "."
    fi
    sleep 1
done

if [ -z "$HEALTH" ]; then
    print_warning "Backend health check timed out"
    print_warning "Backend may still be starting, check with:"
    echo "  docker-compose logs -f"
else
    print_status "Backend is responding to requests"
fi

echo ""

# ============================================
# Summary
# ============================================

print_step "Setup Complete!"

echo ""
echo "Your backend is ready for development!"
echo ""
echo "Next steps:"
echo "  1. View logs:"
echo "     docker-compose logs -f"
echo ""
echo "  2. Test the backend:"
echo "     curl http://localhost:8080/health"
echo ""
echo "  3. When done, stop with:"
echo "     docker-compose down"
echo ""
echo "For more information, see:"
echo "  - DEPLOYMENT_GUIDE.md"
echo "  - QUICK_REFERENCE.md"
echo "  - DOCKER_COMPOSE_GUIDE.md"
echo ""

print_header "════════════════════════════════════════════════════════"
echo ""
