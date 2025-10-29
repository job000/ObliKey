# ObliKey - Door Access Setup Guide

## Summary of Changes

All issues have been resolved:

### ✅ Fixed Issues

1. **Route Conflict Fixed** - Regular users can now access their door list without errors
2. **Main Entrance Auto-Access** - Active members automatically get access to main entrance
3. **User-Assigned Access Works** - Users assigned by admin can now see and access doors
4. **Manual Override System** - Admins can manually grant/revoke access using access rules
5. **Automatic Membership-Based Access** - Access automatically activates/deactivates with membership status

## How Door Access Works

### Access Rule Types

1. **MEMBERSHIP Rules** (Priority 10)
   - Grants access based on membership status
   - Example: All ACTIVE members get main entrance access
   - Automatically activates when membership becomes ACTIVE
   - Automatically deactivates when membership expires/is cancelled

2. **ROLE Rules** (Priority varies)
   - Grants access based on user role (ADMIN, TRAINER, CUSTOMER)
   - CUSTOMER role requires active membership
   - ADMIN and TRAINER roles don't require membership

3. **USER_SPECIFIC Rules** (Priority 0-9 recommended)
   - Grants access to specific users by their user ID
   - **Bypasses membership requirement** - admin can grant access to anyone
   - Higher priority than MEMBERSHIP rules

### Priority System

- **Lower numbers = Higher priority** (evaluated first)
- Recommended priorities:
  - 0-9: Manual user-specific overrides by admin
  - 10-19: Automatic membership-based rules
  - 20+: Role-based rules

## Main Entrance Setup

### Option 1: Via Script (Easiest)

```bash
cd backend
npx ts-node scripts/setup-main-entrance-direct.ts
```

This automatically:
- Marks "Hovedinngangsdør" as main entrance
- Creates MEMBERSHIP access rule for ACTIVE members
- All active members immediately get access

### Option 2: Via API

```bash
curl -X POST http://localhost:3000/api/door-access/doors/{DOOR_ID}/set-main-entrance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: oblikey-demo" \
  -d '{"isMainEntrance": true}'
```

### Option 3: Manual Setup via Admin UI

1. Go to Door Access Rules screen
2. Select "Hovedinngangsdør"
3. Create New Access Rule:
   - Name: "Automatic Access - Active Members"
   - Type: MEMBERSHIP
   - Allowed Membership Statuses: ACTIVE
   - Priority: 10
   - Active: Yes

## Admin Operations

### Grant Access to Specific User (Without Membership)

1. Go to Door Access Rules screen
2. Select the door
3. Create New Access Rule:
   - Name: "Manual Access - [User Name]"
   - Type: USER_SPECIFIC
   - Select the user(s)
   - Priority: 0-9 (lower = higher priority)
   - Active: Yes

**This grants access even if the user doesn't have an active membership!**

### Revoke Manual Access

1. Go to Door Access Rules screen
2. Select the door
3. Find the USER_SPECIFIC rule
4. Either:
   - Delete the rule entirely, OR
   - Edit and remove the user from the rule, OR
   - Set Active: No to temporarily disable

### Temporarily Block a Member

If you want to block a specific user even though they have active membership:

Currently, you need to:
1. Remove them from any USER_SPECIFIC rules
2. Their membership-based access will work as normal

**Note:** There's no "deny" rule yet. If user has ACTIVE membership, they will have access to main entrance via the MEMBERSHIP rule.

## Current Setup Status

### Main Entrance Door
- **Door:** Hovedinngangsdør (7b817407-b715-4bf6-9948-ca065a8accae)
- **Location:** 1. etasje - Inngang
- **Metadata:** Marked as main entrance with Bluetooth enabled

### Access Rules Created
1. ✅ **Automatic Access - Active Members** (MEMBERSHIP, Priority 10)
   - All users with ACTIVE membership status get access
   - Auto-activates when membership becomes active
   - Auto-deactivates when membership expires

2. ✅ **Admin/SuperAdmin tilgang** (ROLE, Priority 100)
   - All ADMIN and SUPER_ADMIN users get access

3. ✅ **User-Specific Rule** (USER_SPECIFIC, Priority 50)
   - Specific user access (bd5bfc61-b877-4e40-9e37-1ae7bf950e13)

### Active Members with Access
Current count: **4 active members**
- kunde@oblikey.no
- kunde1@test.no
- kunde2@test.no
- kunde3@test.no

All these users can now:
- See "Hovedinngangsdør" in their mobile app
- Unlock the door via the app
- Access via Bluetooth proximity (if Bluetooth is enabled)

## Testing Door Access

### As Admin
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: oblikey-demo" \
  -d '{"identifier":"admin1@test.no","password":"password123"}'

