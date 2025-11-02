#!/bin/bash

echo "=== Testing Complete PT Picker Flow ==="
echo ""

# Login as admin
echo "1. Logging in as testadmin@otico.no..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@otico.no","password":"Admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test get trainers
echo "2. Testing GET /api/pt/trainers..."
TRAINERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/trainers)
TRAINERS_COUNT=$(echo $TRAINERS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])) if data.get('success') else 0)" 2>/dev/null)

if [ "$TRAINERS_COUNT" = "0" ]; then
  echo "❌ No trainers returned!"
  echo "$TRAINERS_RESPONSE"
  exit 1
fi

echo "✅ Got $TRAINERS_COUNT trainers"
echo ""

# Test get customers
echo "3. Testing GET /api/pt/clients..."
CUSTOMERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/clients)
CUSTOMERS_COUNT=$(echo $CUSTOMERS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])) if data.get('success') else 0)" 2>/dev/null)

if [ "$CUSTOMERS_COUNT" = "0" ]; then
  echo "❌ No customers returned!"
  echo "$CUSTOMERS_RESPONSE"
  exit 1
fi

echo "✅ Got $CUSTOMERS_COUNT customers"
echo ""

echo "=== All Backend Tests Passed! ==="
echo ""
echo "Summary:"
echo "- Login: ✅"
echo "- Get Trainers: ✅ ($TRAINERS_COUNT found)"
echo "- Get Customers: ✅ ($CUSTOMERS_COUNT found)"
echo ""
echo "If the frontend still shows empty lists, the problem is:"
echo "1. Frontend not sending the Authorization header correctly"
echo "2. Frontend using wrong API URL"
echo "3. CORS or network issue between frontend and backend"
echo ""
echo "Next steps:"
echo "1. Open the frontend app"
echo "2. Open browser DevTools (F12) and go to Console tab"
echo "3. Navigate to 'Ny PT-økt' or 'PT-administrasjon'"
echo "4. Look for console.log messages starting with '[CreatePTSession]' or 'Loading trainers and customers...'"
echo "5. Check Network tab for failed API calls"
