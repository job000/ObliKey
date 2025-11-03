#!/bin/bash

# Script to create test users in Railway production via API

API_URL="https://oblikey-production.up.railway.app/api"

echo "========================================"
echo "Creating Test Users in Railway Production"
echo "========================================"
echo ""

# First, we need to login as SUPER_ADMIN to get a token
echo "1. Logging in as SUPER_ADMIN..."
SUPER_ADMIN_LOGIN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sa@otico.no",
    "password": "SuperAdmin123!"
  }')

TOKEN=$(echo $SUPER_ADMIN_LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
TENANT_ID=$(echo $SUPER_ADMIN_LOGIN | grep -o '"tenantId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get SUPER_ADMIN token"
  echo "Response: $SUPER_ADMIN_LOGIN"
  exit 1
fi

echo "✅ SUPER_ADMIN token acquired"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Create test users
echo "2. Creating test users..."
echo ""

# Admin 1
echo "Creating admin1@test.no..."
curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"admin1@test.no\",
    \"password\": \"Password123!\",
    \"firstName\": \"Admin\",
    \"lastName\": \"1\",
    \"phone\": \"+47 123 45 003\",
    \"role\": \"ADMIN\"
  }" | python3 -m json.tool 2>/dev/null || echo "Response received"

echo ""

# Admin 2
echo "Creating admin2@test.no..."
curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"admin2@test.no\",
    \"password\": \"Password123!\",
    \"firstName\": \"Admin\",
    \"lastName\": \"2\",
    \"phone\": \"+47 123 45 004\",
    \"role\": \"ADMIN\"
  }" | python3 -m json.tool 2>/dev/null || echo "Response received"

echo ""

# Customer 1
echo "Creating kunde1@test.no..."
curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"kunde1@test.no\",
    \"password\": \"Password123!\",
    \"firstName\": \"Kunde\",
    \"lastName\": \"1\",
    \"phone\": \"+47 123 45 001\"
  }" | python3 -m json.tool 2>/dev/null || echo "Response received"

echo ""

# Customer 2
echo "Creating kunde2@test.no..."
curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d "{
    \"tenantId\": \"$TENANT_ID\",
    \"email\": \"kunde2@test.no\",
    \"password\": \"Password123!\",
    \"firstName\": \"Kunde\",
    \"lastName\": \"2\",
    \"phone\": \"+47 123 45 002\"
  }" | python3 -m json.tool 2>/dev/null || echo "Response received"

echo ""
echo "========================================"
echo "✅ Test users creation completed!"
echo "========================================"
echo ""
echo "You can now login with:"
echo ""
echo "SUPER_ADMIN:"
echo "  Email: sa@otico.no"
echo "  Password: SuperAdmin123!"
echo ""
echo "ADMIN:"
echo "  Email: admin1@test.no or admin2@test.no"
echo "  Password: Password123!"
echo ""
echo "CUSTOMER:"
echo "  Email: kunde1@test.no or kunde2@test.no"
echo "  Password: Password123!"
echo ""
