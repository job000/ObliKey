#!/bin/bash

# Test script for membership screen functionality
# Tests all endpoints used by MembershipProfileScreen

echo "========================================="
echo "Membership Screen API Tests"
echo "========================================="
echo ""

# Generate fresh token for kunde1@test.no
echo "Generating token for kunde1@test.no..."
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({userId: '04dd15b7-5238-467b-92fb-daa95b260e55', tenantId: 'b79f1c2a-7b12-4ded-a6f8-df327d4bf10c', email: 'kunde1@test.no', role: 'CUSTOMER'}, 'your-secret-key-change-this-in-production-make-it-at-least-32-characters-long', {expiresIn: '7d'}));" 2>&1)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate token"
  exit 1
fi

echo "✅ Token generated"
echo ""

# Test 1: GET /api/memberships
echo "=== Test 1: GET /api/memberships ==="
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/memberships)
echo "$RESPONSE" | jq '{
  success,
  membershipCount: (.data | length),
  membership: (.data[0] | {
    id,
    status,
    plan: .plan.name,
    startDate,
    nextBillingDate,
    lastCheckInAt,
    paymentsCount: (.payments | length),
    freezesCount: (.freezes | length)
  })
}'
echo ""

# Save membership ID for further tests
MEMBERSHIP_ID=$(echo "$RESPONSE" | jq -r '.data[0].id')

# Test 2: GET /api/memberships/active-check-in
echo "=== Test 2: GET /api/memberships/active-check-in ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/memberships/active-check-in | jq '{success, hasActiveCheckIn: (.data != null)}'
echo ""

# Test 3: GET /api/memberships/:id/activity
echo "=== Test 3: GET /api/memberships/:id/activity ==="
if [ "$MEMBERSHIP_ID" != "null" ]; then
  curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/memberships/$MEMBERSHIP_ID/activity" | jq '{
    success,
    activity: {
      checkInsCount,
      totalPaid,
      overdueCount: (.overduePayments | length),
      recentCheckInsCount: (.recentCheckIns | length)
    }
  }'
else
  echo "⚠️  No membership found, skipping activity test"
fi
echo ""

# Test 4: POST /api/memberships/check-in
echo "=== Test 4: POST /api/memberships/check-in ==="
if [ "$MEMBERSHIP_ID" != "null" ]; then
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"membershipId\":\"$MEMBERSHIP_ID\",\"location\":\"Test Location\"}" \
    http://localhost:3000/api/memberships/check-in | jq '{success, error}'
else
  echo "⚠️  No membership found, skipping check-in test"
fi
echo ""

# Test 5: GET /api/memberships/active-check-in (after check-in)
echo "=== Test 5: GET /api/memberships/active-check-in (after check-in) ==="
CHECKIN_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/memberships/active-check-in)
echo "$CHECKIN_RESPONSE" | jq '{success, hasActiveCheckIn: (.data != null), checkInId: .data.id}'
CHECKIN_ID=$(echo "$CHECKIN_RESPONSE" | jq -r '.data.id')
echo ""

# Test 6: POST /api/memberships/check-out/:checkInId
echo "=== Test 6: POST /api/memberships/check-out/:checkInId ==="
if [ "$CHECKIN_ID" != "null" ]; then
  curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/api/memberships/check-out/$CHECKIN_ID" | jq '{success, error}'
else
  echo "⚠️  No active check-in, skipping check-out test"
fi
echo ""

# Test 7: Test membership freeze (dry run - don't actually freeze)
echo "=== Test 7: Check freeze endpoint structure ==="
echo "Note: Not actually freezing to avoid affecting test data"
echo "Endpoint: POST /api/memberships/:id/freeze"
echo "Expected body: {startDate, endDate, reason}"
echo ""

echo "========================================="
echo "Tests Complete"
echo "========================================="
