# Access Control and Logging API Implementation

## Overview
This document describes the comprehensive Access Control and Logging API implementation for the ObliKey platform. This system enables physical door access control with rule-based permissions, time-based restrictions, and comprehensive activity logging.

## Implementation Summary

### Files Created

#### 1. Services
- **`src/services/access-control.service.ts`**
  - Core access evaluation algorithm
  - Role-based and user-specific access control
  - Time-based access restrictions
  - Membership verification for facility doors
  - Door status management
  - Access statistics and analytics

- **`src/services/access-log.service.ts`**
  - Comprehensive logging of all access attempts
  - Query and filter access logs
  - CSV export functionality
  - Security monitoring (suspicious activity detection)
  - Access statistics and reporting
  - Data retention management

#### 2. Controllers
- **`src/controllers/access.controller.ts`**
  - Door access verification endpoints
  - Door unlock functionality
  - Access log querying and export
  - Door statistics and monitoring
  - User accessible doors listing

- **`src/controllers/door-access-rule.controller.ts`**
  - Access rule CRUD operations
  - User and role-based rule management
  - Rule activation/deactivation
  - Bulk user operations (add/remove users from rules)

#### 3. Routes
- **`src/routes/access.routes.ts`**
  - Door access and control endpoints
  - Access log management
  - Security monitoring endpoints

- **`src/routes/door-access-rule.routes.ts`**
  - Access rule management endpoints
  - User management within rules

## API Endpoints

### Access Control Endpoints

#### Check Access
```
POST /api/doors/:doorId/check-access
Authorization: Bearer <token>
```
Evaluates whether the authenticated user can access a specific door.

**Response:**
```json
{
  "success": true,
  "data": {
    "granted": true,
    "reason": "Access granted via role-based rule",
    "timestamp": "2025-10-28T10:30:00.000Z"
  }
}
```

#### Unlock Door
```
POST /api/doors/:doorId/unlock
Authorization: Bearer <token>
```
Unlocks a door if the user has access permissions.

#### Get Door Status
```
GET /api/doors/:doorId/status
Authorization: Bearer <token>
```
Returns current door status and configuration.

#### Get My Accessible Doors
```
GET /api/doors/my-access
Authorization: Bearer <token>
```
Returns list of all doors the authenticated user can access.

#### Get Door Statistics
```
GET /api/doors/:doorId/stats?startDate=&endDate=
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
Returns access statistics for a specific door.

### Access Log Endpoints

#### Query Access Logs
```
GET /api/access-logs?doorId=&userId=&success=&action=&method=&startDate=&endDate=&limit=&offset=
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
Query access logs with various filters.

**Query Parameters:**
- `doorId` - Filter by door
- `userId` - Filter by user
- `success` - Filter by success status (true/false)
- `action` - Filter by action (UNLOCK, LOCK, ACCESS_GRANTED, ACCESS_DENIED)
- `method` - Filter by method (CARD, PIN, MOBILE, MANUAL, API)
- `startDate` - Filter from date
- `endDate` - Filter to date
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

#### Get Log Details
```
GET /api/access-logs/:logId
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
Get detailed information about a specific access log entry.

#### Export Logs
```
GET /api/access-logs/export?[filters]
Authorization: Bearer <token>
Roles: ADMIN
```
Export access logs to CSV format.

#### Get Statistics
```
GET /api/access-logs/stats?startDate=&endDate=
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
Get overall access log statistics including:
- Total attempts
- Success/failure rates
- Access by action
- Access by method
- Top accessed doors
- Unique users

#### Get Suspicious Activity
```
GET /api/access-logs/suspicious?timeWindow=30&threshold=5
Authorization: Bearer <token>
Roles: ADMIN
```
Identify suspicious access patterns (multiple failed attempts).

### Door Access Rule Endpoints

#### List Rules
```
GET /api/doors/:doorId/access-rules?active=true
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
List all access rules for a door.

#### Create Rule
```
POST /api/doors/:doorId/access-rules
Authorization: Bearer <token>
Roles: ADMIN, TRAINER

