#!/bin/bash

echo "Testing Analytics API"
echo ""

# Login
echo "1. Logging in..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@otico.no","password":"Admin123"}' > /tmp/analytics_login.json

TOKEN=$(cat /tmp/analytics_login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  cat /tmp/analytics_login.json
  exit 1
fi

echo "✅ Logged in"
echo ""

# Get Analytics
echo "2. Getting analytics data..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/analytics" > /tmp/analytics_data.json

cat /tmp/analytics_data.json | python3 -c "
import sys, json

data = json.load(sys.stdin)
if data.get('success'):
    print('✅ Analytics data retrieved')
    print('')
    analytics = data.get('data', {})

    # Revenue
    revenue = analytics.get('revenue', {})
    print('💰 REVENUE:')
    print(f'   Total: {revenue.get(\"total\", 0):,.2f} kr')
    print(f'   This Month: {revenue.get(\"thisMonth\", 0):,.2f} kr')
    print(f'   Last Month: {revenue.get(\"lastMonth\", 0):,.2f} kr')
    print(f'   Growth: {revenue.get(\"growth\", 0)}%')
    print('')

    # Orders
    orders = analytics.get('orders', {})
    print('📦 ORDERS:')
    print(f'   Total: {orders.get(\"total\", 0)}')
    print(f'   Pending: {orders.get(\"pending\", 0)}')
    print(f'   Completed: {orders.get(\"completed\", 0)}')
    print(f'   Avg Value: {orders.get(\"avgValue\", 0):,.2f} kr')
    print('')

    # Users
    users = analytics.get('users', {})
    print('👥 USERS:')
    print(f'   Total: {users.get(\"total\", 0)}')
    print(f'   Active: {users.get(\"active\", 0)}')
    print(f'   New This Month: {users.get(\"newThisMonth\", 0)}')
    print('')

    # Classes
    classes = analytics.get('classes', {})
    print('🏋️ CLASSES:')
    print(f'   Total: {classes.get(\"total\", 0)}')
    print(f'   Avg Attendance: {classes.get(\"avgAttendance\", 0)}%')
    print(f'   Total Bookings: {classes.get(\"totalBookings\", 0)}')
    print('')

    # PT Sessions
    pt = analytics.get('ptSessions', {})
    print('💪 PT SESSIONS:')
    print(f'   Total: {pt.get(\"total\", 0)}')
    print(f'   Completed: {pt.get(\"completed\", 0)}')
    print(f'   Scheduled: {pt.get(\"scheduled\", 0)}')
else:
    print('❌ Failed to get analytics')
    print('Error:', data.get('error'))
    print('Full response:', data)
"

echo ""
echo "✅ Test complete"
