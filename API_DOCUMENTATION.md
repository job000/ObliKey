# ObliKey API Documentation

Complete API reference for the ObliKey multi-tenant fitness platform.

**Base URL**: `http://localhost:3000/api` (Development)
**Production URL**: `https://api.oblikey.com/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Tenants](#tenants)
3. [Users](#users)
4. [Classes](#classes)
5. [Bookings](#bookings)
6. [PT Sessions](#pt-sessions)
7. [Training Programs](#training-programs)
8. [Chat & Messaging](#chat--messaging)
9. [Payments](#payments)
10. [Platform Admin](#platform-admin)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant-123",
  "role": "CUSTOMER" // Optional: CUSTOMER, TRAINER, TENANT_ADMIN
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "tenantId": "tenant-123"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Rules**:
- Email must be valid format
- Password minimum 8 characters, must contain uppercase, lowercase, and number
- First name and last name required
- Tenant ID required

**Errors**:
- `400` - Validation error or email already exists
- `500` - Server error

---

### Login

Authenticate existing user.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**:
- `401` - Invalid credentials
- `400` - Validation error

---

### Get Current User

Get authenticated user's profile.

**Endpoint**: `GET /auth/me`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "tenantId": "tenant-123",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors**:
- `401` - Invalid or missing token

---

## Classes

Manage fitness classes.

### List All Classes

Get all available classes.

**Endpoint**: `GET /classes`

**Headers**: `Authorization: Bearer TOKEN`

**Query Parameters**:
- `type` (optional): Filter by class type (GROUP_CLASS, PRIVATE_SESSION)
- `startDate` (optional): Filter classes starting from date (ISO 8601)
- `endDate` (optional): Filter classes ending before date (ISO 8601)
- `search` (optional): Search by class name or description

**Example**: `GET /classes?type=GROUP_CLASS&search=yoga`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "class-123",
      "name": "Morning Yoga",
      "description": "Relaxing morning yoga session",
      "type": "GROUP_CLASS",
      "capacity": 15,
      "currentBookings": 8,
      "duration": 60,
      "startTime": "2024-01-20T08:00:00.000Z",
      "instructor": {
        "id": "trainer-123",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "location": "Studio A",
      "price": 150
    }
  ]
}
```

---

### Get Single Class

Get details of a specific class.

**Endpoint**: `GET /classes/:id`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "class-123",
    "name": "Morning Yoga",
    "description": "Relaxing morning yoga session",
    "type": "GROUP_CLASS",
    "capacity": 15,
    "currentBookings": 8,
    "availableSpots": 7,
    "duration": 60,
    "startTime": "2024-01-20T08:00:00.000Z",
    "instructor": {
      "id": "trainer-123",
      "firstName": "Jane",
      "lastName": "Smith",
      "bio": "Certified yoga instructor"
    },
    "location": "Studio A",
    "price": 150,
    "requirements": ["Bring your own mat", "Arrive 10 minutes early"]
  }
}
```

**Errors**:
- `404` - Class not found

---

### Create Class

Create a new class (Trainers/Admins only).

**Endpoint**: `POST /classes`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "name": "Evening Pilates",
  "description": "Core strengthening pilates class",
  "type": "GROUP_CLASS",
  "capacity": 12,
  "duration": 60,
  "startTime": "2024-01-20T18:00:00.000Z",
  "location": "Studio B",
  "price": 180,
  "requirements": ["Beginner friendly"]
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "class-456",
    "name": "Evening Pilates",
    "type": "GROUP_CLASS",
    "capacity": 12,
    "duration": 60,
    "startTime": "2024-01-20T18:00:00.000Z",
    "instructorId": "trainer-123",
    "location": "Studio B",
    "price": 180
  }
}
```

**Errors**:
- `400` - Validation error
- `403` - Unauthorized (not trainer/admin)

---

### Update Class

Update existing class (Trainers/Admins only).

**Endpoint**: `PATCH /classes/:id`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body** (all fields optional):
```json
{
  "name": "Advanced Pilates",
  "capacity": 15,
  "price": 200
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "class-456",
    "name": "Advanced Pilates",
    "capacity": 15,
    "price": 200
  }
}
```

**Errors**:
- `404` - Class not found
- `403` - Unauthorized

---

### Delete Class

Delete a class (Trainers/Admins only).

