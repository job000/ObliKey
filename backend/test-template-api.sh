#!/bin/bash

ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOTAyMzA5YS1hNzcxLTQyM2UtODc4MS04NjM1NTIyYTVjOTEiLCJ0ZW5hbnRJZCI6ImI3OWYxYzJhLTdiMTItNGRlZC1hNmY4LWRmMzI3ZDRiZjEwYyIsImVtYWlsIjoiYWRtaW4yQHRlc3Qubm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjIxMTY2OTYsImV4cCI6MTc2MjcyMTQ5Nn0.FqDhXmxrqbyT87LHYzDJxJeZePQ8p440pPDvwclJENA"
CUSTOMER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNTNlZTMxNy0wYzhjLTQzZTUtYTRjMi00MDlhYjU4ODBhZmYiLCJ0ZW5hbnRJZCI6ImI3OWYxYzJhLTdiMTItNGRlZC1hNmY4LWRmMzI3ZDRiZjEwYyIsImVtYWlsIjoidGVzdGt1bmRlQG9ibGlrZXkubm8iLCJyb2xlIjoiQ1VTVE9NRVIiLCJpYXQiOjE3NjIxMTY2OTYsImV4cCI6MTc2MjcyMTQ5Nn0.gDaTm_l7CR7_AWjKVG7cXmVh2eMvl313rah--nar53s"

echo "=== Testing as ADMIN ==="
echo "Fetching templates..."
ADMIN_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/workouts/programs/templates)
echo "$ADMIN_RESPONSE" > /tmp/admin_response.json
cat /tmp/admin_response.json | head -100

echo ""
echo ""
echo "=== Testing as CUSTOMER ==="
echo "Fetching templates..."
CUSTOMER_RESPONSE=$(curl -s -H "Authorization: Bearer $CUSTOMER_TOKEN" http://localhost:3000/api/workouts/programs/templates)
echo "$CUSTOMER_RESPONSE" > /tmp/customer_response.json
cat /tmp/customer_response.json | head -100
