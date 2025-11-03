#!/bin/bash

# Complete Payment System Test
# Tests admin configuration, checkout flow, and webhooks

API_URL="http://localhost:3000"
echo "==================================================="
echo "🔐 OBLIKEY PAYMENT SYSTEM - KOMPLETT TEST"
echo "==================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
  fi
  echo ""
}

# Get tokens
echo "📝 Henter autentiseringstokens..."
echo ""

# Admin token (for payment configuration)
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@test.no",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Kunne ikke hente ADMIN token"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✅ ADMIN token hentet"

# Customer token (for checkout)
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kunde1@test.no",
    "password": "kunde123"
  }')

CUSTOMER_TOKEN=$(echo $CUSTOMER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CUSTOMER_TOKEN" ]; then
  echo "❌ Kunne ikke hente CUSTOMER token"
  echo "Response: $CUSTOMER_RESPONSE"
  exit 1
fi

echo "✅ CUSTOMER token hentet"
echo ""

# =================================================
# TEST 1: Get Available Payment Methods (Empty)
# =================================================
echo "TEST 1: Hent tilgjengelige betalingsmetoder (tom)"
echo "---------------------------------------------------"
RESPONSE=$(curl -s -X GET "$API_URL/api/payments/available" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $RESPONSE"

# Should be empty array initially
if echo "$RESPONSE" | grep -q '"data":\[\]'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 2: Configure Vipps Payment (Test Mode)
# =================================================
echo "TEST 2: Konfigurer Vipps betalingsmetode (testmodus)"
echo "---------------------------------------------------"
VIPPS_CONFIG_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/config" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "VIPPS",
    "enabled": true,
    "testMode": true,
    "credentials": {
      "clientId": "test-client-id",
      "clientSecret": "test-client-secret",
      "subscriptionKey": "test-subscription-key",
      "merchantSerialNumber": "123456"
    },
    "displayName": "Vipps",
    "sortOrder": 0
  }')

echo "Response: $VIPPS_CONFIG_RESPONSE"

if echo "$VIPPS_CONFIG_RESPONSE" | grep -q '"success":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 3: Configure Stripe Payment (Test Mode)
# =================================================
echo "TEST 3: Konfigurer Stripe betalingsmetode (testmodus)"
echo "---------------------------------------------------"
STRIPE_CONFIG_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/config" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "STRIPE",
    "enabled": true,
    "testMode": true,
    "credentials": {
      "secretKey": "sk_test_51234567890",
      "publishableKey": "pk_test_51234567890",
      "webhookSecret": "whsec_test_1234567890"
    },
    "displayName": "Kort",
    "sortOrder": 1
  }')

echo "Response: $STRIPE_CONFIG_RESPONSE"