**Endpoint**: `DELETE /classes/:id`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Klasse slettet"
}
```

**Errors**:
- `404` - Class not found
- `403` - Unauthorized
- `400` - Cannot delete class with active bookings

---

## Bookings

Manage class bookings.

### List My Bookings

Get all bookings for the authenticated user.

**Endpoint**: `GET /bookings/my-bookings`

**Headers**: `Authorization: Bearer TOKEN`

**Query Parameters**:
- `status` (optional): Filter by status (CONFIRMED, CANCELLED, COMPLETED)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-123",
      "status": "CONFIRMED",
      "bookedAt": "2024-01-15T10:00:00.000Z",
      "notes": "First time attending",
      "class": {
        "id": "class-123",
        "name": "Morning Yoga",
        "startTime": "2024-01-20T08:00:00.000Z",
        "duration": 60,
        "location": "Studio A",
        "instructor": {
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    }
  ]
}
```

---

### Create Booking

Book a class.

**Endpoint**: `POST /bookings`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "classId": "class-123",
  "notes": "First time attending" // Optional
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "classId": "class-123",
    "userId": "user-123",
    "status": "CONFIRMED",
    "bookedAt": "2024-01-15T10:00:00.000Z",
    "notes": "First time attending"
  }
}
```

**Errors**:
- `400` - Class full, already booked, or invalid request
- `404` - Class not found

---

### Cancel Booking

Cancel a booking (must be >24 hours before class).

**Endpoint**: `PATCH /bookings/:id/cancel`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "reason": "Schedule conflict" // Optional
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-16T12:00:00.000Z",
    "cancellationReason": "Schedule conflict"
  }
}
```

**Errors**:
- `400` - Too late to cancel (< 24 hours before class)
- `404` - Booking not found
- `403` - Not your booking

---

## PT Sessions

Personal training session management.

### List PT Sessions

Get all PT sessions (filtered by role).

**Endpoint**: `GET /pt/sessions`

**Headers**: `Authorization: Bearer TOKEN`

**Query Parameters**:
- `status` (optional): SCHEDULED, COMPLETED, CANCELLED
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "session-123",
      "trainer": {
        "id": "trainer-123",
        "firstName": "Mike",
        "lastName": "Johnson"
      },
      "client": {
        "id": "client-123",
        "firstName": "John",
        "lastName": "Doe"
      },
      "startTime": "2024-01-20T10:00:00.000Z",
      "duration": 60,
      "type": "ONE_ON_ONE",
      "status": "SCHEDULED",
      "location": "Private Training Room",
      "notes": "Focus on strength training"
    }
  ]
}
```

---

### Create PT Session

Create a new PT session (Trainers only).

**Endpoint**: `POST /pt/sessions`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "clientId": "client-123",
  "startTime": "2024-01-20T10:00:00.000Z",
  "duration": 60,
  "type": "ONE_ON_ONE",
  "location": "Private Training Room",
  "notes": "First assessment session"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "session-123",
    "trainerId": "trainer-123",
    "clientId": "client-123",
    "startTime": "2024-01-20T10:00:00.000Z",
    "duration": 60,
    "type": "ONE_ON_ONE",
    "status": "SCHEDULED"
  }
}
```

**Errors**:
- `400` - Validation error or time slot conflict
- `403` - Not authorized (not a trainer)

---

### Update PT Session

Update session details (Trainers only).

**Endpoint**: `PATCH /pt/sessions/:id`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "notes": "Completed strength assessment. Client lifted 150kg squat.",
  "status": "COMPLETED"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "session-123",
    "notes": "Completed strength assessment. Client lifted 150kg squat.",
    "status": "COMPLETED"
  }
}
```

---

### Cancel PT Session

Cancel a PT session.

**Endpoint**: `PATCH /pt/sessions/:id/cancel`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "reason": "Trainer illness"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "session-123",
    "status": "CANCELLED",
    "cancellationReason": "Trainer illness"
  }
}
```

---

## Training Programs

Manage training programs for PT clients.

### List Training Programs

Get all training programs.