Body:
{
  "name": "Gym Members - 24/7 Access",
  "description": "Active members can access gym at any time",
  "userIds": ["user-id-1", "user-id-2"],
  "roleAccess": ["ADMIN", "TRAINER"],
  "timeSlots": [
    {
      "dayOfWeek": 1,
      "startTime": "06:00",
      "endTime": "22:00"
    }
  ],
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "active": true
}
```

#### Get Rule Details
```
GET /api/access-rules/:ruleId
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```

#### Update Rule
```
PUT /api/access-rules/:ruleId
Authorization: Bearer <token>
Roles: ADMIN, TRAINER

Body: (all fields optional)
{
  "name": "Updated Rule Name",
  "userIds": ["user-id-1"],
  "roleAccess": ["ADMIN"],
  "active": true
}
```

#### Delete Rule
```
DELETE /api/access-rules/:ruleId
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```

#### Toggle Rule
```
PATCH /api/access-rules/:ruleId/toggle
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```
Toggles the active status of a rule.

#### Add Users to Rule
```
POST /api/access-rules/:ruleId/add-users
Authorization: Bearer <token>
Roles: ADMIN, TRAINER

Body:
{
  "userIds": ["user-id-3", "user-id-4"]
}
```

#### Remove Users from Rule
```
POST /api/access-rules/:ruleId/remove-users
Authorization: Bearer <token>
Roles: ADMIN, TRAINER

Body:
{
  "userIds": ["user-id-1"]
}
```

## Access Evaluation Algorithm

The access control system uses a comprehensive multi-step evaluation algorithm:

### Step 1: Door Verification
- Verify door exists
- Check door is active
- Get door configuration

### Step 2: User Verification
- Verify user exists
- Check user is active
- Get user role and permissions

### Step 3: Membership Verification
For FACILITY and ENTRANCE type doors:
- Check user has active membership
- Verify membership has not expired
- Ensure membership is not frozen or suspended

### Step 4: Access Rule Evaluation
- Retrieve all active access rules for the door
- Check date validity of rules (startDate/endDate)
- Evaluate rules in order:
  1. **User-specific access**: Check if user is in rule's userIds array
  2. **Role-based access**: Check if user's role is in rule's roleAccess array

### Step 5: Time-based Restrictions
- If rule has timeSlots, verify current time matches allowed slots
- Check day of week and time range
- Deny access if current time is outside allowed periods

### Step 6: Final Decision
- Grant access if any rule allows it
- Deny access by default if no rules match
- Return detailed reason for decision

### Evaluation Result
The algorithm returns:
```typescript
{
  granted: boolean;           // Whether access is granted
  reason: string;             // Human-readable reason
  metadata?: {                // Additional context
    ruleName?: string;
    accessType?: string;      // 'user-specific' or 'role-based'
    role?: string;
  };
  ruleId?: string;           // ID of matching rule
  evaluationSteps: string[]; // Detailed evaluation log
}
```

## Access Logging

All access attempts are automatically logged with the following information:

- **Door information**: Door ID, name, type, location
- **User information**: User ID, name, email, role (if authenticated)
- **Action**: UNLOCK, LOCK, ACCESS_GRANTED, ACCESS_DENIED
- **Method**: CARD, PIN, MOBILE, MANUAL, API
- **Success status**: Boolean indicating if access was granted
- **Reason**: Why access was granted or denied
- **IP Address**: Request IP address
- **Metadata**: Additional context (evaluation steps, rule ID, etc.)
- **Timestamp**: When the attempt occurred

## Time-based Access Control

Access rules support flexible time-based restrictions:

### Time Slot Format
```typescript
{
  "dayOfWeek": 0-6,     // 0=Sunday, 6=Saturday
  "startTime": "HH:MM", // 24-hour format
  "endTime": "HH:MM"    // 24-hour format
}
```

### Examples

**Weekday Business Hours:**
```json
{
  "timeSlots": [
    {"dayOfWeek": 1, "startTime": "08:00", "endTime": "18:00"},
    {"dayOfWeek": 2, "startTime": "08:00", "endTime": "18:00"},
    {"dayOfWeek": 3, "startTime": "08:00", "endTime": "18:00"},
    {"dayOfWeek": 4, "startTime": "08:00", "endTime": "18:00"},
    {"dayOfWeek": 5, "startTime": "08:00", "endTime": "18:00"}
  ]
}
```

**24/7 Access (no time restrictions):**
```json
{
  "timeSlots": null
}
```

**Weekend Only:**
```json
{
  "timeSlots": [
    {"dayOfWeek": 0, "startTime": "00:00", "endTime": "23:59"},
    {"dayOfWeek": 6, "startTime": "00:00", "endTime": "23:59"}
  ]
}
```

## Security Features

### 1. Authentication & Authorization
- All endpoints require valid JWT authentication
- Role-based access control (RBAC)
- Admin and Trainer roles for management endpoints
- Regular users can only check their own access

### 2. Suspicious Activity Detection
- Tracks multiple failed access attempts
- Groups by user ID and IP address
- Configurable time window and threshold
- Real-time security monitoring

### 3. Comprehensive Logging
- Every access attempt is logged
- Immutable audit trail
- Detailed evaluation steps
- IP address tracking

### 4. Data Retention
- Automatic cleanup of old logs
- Configurable retention period
- Maintains compliance with data protection regulations

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install json2csv
npm install --save-dev @types/json2csv
```