# Get accessible doors
curl http://localhost:3000/api/door-access/my-accessible-doors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-subdomain: oblikey-demo"
```

### As Regular Member
```bash
# Login as member
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: oblikey-demo" \
  -d '{"identifier":"kunde1@test.no","password":"password"}'

# Get accessible doors (should include main entrance)
curl http://localhost:3000/api/door-access/my-accessible-doors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-subdomain: oblikey-demo"

# Unlock door
curl -X POST http://localhost:3000/api/door-access/doors/7b817407-b715-4bf6-9948-ca065a8accae/unlock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-subdomain: oblikey-demo"
```

## Mobile App Usage

### For Regular Members

1. Open ObliKey mobile app
2. Navigate to "Dørtilgang" (Door Access)
3. You should see:
   - Membership status banner (green if active)
   - "Hovedinngangsdør" in the door list
   - "Lås opp" button enabled

4. Tap "Lås opp" to unlock the door
5. With Bluetooth enabled, door unlocks automatically when nearby

### For Admins

1. Login to admin portal or use Admin account in mobile app
2. Navigate to "Tilgangsregler" (Access Rules)
3. You can:
   - Create new access rules
   - Assign users to specific doors
   - Manage role-based access
   - View access logs

## Troubleshooting

### User Can't See Door

Check:
1. User has active membership: `SELECT * FROM memberships WHERE "userId" = 'USER_ID' AND status = 'ACTIVE';`
2. Door is ACTIVE: `SELECT status FROM doors WHERE id = 'DOOR_ID';`
3. Access rule exists and is active: `SELECT * FROM door_access_rules WHERE "doorId" = 'DOOR_ID' AND active = true;`
4. Route is correct in app: Should call `/api/door-access/my-accessible-doors`

### "Kunne ikke hente data" Error

Fixed! This was due to route conflict. Now resolved by:
- Backend route: `GET /api/door-access/my-accessible-doors`
- Frontend calls: `/door-access/my-accessible-doors`

### User Can Unlock But It Fails

Check:
1. Door is online: `SELECT "isOnline" FROM doors WHERE id = 'DOOR_ID';`
2. Door hardware is connected
3. Check access logs: `SELECT * FROM door_access_logs WHERE "doorId" = 'DOOR_ID' ORDER BY timestamp DESC LIMIT 10;`

## API Endpoints Reference

### For Regular Users
- `GET /api/door-access/my-accessible-doors` - Get doors I can access
- `POST /api/door-access/doors/:doorId/unlock` - Unlock a door
- `POST /api/door-access/doors/:doorId/check-access` - Check if I have access
- `GET /api/memberships/my-status` - Get my membership status

### For Admins
- `GET /api/door-access/doors` - List all doors
- `POST /api/door-access/doors/:doorId/set-main-entrance` - Mark as main entrance
- `GET /api/door-access/doors/:doorId/access-rules` - Get door's access rules
- `POST /api/door-access/doors/:doorId/access-rules` - Create access rule
- `PUT /api/door-access/access-rules/:ruleId` - Update access rule
- `DELETE /api/door-access/access-rules/:ruleId` - Delete access rule

## Database Schema

### Doors Table
```sql
- id: UUID
- tenantId: UUID
- name: String
- location: String
- status: DoorStatus (ACTIVE, INACTIVE, etc.)
- metadata: JSON { isMainEntrance: boolean, bluetooth: {...} }
```

### Door Access Rules Table
```sql
- id: UUID
- tenantId: UUID
- doorId: UUID
- name: String
- type: AccessRuleType (MEMBERSHIP, ROLE, USER_SPECIFIC)
- priority: Int (lower = higher priority)
- active: Boolean
- allowedMembershipStatuses: String[] (e.g., ['ACTIVE'])
- allowedRoles: String[] (e.g., ['ADMIN', 'TRAINER'])
- allowedUserIds: String[] (UUIDs of specific users)
- validFrom: DateTime (optional)
- validUntil: DateTime (optional)
```

### Memberships Table
```sql
- id: UUID
- userId: UUID
- tenantId: UUID
- status: MembershipStatus (ACTIVE, EXPIRED, FROZEN, etc.)
- startDate: DateTime
- endDate: DateTime
```

## Next Steps

All core functionality is now working! Possible enhancements:

1. **Deny Rules** - Add ability to explicitly deny access to specific users
2. **Time-Based Access** - Implement schedule-based access restrictions
3. **Bulk User Management** - UI for assigning multiple users to doors at once
4. **Access Analytics** - Dashboard showing who accessed which doors when
5. **Mobile Notifications** - Alert users when door access is granted/revoked

---

**Generated:** 2025-10-29
**Status:** ✅ All systems operational