**Endpoint**: `GET /pt/programs`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "program-123",
      "name": "Strength Building - 12 Weeks",
      "description": "Progressive overload strength program",
      "trainer": {
        "id": "trainer-123",
        "firstName": "Mike",
        "lastName": "Johnson"
      },
      "client": {
        "id": "client-123",
        "firstName": "John",
        "lastName": "Doe"
      },
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-04-08T00:00:00.000Z",
      "goals": ["Increase squat to 150kg", "Build overall strength"],
      "status": "ACTIVE"
    }
  ]
}
```

---

### Create Training Program

Create a new training program (Trainers only).

**Endpoint**: `POST /pt/programs`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "clientId": "client-123",
  "name": "Strength Building - 12 Weeks",
  "description": "Progressive overload strength program",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-04-08T00:00:00.000Z",
  "goals": ["Increase squat to 150kg", "Build overall strength"],
  "exercises": [
    {
      "name": "Squats",
      "sets": 4,
      "reps": 8,
      "weight": "100kg",
      "notes": "Focus on form, progressive overload weekly"
    },
    {
      "name": "Deadlifts",
      "sets": 3,
      "reps": 5,
      "weight": "120kg",
      "notes": "Proper warm-up essential"
    }
  ]
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "program-123",
    "name": "Strength Building - 12 Weeks",
    "clientId": "client-123",
    "trainerId": "trainer-123",
    "exercises": [
      {
        "id": "exercise-1",
        "name": "Squats",
        "sets": 4,
        "reps": 8,
        "weight": "100kg"
      }
    ]
  }
}
```

---

### Update Training Program

Update program details (Trainers only).

**Endpoint**: `PATCH /pt/programs/:id`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "exercises": [
    {
      "name": "Squats",
      "sets": 5,
      "reps": 5,
      "weight": "110kg",
      "notes": "Progressive overload - increased weight"
    }
  ]
}
```

**Response**: `200 OK`

---

### Log Workout Progress

Log a workout completion (Clients).

**Endpoint**: `POST /pt/progress`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "programId": "program-123",
  "date": "2024-01-20T00:00:00.000Z",
  "exercises": [
    {
      "exerciseName": "Squats",
      "sets": 5,
      "reps": 5,
      "weight": "110kg",
      "notes": "Felt strong today, form was good"
    }
  ],
  "overallNotes": "Great workout, energy levels high",
  "rating": 4
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "progress-123",
    "programId": "program-123",
    "date": "2024-01-20T00:00:00.000Z",
    "rating": 4,
    "exercises": [...]
  }
}
```

---

### Get Trainer Statistics

Get trainer's performance metrics.

**Endpoint**: `GET /pt/stats`

**Headers**: `Authorization: Bearer TOKEN` (Trainer role required)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalSessions": 156,
    "completedSessions": 142,
    "cancelledSessions": 8,
    "totalClients": 24,
    "activePrograms": 18,
    "upcomingSessions": 12,
    "monthlyRevenue": 45000
  }
}
```

---

### Get Client Progress

Get detailed progress for a specific client (Trainers only).

**Endpoint**: `GET /pt/clients/:clientId/progress`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "client-123",
      "firstName": "John",
      "lastName": "Doe"
    },
    "totalSessions": 24,
    "completedSessions": 22,
    "programs": [
      {
        "id": "program-123",
        "name": "Strength Building",
        "progress": 65,
        "startDate": "2024-01-15T00:00:00.000Z"
      }
    ],
    "recentWorkouts": [...]
  }
}
```

---

## Chat & Messaging

Real-time messaging between users.

### List Conversations

Get all conversations for the authenticated user.

**Endpoint**: `GET /chat/conversations`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-123",
      "title": "Conversation with Jane Smith",
      "participants": [
        {
          "id": "user-123",
          "firstName": "John",
          "lastName": "Doe"
        },
        {
          "id": "trainer-123",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      ],
      "lastMessage": {
        "content": "See you tomorrow at 10am!",
        "sentAt": "2024-01-19T15:30:00.000Z",
        "sender": {
          "firstName": "Jane"
        }
      },
      "unreadCount": 2,
      "updatedAt": "2024-01-19T15:30:00.000Z"
    }
  ]
}
```

---

### Create Conversation

Start a new conversation.

**Endpoint**: `POST /chat/conversations`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "participantIds": ["trainer-123"],
  "title": "Training Questions" // Optional
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "conv-456",
    "participants": [
      {
        "id": "user-123",
        "firstName": "John",
        "lastName": "Doe"
      },
      {
        "id": "trainer-123",
        "firstName": "Jane",
        "lastName": "Smith"
      }
    ],
    "createdAt": "2024-01-19T16:00:00.000Z"
  }
}
```

**Errors**:
- `400` - Conversation already exists between these users

---

### Get Messages

Get all messages in a conversation.

**Endpoint**: `GET /chat/conversations/:conversationId/messages`

**Headers**: `Authorization: Bearer TOKEN`

