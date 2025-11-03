#!/bin/bash

ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOTAyMzA5YS1hNzcxLTQyM2UtODc4MS04NjM1NTIyYTVjOTEiLCJ0ZW5hbnRJZCI6ImI3OWYxYzJhLTdiMTItNGRlZC1hNmY4LWRmMzI3ZDRiZjEwYyIsImVtYWlsIjoiYWRtaW4yQHRlc3Qubm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjIxMTY2OTYsImV4cCI6MTc2MjcyMTQ5Nn0.FqDhXmxrqbyT87LHYzDJxJeZePQ8p440pPDvwclJENA"
CUSTOMER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNTNlZTMxNy0wYzhjLTQzZTUtYTRjMi00MDlhYjU4ODBhZmYiLCJ0ZW5hbnRJZCI6ImI3OWYxYzJhLTdiMTItNGRlZC1hNmY4LWRmMzI3ZDRiZjEwYyIsImVtYWlsIjoidGVzdGt1bmRlQG9ibGlrZXkubm8iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjIxMTY2OTYsImV4cCI6MTc2MjcyMTQ5Nn0.gDaTm_l7CR7_AWjKVG7cXmVh2eMvl313rah--nar53s"

echo "=== ADMIN: Henter alle templates ==="
ADMIN_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/workouts/programs/templates)
ADMIN_COUNT=$(echo "$ADMIN_RESPONSE" | grep -o '"name":"' | wc -l | tr -d ' ')
echo "ADMIN ser $ADMIN_COUNT templates"

echo ""
echo "=== CUSTOMER: Henter kun synlige templates ==="
CUSTOMER_RESPONSE=$(curl -s -H "Authorization: Bearer $CUSTOMER_TOKEN" http://localhost:3000/api/workouts/programs/templates)
CUSTOMER_COUNT=$(echo "$CUSTOMER_RESPONSE" | grep -o '"name":"' | wc -l | tr -d ' ')
echo "CUSTOMER ser $CUSTOMER_COUNT templates"

echo ""
echo "=== Verifiserer at CUSTOMER ikke ser HIIT template ==="
if echo "$CUSTOMER_RESPONSE" | grep -q "HIIT - Fettforbrenning"; then
  echo "❌ FEIL: CUSTOMER ser skjult template!"
else
  echo "✅ OK: CUSTOMER ser IKKE skjult template"
fi

echo ""
echo "=== Verifiserer at ADMIN fortsatt ser HIIT template ==="
if echo "$ADMIN_RESPONSE" | grep -q "HIIT - Fettforbrenning"; then
  echo "✅ OK: ADMIN ser skjult template"
else
  echo "❌ FEIL: ADMIN ser IKKE skjult template!"
fi

echo ""
echo "=== Oppsummering ==="
echo "Templates synlige for ADMIN: $ADMIN_COUNT"
echo "Templates synlige for CUSTOMER: $CUSTOMER_COUNT"
echo "Differanse: $((ADMIN_COUNT - CUSTOMER_COUNT)) (skal være 1)"
