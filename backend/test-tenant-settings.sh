#!/bin/bash

echo "🧪 Testing Tenant Settings API"
echo ""

# Login
echo "1. Logging in..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@oblikey.no","password":"Admin123"}' > /tmp/settings_login.json

TOKEN=$(cat /tmp/settings_login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  cat /tmp/settings_login.json
  exit 1
fi

echo "✅ Logged in"
echo ""

# Get current settings
echo "2. Getting current settings..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tenant-settings > /tmp/settings_get.json

cat /tmp/settings_get.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print('✅ GET successful')
    settings = data.get('data', {})
    print(f\"   businessHoursStart: {settings.get('businessHoursStart')}\")
    print(f\"   currency: {settings.get('currency')}\")
    print(f\"   companyVatNumber: {settings.get('companyVatNumber')}\")
else:
    print('❌ GET failed')
    print(data)
"
echo ""

# Try to update settings
echo "3. Updating settings..."
curl -s -X PATCH http://localhost:3000/api/tenant-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessHoursStart": "07:00",
    "businessHoursEnd": "23:00",
    "bookingCancellation": 48,
    "maxBookingsPerUser": 15,
    "requirePayment": true,
    "currency": "NOK",
    "timezone": "Europe/Oslo",
    "emailNotifications": true,
    "smsNotifications": false,
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981",
    "companyVatNumber": "NO123456789MVA",
    "companyRegNumber": "123456789"
  }' > /tmp/settings_update.json

cat /tmp/settings_update.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print('✅ PATCH successful')
    settings = data.get('data', {})
    print(f\"   businessHoursStart: {settings.get('businessHoursStart')}\")
    print(f\"   currency: {settings.get('currency')}\")
    print(f\"   companyVatNumber: {settings.get('companyVatNumber')}\")
else:
    print('❌ PATCH failed')
    print('Error:', data.get('error'))
    print('Full response:', data)
"
echo ""

echo "✅ Test complete"