**Query Parameters**:
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Pagination offset

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-123",
      "content": "Hi! I have a question about tomorrow's session.",
      "sender": {
        "id": "user-123",
        "firstName": "John",
        "lastName": "Doe"
      },
      "sentAt": "2024-01-19T15:00:00.000Z",
      "readAt": null,
      "attachments": []
    },
    {
      "id": "msg-124",
      "content": "Sure! What's your question?",
      "sender": {
        "id": "trainer-123",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "sentAt": "2024-01-19T15:05:00.000Z",
      "readAt": "2024-01-19T15:06:00.000Z",
      "attachments": []
    }
  ]
}
```

**Errors**:
- `403` - Not a participant in this conversation

---

### Send Message

Send a new message in a conversation.

**Endpoint**: `POST /chat/conversations/:conversationId/messages`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "content": "Thanks! See you tomorrow.",
  "attachments": [ // Optional
    {
      "type": "IMAGE",
      "url": "https://example.com/image.jpg",
      "filename": "workout-plan.jpg"
    }
  ]
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "msg-125",
    "content": "Thanks! See you tomorrow.",
    "senderId": "user-123",
    "conversationId": "conv-123",
    "sentAt": "2024-01-19T15:10:00.000Z",
    "attachments": [...]
  }
}
```

**Errors**:
- `400` - Empty message or validation error
- `403` - Not a participant

---

### Mark Message as Read

Mark a message as read.

**Endpoint**: `PATCH /chat/messages/:messageId/read`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "msg-123",
    "readAt": "2024-01-19T16:00:00.000Z"
  }
}
```

---

### Delete Message

Soft delete a message (only sender can delete).

**Endpoint**: `DELETE /chat/messages/:messageId`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Melding slettet"
}
```

**Errors**:
- `403` - Not the sender of this message

---

## Payments

Handle payments and subscriptions.

### Create Payment Intent

Create a Stripe payment intent.

**Endpoint**: `POST /payments/create-intent`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "amount": 1500,
  "currency": "NOK",
  "description": "Monthly membership fee"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "amount": 1500,
    "currency": "NOK"
  }
}
```

---

### Initiate Vipps Payment

Create a Vipps payment (Norwegian mobile payment).

**Endpoint**: `POST /payments/vipps/initiate`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "amount": 1500,
  "phoneNumber": "47123456789",
  "description": "Class booking payment"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "url": "https://vipps.no/pay/xxx",
    "amount": 1500
  }
}
```

---

### Get Payment History

Get user's payment history.

**Endpoint**: `GET /payments/history`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-123",
      "amount": 1500,
      "currency": "NOK",
      "status": "COMPLETED",
      "method": "VIPPS",
      "description": "Monthly membership",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## Platform Admin

Platform-level administration endpoints (PLATFORM_ADMIN/PLATFORM_OWNER only).

### Get Dashboard Metrics

Get platform-wide metrics.

**Endpoint**: `GET /platform/dashboard`

**Headers**: `Authorization: Bearer TOKEN` (Platform Admin required)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalTenants": 45,
    "activeTenants": 38,
    "suspendedTenants": 2,
    "totalUsers": 1245,
    "totalRevenue": 450000,
    "mrr": 125000,
    "growth": {
      "tenants": 8.5,
      "users": 12.3,
      "revenue": 15.7
    }
  }
}
```

---

### List All Tenants

Get all tenants in the system.

**Endpoint**: `GET /platform/tenants`

**Headers**: `Authorization: Bearer TOKEN`

**Query Parameters**:
- `status` (optional): ACTIVE, SUSPENDED, TRIAL
- `package` (optional): STARTER, BASIC, PRO, ENTERPRISE

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "tenant-123",
      "name": "FitStudio Oslo",
      "domain": "fitstudio-oslo.oblikey.com",
      "package": "PRO",
      "status": "ACTIVE",
      "users": 45,
      "revenue": 15000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create Tenant

Create a new tenant (onboard new customer).

**Endpoint**: `POST /platform/tenants`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "name": "Gym Oslo Sentrum",
  "domain": "gym-oslo",
  "package": "BASIC",
  "adminEmail": "admin@gymosl.no",
  "adminFirstName": "Admin",
  "adminLastName": "User"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "tenant-456",
      "name": "Gym Oslo Sentrum",
      "domain": "gym-oslo.oblikey.com",
      "package": "BASIC",
      "status": "ACTIVE"
    },
    "admin": {
      "id": "user-789",
      "email": "admin@gymoslo.no"
    }
  }
}
```

---

### Update Tenant Package

Change a tenant's subscription package.