### 2. Database Setup
The required database models are already defined in the Prisma schema:
- `Door`
- `DoorAccessLog`
- `DoorAccessRule`

Run migrations if needed:
```bash
npx prisma migrate dev
```

### 3. Enable Feature
Update tenant settings to enable door access control:
```sql
UPDATE tenant_settings SET "doorAccessEnabled" = true WHERE "tenantId" = 'your-tenant-id';
```

## Usage Examples

### Create an Access Rule
```typescript
// Allow all trainers 24/7 access to gym entrance
POST /api/doors/door-id/access-rules
{
  "name": "Trainer Access - 24/7",
  "description": "All trainers have unrestricted access",
  "roleAccess": ["TRAINER", "ADMIN"],
  "active": true
}

// Allow specific users during business hours
POST /api/doors/door-id/access-rules
{
  "name": "Member Access - Business Hours",
  "description": "Members can access during operating hours",
  "userIds": ["user-1", "user-2", "user-3"],
  "timeSlots": [
    {"dayOfWeek": 1, "startTime": "06:00", "endTime": "22:00"},
    {"dayOfWeek": 2, "startTime": "06:00", "endTime": "22:00"},
    {"dayOfWeek": 3, "startTime": "06:00", "endTime": "22:00"},
    {"dayOfWeek": 4, "startTime": "06:00", "endTime": "22:00"},
    {"dayOfWeek": 5, "startTime": "06:00", "endTime": "22:00"}
  ],
  "active": true
}
```

### Check Access
```typescript
// User checks if they can access a door
POST /api/doors/gym-entrance/check-access

Response:
{
  "success": true,
  "data": {
    "granted": true,
    "reason": "Access granted via role-based rule",
    "timestamp": "2025-10-28T10:30:00.000Z"
  }
}
```

### Monitor Access Logs
```typescript
// Get recent failed attempts
GET /api/access-logs?success=false&limit=20

// Export logs for compliance
GET /api/access-logs/export?startDate=2025-01-01&endDate=2025-01-31

// Check for suspicious activity
GET /api/access-logs/suspicious?timeWindow=30&threshold=5
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message in English"
}
```

Common error codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (access denied)
- `404` - Not found (resource doesn't exist)
- `500` - Internal server error

## Performance Considerations

1. **Database Indexes**: The schema includes indexes on:
   - `doorId` and `createdAt` for log queries
   - `userId` and `createdAt` for user history
   - `doorId` and `active` for rule lookups

2. **Pagination**: All list endpoints support pagination to handle large datasets

3. **Caching**: Consider caching frequently accessed rules in production

4. **Log Archival**: Implement automatic archival of old logs to maintain performance

## Testing

Test the implementation with:

```bash
# Example test cases
npm test access-control.test.ts
npm test access-log.test.ts
```

## Future Enhancements

Potential improvements:
1. Hardware integration with physical door controllers
2. Mobile app access (QR codes, NFC)
3. Temporary access codes
4. Visitor management
5. Real-time notifications
6. Video verification
7. Biometric authentication
8. Integration with calendar for scheduled access

## Support

For issues or questions:
- Check the API documentation
- Review access logs for debugging
- Contact system administrator

---

**Implementation Date**: October 28, 2025
**Version**: 1.0.0
**Status**: ✅ Complete and Ready for Use
