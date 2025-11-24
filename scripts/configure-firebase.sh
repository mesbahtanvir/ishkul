#!/bin/bash

# Auto-configure Firebase config file
# This script fetches Firebase config from the Firebase project and updates firebase.config.ts

set -e

echo "⚙️  Configuring Firebase..."

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

# Get project ID from .firebaserc
if [ ! -f ".firebaserc" ]; then
    print_error ".firebaserc not found"
    exit 1
fi

PROJECT_ID=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)

if [ "$PROJECT_ID" == "YOUR_PROJECT_ID" ] || [ -z "$PROJECT_ID" ]; then
    print_error "Please update .firebaserc with your Firebase project ID"
    exit 1
fi

print_status "Project ID: $PROJECT_ID"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not found. Install: npm install -g firebase-tools"
    exit 1
fi

print_status "Fetching Firebase web app config..."

# Get list of web apps
APPS=$(firebase apps:list WEB --project=$PROJECT_ID 2>/dev/null)

if [ $? -ne 0 ]; then
    print_error "Failed to fetch Firebase apps. Make sure you're logged in: firebase login"
    exit 1
fi

# Try to get the first web app's config
# Note: This requires firebase-tools and proper authentication
print_warning "Manual configuration required:"
echo ""
print_status "Please follow these steps:"
print_status "  1. Go to: https://console.firebase.google.com/project/${PROJECT_ID}/settings/general"
print_status "  2. Scroll to 'Your apps' section"
print_status "  3. If no web app exists, click 'Add app' and select Web"
print_status "  4. Copy the firebaseConfig object values"
print_status "  5. Update firebase/config.ts with these values:"
echo ""
echo "export const firebaseConfig = {"
echo "  apiKey: \"YOUR_API_KEY\","
echo "  authDomain: \"${PROJECT_ID}.firebaseapp.com\","
echo "  projectId: \"${PROJECT_ID}\","
echo "  storageBucket: \"${PROJECT_ID}.appspot.com\","
echo "  messagingSenderId: \"YOUR_MESSAGING_SENDER_ID\","
echo "  appId: \"YOUR_APP_ID\","
echo "};"
echo ""
print_status "Note: These values are safe to commit - they're public identifiers."
print_status "Security is handled by Firestore and Storage rules."