**Endpoint**: `PATCH /platform/tenants/:tenantId/package`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "package": "PRO"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tenant-123",
    "package": "PRO",
    "updatedAt": "2024-01-19T16:00:00.000Z"
  }
}
```

---

### Suspend Tenant

Suspend a tenant's access.

**Endpoint**: `PATCH /platform/tenants/:tenantId/suspend`

**Headers**: `Authorization: Bearer TOKEN`

**Request Body**:
```json
{
  "reason": "Non-payment of invoice"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tenant-123",
    "status": "SUSPENDED",
    "suspensionReason": "Non-payment of invoice"
  }
}
```

---

### Unsuspend Tenant

Reactivate a suspended tenant.

**Endpoint**: `PATCH /platform/tenants/:tenantId/unsuspend`

**Headers**: `Authorization: Bearer TOKEN`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "tenant-123",
    "status": "ACTIVE"
  }
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

### Error Response Format

```json
{
  "success": false,
  "error": "Descriptive error message in Norwegian",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common HTTP Status Codes

| Status Code | Meaning | When It's Used |
|------------|---------|----------------|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Validation error, invalid input |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Authenticated but not authorized for action |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict (e.g., duplicate email) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error (logged for debugging) |

### Example Error Responses

**Validation Error** (400):
```json
{
  "success": false,
  "error": "Validering feilet",
  "details": {
    "email": "Ugyldig e-postformat",
    "password": "Passord må være minst 8 tegn"
  }
}
```

**Authentication Error** (401):
```json
{
  "success": false,
  "error": "Ugyldig eller utløpt token",
  "code": "INVALID_TOKEN"
}
```

**Authorization Error** (403):
```json
{
  "success": false,
  "error": "Du har ikke tilgang til denne ressursen",
  "code": "FORBIDDEN"
}
```

**Not Found** (404):
```json
{
  "success": false,
  "error": "Klasse ikke funnet",
  "code": "NOT_FOUND"
}
```

**Rate Limit** (429):
```json
{
  "success": false,
  "error": "For mange forespørsler. Prøv igjen senere.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### General Endpoints

- **Limit**: 100 requests per 15 minutes per IP
- **Header**: `X-RateLimit-Remaining` shows remaining requests

### Authentication Endpoints

- **Limit**: 5 requests per 15 minutes per IP
- **Endpoints**: `/auth/login`, `/auth/register`
- **Reason**: Prevent brute force attacks

### When Rate Limited

**Response**: `429 Too Many Requests`
```json
{
  "success": false,
  "error": "For mange forespørsler. Prøv igjen om 15 minutter.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

**Headers**:
- `Retry-After`: Seconds until limit resets
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Pagination

List endpoints support pagination:

### Query Parameters

- `limit` (optional): Number of items per page (default: 20, max: 100)
- `offset` (optional): Number of items to skip (default: 0)

**Example**: `GET /classes?limit=10&offset=20`

### Pagination Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 20,
    "hasMore": true
  }
}
```

---

## Filtering and Sorting

Many endpoints support filtering and sorting:

### Common Filter Parameters

- `search`: Text search across relevant fields
- `status`: Filter by status
- `type`: Filter by type
- `startDate` / `endDate`: Date range filters

### Sorting

- `sortBy`: Field to sort by (e.g., `createdAt`, `name`)
- `sortOrder`: `asc` or `desc`

**Example**: `GET /classes?sortBy=startTime&sortOrder=asc&status=ACTIVE`

---

## WebSockets (Future)

Real-time features (chat, notifications) will use WebSocket connections:

**Connection**: `wss://api.oblikey.com/ws`

**Authentication**: Send token in connection query parameter:
```
wss://api.oblikey.com/ws?token=YOUR_JWT_TOKEN
```

---

## Best Practices

### 1. Always Include Authorization Header

```javascript
const response = await fetch('/api/classes', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. Handle Errors Gracefully

```javascript
try {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });

  const data = await response.json();

  if (!data.success) {
    console.error('Error:', data.error);
    // Handle error
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### 3. Respect Rate Limits

Implement exponential backoff when rate limited:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }
}
```

### 4. Use Appropriate HTTP Methods

- `GET`: Retrieve data
- `POST`: Create new resources
- `PATCH`: Update existing resources (partial)
- `PUT`: Replace entire resource
- `DELETE`: Delete resources

### 5. Validate Input Client-Side

Validate data before sending to reduce unnecessary API calls:

```javascript
const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

if (!validateEmail(email)) {
  showError('Invalid email format');
  return;
}
```

---

## Support

For API support, please contact:
- **Email**: api-support@oblikey.com
- **Documentation**: https://docs.oblikey.com
- **Status Page**: https://status.oblikey.com

---

**API Version**: 1.0.0
**Last Updated**: 2024-01-19
