#!/bin/bash

echo "========================================="
echo "🧪 Testing PT Credit System"
echo "========================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000/api"
TENANT_ID="b79f1c2a-7b12-4ded-a6f8-df327d4bf10c" # oblikey-demo
CUSTOMER_EMAIL="testkunde@oblikey.no"
CUSTOMER_PASSWORD="Test1234"

echo "Step 1: Login as customer (testkunde@oblikey.no)"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": \"$CUSTOMER_EMAIL\",
    \"password\": \"$CUSTOMER_PASSWORD\",
    \"tenantId\": \"$TENANT_ID\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Logged in successfully"
echo "User ID: $USER_ID"
echo ""

echo "Step 2: Check initial PT credits"
echo "-------------------------------------------"
INITIAL_CREDITS=$(curl -s -X GET "$BASE_URL/pt/credits" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$INITIAL_CREDITS" | jq '.'
AVAILABLE=$(echo $INITIAL_CREDITS | jq -r '.data.available')
echo "Available credits: $AVAILABLE"
echo ""

echo "Step 3: Get PT package products"
echo "-------------------------------------------"
PRODUCTS=$(curl -s -X GET "$BASE_URL/products?type=PT_SERVICE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$PRODUCTS" | jq '.data[] | {id, name, price, sessionCount, validityDays}'
PRODUCT_ID=$(echo $PRODUCTS | jq -r '.data[0].id')
PRODUCT_NAME=$(echo $PRODUCTS | jq -r '.data[0].name')
SESSION_COUNT=$(echo $PRODUCTS | jq -r '.data[0].sessionCount')

if [ "$PRODUCT_ID" = "null" ] || [ -z "$PRODUCT_ID" ]; then
  echo "❌ No PT package products found!"
  exit 1
fi

echo ""
echo "Selected product: $PRODUCT_NAME (ID: $PRODUCT_ID)"
echo "Sessions in package: $SESSION_COUNT"
echo ""

echo "Step 4: Create order with PT package"
echo "-------------------------------------------"
ORDER=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID\",
      \"quantity\": 1
    }]
  }")

ORDER_ID=$(echo $ORDER | jq -r '.data.id')
ORDER_NUMBER=$(echo $ORDER | jq -r '.data.orderNumber')
ORDER_STATUS=$(echo $ORDER | jq -r '.data.status')

if [ "$ORDER_ID" = "null" ] || [ -z "$ORDER_ID" ]; then
  echo "❌ Order creation failed!"
  echo "$ORDER" | jq '.'
  exit 1
fi

echo "✅ Order created: $ORDER_NUMBER (ID: $ORDER_ID)"
echo "$ORDER" | jq '.data | {id, orderNumber, status, total}'
echo "Order status: $ORDER_STATUS"
echo ""

echo "Step 5: Complete the order (trigger credit allocation)"
echo "-------------------------------------------"
if [ "$ORDER_STATUS" = "COMPLETED" ]; then
  echo "✅ Order already completed - credits should already be granted!"
else
  COMPLETE_ORDER=$(curl -s -X PATCH "$BASE_URL/orders/$ORDER_ID/status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"status\": \"COMPLETED\"
    }")

  echo "$COMPLETE_ORDER" | jq '.'
fi
echo ""

echo "Step 6: Check credits after purchase"
echo "-------------------------------------------"
sleep 2 # Give it a moment to process
UPDATED_CREDITS=$(curl -s -X GET "$BASE_URL/pt/credits" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$UPDATED_CREDITS" | jq '.'
NEW_AVAILABLE=$(echo $UPDATED_CREDITS | jq -r '.data.available')
echo ""
echo "Credits before: $AVAILABLE"
echo "Credits after purchase: $NEW_AVAILABLE"
echo "Expected increase: $SESSION_COUNT"

if [ "$NEW_AVAILABLE" -gt "$AVAILABLE" ]; then
  echo "✅ Credits granted successfully! (+$(($NEW_AVAILABLE - $AVAILABLE)))"
else
  echo "❌ Credits were not granted!"
  exit 1
fi
echo ""

echo "Step 7: Get available trainers"
echo "-------------------------------------------"
TRAINERS=$(curl -s -X GET "$BASE_URL/pt/trainers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$TRAINERS" | jq '.data[] | {id, firstName, lastName, email, role}'
TRAINER_ID=$(echo $TRAINERS | jq -r '.data[] | select(.role == "TRAINER") | .id' | head -1)
TRAINER_NAME=$(echo $TRAINERS | jq -r '.data[] | select(.role == "TRAINER") | .firstName + " " + .lastName' | head -1)

if [ "$TRAINER_ID" = "null" ] || [ -z "$TRAINER_ID" ]; then
  echo "❌ No trainers available!"
  exit 1
fi

echo ""
echo "Selected trainer: $TRAINER_NAME (ID: $TRAINER_ID)"
echo ""

echo "Step 8: Book a PT session (should use 1 credit)"
echo "-------------------------------------------"
# Create a session 3 days from now at 10:00-11:00
START_TIME=$(date -u -v+3d -v10H -v0M -v0S +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+3 days 10:00:00" +"%Y-%m-%dT%H:%M:%S.000Z")
END_TIME=$(date -u -v+3d -v11H -v0M -v0S +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+3 days 11:00:00" +"%Y-%m-%dT%H:%M:%S.000Z")

BOOKING=$(curl -s -X POST "$BASE_URL/pt/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trainerId\": \"$TRAINER_ID\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"title\": \"Test PT Session\",
    \"description\": \"Testing PT credit system\",
    \"location\": \"Gym\"
  }")

SESSION_ID=$(echo $BOOKING | jq -r '.data.id')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
  echo "❌ PT session booking failed!"
  echo "$BOOKING" | jq '.'
  exit 1
fi

echo "✅ PT session booked successfully!"
echo "$BOOKING" | jq '.data | {id, startTime, status, trainer: .trainer.firstName}'
echo ""

echo "Step 9: Verify credits were deducted"
echo "-------------------------------------------"
FINAL_CREDITS=$(curl -s -X GET "$BASE_URL/pt/credits" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$FINAL_CREDITS" | jq '.'
FINAL_AVAILABLE=$(echo $FINAL_CREDITS | jq -r '.data.available')
echo ""
echo "Credits after purchase: $NEW_AVAILABLE"
echo "Credits after booking: $FINAL_AVAILABLE"
echo "Expected deduction: 1"

if [ "$FINAL_AVAILABLE" -eq "$(($NEW_AVAILABLE - 1))" ]; then
  echo "✅ Credit deducted successfully! (-1)"
else
  echo "❌ Credit deduction did not work as expected!"
  echo "Expected: $(($NEW_AVAILABLE - 1)), Got: $FINAL_AVAILABLE"
  exit 1
fi
echo ""

echo "========================================="
echo "✅ ALL TESTS PASSED!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Initial credits: $AVAILABLE"
echo "- Purchased package: $PRODUCT_NAME ($SESSION_COUNT sessions)"
echo "- Credits after purchase: $NEW_AVAILABLE"
echo "- Booked 1 PT session with $TRAINER_NAME"
echo "- Final credits: $FINAL_AVAILABLE"
echo ""
echo "✅ PT Credit System working perfectly!"
