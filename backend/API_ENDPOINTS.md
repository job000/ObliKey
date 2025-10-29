# New API Endpoints Summary

## Class Template System

### 1. Get All Templates
```
GET /classes/templates
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Morning Yoga",
      "templateName": "Standard Yoga Template",
      "description": "60-minute yoga session",
      "type": "GROUP_CLASS",
      "capacity": 20,
      "duration": 60,
      "isTemplate": true,
      "trainer": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://..."
      }
    }
  ]
}
```

### 2. Save Class as Template
```
PATCH /classes/:id/save-as-template
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```

**Request Body:**
```json
{
  "templateName": "Standard Morning Yoga"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isTemplate": true,
    "templateName": "Standard Morning Yoga",
    // ... other class fields
  },
  "message": "Klasse lagret som mal"
}
```

### 3. Create Class from Template
```
POST /classes/from-template/:templateId
Authorization: Bearer <token>
Roles: ADMIN, TRAINER
```

**Request Body:**
```json
{
  "startTime": "2025-11-01T10:00:00Z",
  "trainerId": "uuid" // optional, defaults to template's trainer
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Morning Yoga", // from template
    "description": "60-minute yoga session", // from template
    "type": "GROUP_CLASS", // from template
    "capacity": 20, // from template
    "duration": 60, // from template
    "startTime": "2025-11-01T10:00:00Z", // NEW - provided
    "endTime": "2025-11-01T11:00:00Z", // calculated
    "isTemplate": false, // NOT a template
    "trainer": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "message": "Klasse opprettet fra mal"
}
```

---

## Shopping Cart Reminders

### 1. Check Cart Reminder
```
GET /cart/check-reminder
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shouldRemind": true,
    "itemCount": 3,
    "cartAge": 86400000,
    "lastReminderSent": "2025-10-27T10:00:00Z"
  }
}
```

**Logic:**
- `shouldRemind` is `true` when:
  - Cart has items (itemCount > 0)
  - Cart was created more than 24 hours ago
  - No reminder sent in last 24 hours

### 2. Update Reminder Timestamp
```
POST /cart/update-reminder
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Påminnelse oppdatert"
}
```

**Use:** Call this endpoint when user dismisses the reminder modal/notification

---

## Frontend Integration Examples

### Class Templates

#### Fetch Templates for Admin
```typescript
async function loadClassTemplates() {
  const response = await fetch('/classes/templates', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const { data } = await response.json();
  return data; // Array of templates
}
```

#### Save Class as Template
```typescript
async function saveAsTemplate(classId: string, templateName: string) {
  const response = await fetch(`/classes/${classId}/save-as-template`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ templateName })
  });
  return response.json();
}
```

#### Create Class from Template
```typescript
async function createFromTemplate(
  templateId: string,
  startTime: string,
  trainerId?: string
) {
  const response = await fetch(`/classes/from-template/${templateId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ startTime, trainerId })
  });
  return response.json();
}
```

### Cart Reminders

#### Check Reminder on App Startup
```typescript
async function checkCartReminder() {
  const response = await fetch('/cart/check-reminder', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const { data } = await response.json();

  if (data.shouldRemind) {
    showCartReminderModal(data.itemCount);
  }
}

// Call on app initialization
useEffect(() => {
  if (isAuthenticated) {
    checkCartReminder();
  }
}, [isAuthenticated]);
```

#### Dismiss Reminder
```typescript
async function dismissCartReminder() {
  await fetch('/cart/update-reminder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  hideCartReminderModal();
}
```

#### Example Modal Component
```tsx
function CartReminderModal({ itemCount, onDismiss, onViewCart }) {
  return (
    <div className="modal">
      <h2>Cart Reminder</h2>
      <p>You have {itemCount} items in your cart. Complete your purchase?</p>
      <div className="actions">
        <button onClick={onViewCart}>View Cart</button>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

// Usage
<CartReminderModal
  itemCount={3}
  onViewCart={() => navigate('/cart')}
  onDismiss={async () => {
    await dismissCartReminder();
    setShowReminder(false);
  }}
/>
```

---

## Important Notes

### Class Templates
- Templates are **NOT bookable** - the `getClasses` endpoint excludes templates (`isTemplate: false`)
- Templates appear only in the dedicated `/classes/templates` endpoint
- Feedback is **NOT copied** when creating from template
- Each template can be reused unlimited times
- Templates store configuration, not specific instances

### Cart Reminders
- Reminders use 24-hour cooldown period
- Each user has their own cart (user-scoped)
- Cart is created automatically on first item add
- Reminder check should be done on app startup
- Update reminder timestamp when user dismisses modal

### Security
- All endpoints require authentication via Bearer token
- Template endpoints require ADMIN or TRAINER role
- Cart endpoints are automatically scoped to authenticated user
- Users cannot access or modify other users' carts
