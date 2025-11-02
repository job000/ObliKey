#!/bin/bash

echo "==================================="
echo "🧪 TESTING PT SESSION COMPLETE FLOW"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Login as admin
echo "📝 Step 1: Logging in as testadmin@otico.no..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@otico.no","password":"Admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test get trainers
echo "📝 Step 2: Testing GET /api/pt/trainers..."
TRAINERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/trainers)
echo "$TRAINERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    trainers = data.get('data', [])
    print(f'✅ Found {len(trainers)} trainers')
    if len(trainers) > 0:
        print(f'   First trainer: {trainers[0][\"firstName\"]} {trainers[0][\"lastName\"]} ({trainers[0][\"email\"]})')
        print(f'   Trainer ID: {trainers[0][\"id\"]}')
        # Save first trainer ID for later use
        with open('/tmp/trainer_id.txt', 'w') as f:
            f.write(trainers[0]['id'])
else:
    print('❌ Failed to get trainers')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

# Test get customers
echo "📝 Step 3: Testing GET /api/pt/clients..."
CUSTOMERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/clients)
echo "$CUSTOMERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    customers = data.get('data', [])
    print(f'✅ Found {len(customers)} customers')
    if len(customers) > 0:
        print(f'   First customer: {customers[0][\"firstName\"]} {customers[0][\"lastName\"]} ({customers[0][\"email\"]})')
        print(f'   Customer ID: {customers[0][\"id\"]}')
        # Save first customer ID for later use
        with open('/tmp/customer_id.txt', 'w') as f:
            f.write(customers[0]['id'])
else:
    print('❌ Failed to get customers')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

# Read saved IDs
TRAINER_ID=$(cat /tmp/trainer_id.txt)
CUSTOMER_ID=$(cat /tmp/customer_id.txt)

# Create a new PT session
echo "📝 Step 4: Testing POST /api/pt/sessions (Create new session)..."
START_TIME=$(date -u -v+1H +"%Y-%m-%dT%H:00:00.000Z")
END_TIME=$(date -u -v+2H +"%Y-%m-%dT%H:00:00.000Z")

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/pt/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test PT Session\",
    \"description\": \"Testing session creation\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"trainerId\": \"$TRAINER_ID\",
    \"customerId\": \"$CUSTOMER_ID\"
  }")

echo "$CREATE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    session = data.get('data', {})
    print(f'✅ Session created successfully!')
    print(f'   Session ID: {session[\"id\"]}')
    print(f'   Title: {session[\"title\"]}')
    print(f'   Trainer: {session.get(\"trainer\", {}).get(\"firstName\", \"N/A\")} {session.get(\"trainer\", {}).get(\"lastName\", \"N/A\")}')
    print(f'   Customer: {session.get(\"customer\", {}).get(\"firstName\", \"N/A\")} {session.get(\"customer\", {}).get(\"lastName\", \"N/A\")}')
    # Save session ID for update test
    with open('/tmp/session_id.txt', 'w') as f:
        f.write(session['id'])
else:
    print('❌ Failed to create session')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

# Get all PT sessions
echo "📝 Step 5: Testing GET /api/pt/sessions..."
SESSIONS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/sessions)
echo "$SESSIONS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    sessions = data.get('data', [])
    print(f'✅ Found {len(sessions)} total sessions')
    if len(sessions) > 0:
        recent = sessions[0]
        print(f'   Most recent: {recent[\"title\"]} - {recent.get(\"status\", \"N/A\")}')
else:
    print('❌ Failed to get sessions')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

# Update the PT session
SESSION_ID=$(cat /tmp/session_id.txt)
echo "📝 Step 6: Testing PUT /api/pt/sessions/$SESSION_ID (Update session)..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/pt/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Updated Test PT Session\",
    \"description\": \"Testing session update\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"trainerId\": \"$TRAINER_ID\",
    \"customerId\": \"$CUSTOMER_ID\"
  }")

echo "$UPDATE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    session = data.get('data', {})
    print(f'✅ Session updated successfully!')
    print(f'   New title: {session[\"title\"]}')
    print(f'   New description: {session[\"description\"]}')
else:
    print('❌ Failed to update session')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

# Get the specific session
echo "📝 Step 7: Testing GET /api/pt/sessions/$SESSION_ID (Get single session)..."
GET_SESSION_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pt/sessions/$SESSION_ID)
echo "$GET_SESSION_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    session = data.get('data', {})
    print(f'✅ Successfully retrieved session')
    print(f'   Title: {session[\"title\"]}')
    print(f'   Status: {session.get(\"status\", \"N/A\")}')
    print(f'   Trainer: {session.get(\"trainer\", {}).get(\"firstName\", \"N/A\")} {session.get(\"trainer\", {}).get(\"lastName\", \"N/A\")}')
    print(f'   Customer: {session.get(\"customer\", {}).get(\"firstName\", \"N/A\")} {session.get(\"customer\", {}).get(\"lastName\", \"N/A\")}')
else:
    print('❌ Failed to get session')
    print(data)
    sys.exit(1)
" || exit 1
echo ""

echo "==================================="
echo -e "${GREEN}✅ ALL BACKEND TESTS PASSED!${NC}"
echo "==================================="
echo ""
echo "📊 Summary:"
echo -e "  ${GREEN}✅${NC} Login successful"
echo -e "  ${GREEN}✅${NC} Get trainers (found trainers)"
echo -e "  ${GREEN}✅${NC} Get customers (found customers)"
echo -e "  ${GREEN}✅${NC} Create PT session"
echo -e "  ${GREEN}✅${NC} Get all PT sessions"
echo -e "  ${GREEN}✅${NC} Update PT session"
echo -e "  ${GREEN}✅${NC} Get single PT session"
echo ""
echo "🎉 Backend is fully functional!"
echo ""
echo "📱 Next: Test frontend by running 'npm run dev' in frontend directory"
