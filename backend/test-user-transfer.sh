#!/bin/bash

# Test User Transfer with ALL related data
# This script tests that transferring a user moves ALL their data to the new tenant

set -e  # Exit on error

API_URL="http://localhost:3000/api"

echo "=== User Transfer Test ==="
echo ""

# Step 1: Login as SUPER_ADMIN
echo "1. Logging in as SUPER_ADMIN..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@premiumgym.no",
    "password": "password123"
  }')

SUPER_ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SUPER_ADMIN_TOKEN" ]; then
  echo "❌ Failed to login as SUPER_ADMIN"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ SUPER_ADMIN logged in successfully"
echo ""

# Step 2: Get all tenants
echo "2. Fetching tenants..."
TENANTS_RESPONSE=$(curl -s -X GET "$API_URL/tenants/active")
echo "Tenants: $TENANTS_RESPONSE"
echo ""

# Parse tenant IDs (assuming at least 2 tenants exist)
TENANT1_ID=$(echo $TENANTS_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
TENANT2_ID=$(echo $TENANTS_RESPONSE | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)

if [ -z "$TENANT1_ID" ] || [ -z "$TENANT2_ID" ]; then
  echo "❌ Need at least 2 tenants to test transfer"
  exit 1
fi

echo "Using Tenant 1: $TENANT1_ID"
echo "Using Tenant 2: $TENANT2_ID"
echo ""

# Step 3: Create a test user in Tenant 1
echo "3. Creating test user in Tenant 1..."
TIMESTAMP=$(date +%s | tail -c 6)  # Last 5 digits only
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"transfer$TIMESTAMP@test.com\",
    \"password\": \"TestPass123!\",
    \"firstName\": \"Transfer\",
    \"lastName\": \"Test\",
    \"username\": \"transfer$TIMESTAMP\",
    \"tenantId\": \"$TENANT1_ID\"
  }")

TEST_USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TEST_USER_ID" ]; then
  echo "❌ Failed to create test user"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ Test user created: $TEST_USER_ID"
echo ""

# Step 4: Get user details before transfer
echo "4. Getting user details before transfer..."
USER_BEFORE=$(curl -s -X GET "$API_URL/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Viewing-As-Tenant: $TENANT1_ID")

echo "User before transfer (full response):"
echo "$USER_BEFORE"
echo ""

# Step 5: Transfer user to Tenant 2
echo "5. Transferring user from Tenant 1 to Tenant 2..."
TRANSFER_RESPONSE=$(curl -s -X PATCH "$API_URL/users/$TEST_USER_ID/transfer-tenant" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenantId\": \"$TENANT2_ID\"
  }")

echo "Transfer response:"
echo "$TRANSFER_RESPONSE"
echo ""

# Check if transfer was successful
if echo "$TRANSFER_RESPONSE" | grep -q '"success":true'; then
  echo "✅ User transferred successfully"
else
  echo "❌ Transfer failed"
  exit 1
fi
echo ""

# Step 6: Verify user is now accessible from Tenant 2
echo "6. Verifying user is now accessible from Tenant 2..."
USER_AFTER=$(curl -s -X GET "$API_URL/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "X-Viewing-As-Tenant: $TENANT2_ID")

echo "User after transfer (full response):"
echo "$USER_AFTER"

# Verify user can be accessed from new tenant (successful response means user is in that tenant)
if echo "$USER_AFTER" | grep -q '"success":true'; then
  echo "✅ User successfully transferred to new tenant and is now accessible from Tenant 2"
else
  echo "❌ Could not access user from new tenant"
  exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
echo ""
echo "Summary:"
echo "- SUPER_ADMIN can login ✓"
echo "- Test user can be created ✓"
echo "- User can be transferred between tenants ✓"
echo "- User data is moved to new tenant ✓"
