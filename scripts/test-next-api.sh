#!/bin/bash

# Test script for the /api/learning-paths/{id}/next endpoint
# This script registers, logs in, creates a learning path, and tests the next step API

BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

echo "================================"
echo "🧪 Testing Learning Path Next API"
echo "================================"

# Step 1: Register new user
echo ""
echo "📝 Step 1: Creating new test user..."
echo "   Email: $TEST_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Register Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract tokens
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken // empty' 2>/dev/null)
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id // empty' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "❌ Failed to register user"
  echo "Trying to login instead..."

  # Try to login if email already exists
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")

  echo "Login Response:"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty' 2>/dev/null)
  USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty' 2>/dev/null)

  if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Both registration and login failed"
    exit 1
  fi
fi

echo ""
echo "✅ Authentication successful"
echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
echo "   User ID: $USER_ID"

# Step 2: Create a learning path
echo ""
echo "📚 Step 2: Creating a learning path..."

CREATE_PATH=$(curl -s -X POST "$API_URL/learning-paths" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "goal": "Learn Python Basics",
    "level": "beginner",
    "topic": "Programming"
  }')

echo "Create Path Response:"
echo "$CREATE_PATH" | jq '.'

PATH_ID=$(echo "$CREATE_PATH" | jq -r '.path.id // empty')

if [ -z "$PATH_ID" ]; then
  echo "❌ Failed to create learning path"
  exit 1
fi

echo "✅ Path created"
echo "   Path ID: $PATH_ID"

# Step 3: Test the next step API
echo ""
echo "🚀 Step 3: Triggering /api/learning-paths/{id}/next endpoint..."
echo "   Endpoint: POST $API_URL/learning-paths/$PATH_ID/next"

NEXT_RESPONSE=$(curl -s -X POST "$API_URL/learning-paths/$PATH_ID/next" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo ""
echo "Next Step Response:"
echo "$NEXT_RESPONSE" | jq '.'

# Check if response has step
STEP=$(echo "$NEXT_RESPONSE" | jq -r '.step // empty')

if [ -n "$STEP" ]; then
  echo ""
  echo "✅ SUCCESS! Next step generated:"
  echo "$STEP" | jq '.'
else
  echo ""
  echo "❌ FAILED! No step returned"
  echo "Full response:"
  echo "$NEXT_RESPONSE"
fi

# Step 4: Check backend logs for errors
echo ""
echo "📋 Step 4: Checking for errors in response..."

ERROR=$(echo "$NEXT_RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
  echo "❌ Error found: $ERROR"
else
  echo "✅ No errors in response"
fi

echo ""
echo "================================"
echo "✅ Test completed!"
echo "================================"
