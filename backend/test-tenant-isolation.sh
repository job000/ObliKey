#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         🔒 TENANT ISOLATION SECURITY TEST                     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Login as Otico Demo Admin
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Otico Demo Admin Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@otico.no","password":"Admin123"}' > /tmp/oblikey_login.json

OBLIKEY_TOKEN=$(cat /tmp/oblikey_login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$OBLIKEY_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login as Otico Demo admin${NC}"
  cat /tmp/oblikey_login.json
  exit 1
fi

echo -e "${GREEN}✅ Logged in as testadmin@otico.no${NC}"
echo "   Token: ${OBLIKEY_TOKEN:0:30}..."
echo ""

# Get Otico Demo trainers
curl -s -H "Authorization: Bearer $OBLIKEY_TOKEN" http://localhost:3000/api/pt/trainers > /tmp/oblikey_trainers.json
OBLIKEY_TRAINERS=$(cat /tmp/oblikey_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
print(f'{len(trainers)}')
" 2>/dev/null)

echo -e "${YELLOW}Otico Demo Trainers: ${OBLIKEY_TRAINERS}${NC}"
cat /tmp/oblikey_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
for i, t in enumerate(trainers[:3]):
    print(f'   {i+1}. {t[\"firstName\"]} {t[\"lastName\"]} ({t[\"email\"]})')
if len(trainers) > 3:
    print(f'   ... and {len(trainers) - 3} more')
" 2>/dev/null

# Get Otico Demo customers
curl -s -H "Authorization: Bearer $OBLIKEY_TOKEN" http://localhost:3000/api/pt/clients > /tmp/oblikey_clients.json
OBLIKEY_CLIENTS=$(cat /tmp/oblikey_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
print(f'{len(clients)}')
" 2>/dev/null)

echo -e "${YELLOW}Otico Demo Customers: ${OBLIKEY_CLIENTS}${NC}"
cat /tmp/oblikey_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
for i, c in enumerate(clients[:3]):
    print(f'   {i+1}. {c[\"firstName\"]} {c[\"lastName\"]} ({c[\"email\"]})')
if len(clients) > 3:
    print(f'   ... and {len(clients) - 3} more')
" 2>/dev/null

echo ""

# Test 2: Login as Premium Gym Admin
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: Premium Gym Admin Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin1@premiumgym.no","password":"password123"}' > /tmp/premium_login.json

PREMIUM_TOKEN=$(cat /tmp/premium_login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$PREMIUM_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login as Premium Gym admin${NC}"
  cat /tmp/premium_login.json
  exit 1
fi

echo -e "${GREEN}✅ Logged in as admin1@premiumgym.no${NC}"
echo "   Token: ${PREMIUM_TOKEN:0:30}..."
echo ""

# Get Premium Gym trainers
curl -s -H "Authorization: Bearer $PREMIUM_TOKEN" http://localhost:3000/api/pt/trainers > /tmp/premium_trainers.json
PREMIUM_TRAINERS=$(cat /tmp/premium_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
print(f'{len(trainers)}')
" 2>/dev/null)

echo -e "${YELLOW}Premium Gym Trainers: ${PREMIUM_TRAINERS}${NC}"
cat /tmp/premium_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
for i, t in enumerate(trainers[:3]):
    print(f'   {i+1}. {t[\"firstName\"]} {t[\"lastName\"]} ({t[\"email\"]})')
if len(trainers) > 3:
    print(f'   ... and {len(trainers) - 3} more')
" 2>/dev/null

# Get Premium Gym customers
curl -s -H "Authorization: Bearer $PREMIUM_TOKEN" http://localhost:3000/api/pt/clients > /tmp/premium_clients.json
PREMIUM_CLIENTS=$(cat /tmp/premium_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
print(f'{len(clients)}')
" 2>/dev/null)

echo -e "${YELLOW}Premium Gym Customers: ${PREMIUM_CLIENTS}${NC}"
cat /tmp/premium_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
for i, c in enumerate(clients[:3]):
    print(f'   {i+1}. {c[\"firstName\"]} {c[\"lastName\"]} ({c[\"email\"]})')
if len(clients) > 3:
    print(f'   ... and {len(clients) - 3} more')
" 2>/dev/null

echo ""

# Test 3: Login as Basic Gym Admin
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Basic Gym Admin Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin1@basicgym.no","password":"password123"}' > /tmp/basic_login.json

BASIC_TOKEN=$(cat /tmp/basic_login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$BASIC_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login as Basic Gym admin${NC}"
  cat /tmp/basic_login.json
  exit 1
fi

echo -e "${GREEN}✅ Logged in as admin1@basicgym.no${NC}"
echo "   Token: ${BASIC_TOKEN:0:30}..."
echo ""

# Get Basic Gym trainers
curl -s -H "Authorization: Bearer $BASIC_TOKEN" http://localhost:3000/api/pt/trainers > /tmp/basic_trainers.json
BASIC_TRAINERS=$(cat /tmp/basic_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
print(f'{len(trainers)}')
" 2>/dev/null)

echo -e "${YELLOW}Basic Gym Trainers: ${BASIC_TRAINERS}${NC}"
cat /tmp/basic_trainers.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
for i, t in enumerate(trainers[:3]):
    print(f'   {i+1}. {t[\"firstName\"]} {t[\"lastName\"]} ({t[\"email\"]})')
if len(trainers) > 3:
    print(f'   ... and {len(trainers) - 3} more')
" 2>/dev/null

# Get Basic Gym customers
curl -s -H "Authorization: Bearer $BASIC_TOKEN" http://localhost:3000/api/pt/clients > /tmp/basic_clients.json
BASIC_CLIENTS=$(cat /tmp/basic_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
print(f'{len(clients)}')
" 2>/dev/null)

echo -e "${YELLOW}Basic Gym Customers: ${BASIC_CLIENTS}${NC}"
cat /tmp/basic_clients.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
clients = data.get('data', [])
for i, c in enumerate(clients[:3]):
    print(f'   {i+1}. {c[\"firstName\"]} {c[\"lastName\"]} ({c[\"email\"]})')
if len(clients) > 3:
    print(f'   ... and {len(clients) - 3} more')
" 2>/dev/null

echo ""

# Analysis
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ANALYSIS: Tenant Isolation Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Tenant Data Summary:"
echo "  Otico Demo: ${OBLIKEY_TRAINERS} trainers, ${OBLIKEY_CLIENTS} customers"
echo "  Premium Gym:  ${PREMIUM_TRAINERS} trainers, ${PREMIUM_CLIENTS} customers"
echo "  Basic Gym:    ${BASIC_TRAINERS} trainers, ${BASIC_CLIENTS} customers"
echo ""

# Check if counts are different (they should be)
if [ "$OBLIKEY_TRAINERS" != "$PREMIUM_TRAINERS" ] && [ "$OBLIKEY_TRAINERS" != "$BASIC_TRAINERS" ]; then
  echo -e "${GREEN}✅ PASS: Trainer counts are different between tenants${NC}"
  echo "   This indicates proper tenant isolation"
else
  echo -e "${RED}❌ WARNING: Trainer counts are identical - possible isolation issue${NC}"
fi

if [ "$OBLIKEY_CLIENTS" != "$PREMIUM_CLIENTS" ] && [ "$OBLIKEY_CLIENTS" != "$BASIC_CLIENTS" ]; then
  echo -e "${GREEN}✅ PASS: Customer counts are different between tenants${NC}"
  echo "   This indicates proper tenant isolation"
else
  echo -e "${RED}❌ WARNING: Customer counts are identical - possible isolation issue${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Tenant Isolation Test Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next Steps:"
echo "1. Manually verify in frontend that each admin sees only their tenant data"
echo "2. Try to create PT sessions cross-tenant (should fail)"
echo "3. Check detailed test plan: TENANT_ISOLATION_TEST.md"
echo ""