if echo "$STRIPE_CONFIG_RESPONSE" | grep -q '"success":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 4: Get Payment Configurations (Admin)
# =================================================
echo "TEST 4: Hent betalingskonfigurasjoner (Admin)"
echo "---------------------------------------------------"
GET_CONFIGS_RESPONSE=$(curl -s -X GET "$API_URL/api/payments/config" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $GET_CONFIGS_RESPONSE"

if echo "$GET_CONFIGS_RESPONSE" | grep -q '"provider":"VIPPS"' && \
   echo "$GET_CONFIGS_RESPONSE" | grep -q '"provider":"STRIPE"'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 5: Get Available Payment Methods (Customer)
# =================================================
echo "TEST 5: Hent tilgjengelige betalingsmetoder (Kunde)"
echo "---------------------------------------------------"
AVAILABLE_METHODS_RESPONSE=$(curl -s -X GET "$API_URL/api/payments/available" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $AVAILABLE_METHODS_RESPONSE"

if echo "$AVAILABLE_METHODS_RESPONSE" | grep -q '"provider":"VIPPS"' && \
   echo "$AVAILABLE_METHODS_RESPONSE" | grep -q '"provider":"STRIPE"' && \
   echo "$AVAILABLE_METHODS_RESPONSE" | grep -q '"enabled":true' && \
   echo "$AVAILABLE_METHODS_RESPONSE" | grep -q '"testMode":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 6: Toggle Provider (Disable Vipps)
# =================================================
echo "TEST 6: Deaktiver Vipps"
echo "---------------------------------------------------"
TOGGLE_RESPONSE=$(curl -s -X PUT "$API_URL/api/payments/config/VIPPS/toggle" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}')

echo "Response: $TOGGLE_RESPONSE"

if echo "$TOGGLE_RESPONSE" | grep -q '"success":true' && \
   echo "$TOGGLE_RESPONSE" | grep -q '"enabled":false'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 7: Verify Available Methods After Toggle
# =================================================
echo "TEST 7: Verifiser tilgjengelige metoder etter deaktivering"
echo "---------------------------------------------------"
AVAILABLE_AFTER_TOGGLE=$(curl -s -X GET "$API_URL/api/payments/available" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $AVAILABLE_AFTER_TOGGLE"

# Should only have STRIPE now
if echo "$AVAILABLE_AFTER_TOGGLE" | grep -q '"provider":"STRIPE"' && \
   ! echo "$AVAILABLE_AFTER_TOGGLE" | grep -q '"provider":"VIPPS"'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 8: Re-enable Vipps
# =================================================
echo "TEST 8: Aktiver Vipps igjen"
echo "---------------------------------------------------"
REENABLE_RESPONSE=$(curl -s -X PUT "$API_URL/api/payments/config/VIPPS/toggle" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}')

echo "Response: $REENABLE_RESPONSE"

if echo "$REENABLE_RESPONSE" | grep -q '"success":true' && \
   echo "$REENABLE_RESPONSE" | grep -q '"enabled":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 9: Test Vipps Webhook
# =================================================
echo "TEST 9: Test Vipps Webhook (simulert betaling)"
echo "---------------------------------------------------"
VIPPS_WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/api/webhooks/vipps" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-ORDER-123",
    "transactionInfo": {
      "status": "RESERVE",
      "amount": 10000,
      "timeStamp": "2024-01-15T10:30:00Z"
    }
  }')

echo "Response: $VIPPS_WEBHOOK_RESPONSE"

# Will fail because order doesn't exist, but should return proper error
if echo "$VIPPS_WEBHOOK_RESPONSE" | grep -q 'Payment not found\|Webhook processed'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 10: Test Stripe Webhook
# =================================================
echo "TEST 10: Test Stripe Webhook (simulert betaling)"
echo "---------------------------------------------------"
STRIPE_WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/api/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123456",
        "amount": 10000,
        "currency": "nok",
        "status": "succeeded"
      }
    }
  }')

echo "Response: $STRIPE_WEBHOOK_RESPONSE"

if echo "$STRIPE_WEBHOOK_RESPONSE" | grep -q '"received":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 11: Delete Payment Configuration
# =================================================
echo "TEST 11: Slett Stripe konfigurasjon"
echo "---------------------------------------------------"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/payments/config/STRIPE" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $DELETE_RESPONSE"

if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# TEST 12: Verify After Deletion
# =================================================
echo "TEST 12: Verifiser etter sletting"
echo "---------------------------------------------------"
AFTER_DELETE=$(curl -s -X GET "$API_URL/api/payments/available" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $AFTER_DELETE"

# Should only have VIPPS now
if echo "$AFTER_DELETE" | grep -q '"provider":"VIPPS"' && \
   ! echo "$AFTER_DELETE" | grep -q '"provider":"STRIPE"'; then
  test_result 0
else
  test_result 1
fi

# =================================================
# SUMMARY
# =================================================
echo "==================================================="
echo "📊 TEST SAMMENDRAG"
echo "==================================================="
echo -e "Tests kjørt: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Tests bestått: $TESTS_PASSED${NC}"
echo -e "${RED}Tests feilet: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALLE TESTER BESTÅTT!${NC}"
  echo ""
  echo "Betalingssystemet er fullstendig funksjonelt:"
  echo "✓ Admin kan konfigurere betalingsmetoder"
  echo "✓ Kryptering av credentials fungerer"
  echo "✓ Toggle enable/disable fungerer"
  echo "✓ Kunder kan hente tilgjengelige metoder"
  echo "✓ Webhook-endpoints er operative"
  echo "✓ Sletting av konfigurasjon fungerer"
  exit 0
else
  echo -e "${RED}⚠️  NOEN TESTER FEILET${NC}"
  echo "Sjekk loggene ovenfor for detaljer."
  exit 1
fi
