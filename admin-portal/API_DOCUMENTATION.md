# ObliKey Admin Portal - API Documentation

## Module Management API

Admin-portalen kan bruke disse endepunktene for å administrere moduler per tenant.

### Base URL
```
http://localhost:3000/api
```

### Authentication
Alle requests krever Bearer token i Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. Get All Module Statuses

Hent status for alle moduler for en tenant.

**Endpoint:**
```
GET /tenant-settings/modules
```

**Auth Required:** Ja (alle autentiserte brukere)

**Response:**
```json
{
  "success": true,
  "data": {
    "accounting": false,
    "classes": true,
    "chat": true,
    "landingPage": false,
    "shop": true,
    "ecommerce": true,
    "membership": false,
    "doorAccess": false
  }
}
```

**Module Keys:**
- `accounting` - Regnskapsmodul
- `classes` - Klasser/gruppetimer
- `chat` - Chat/meldinger
- `landingPage` - Landingsside CMS
- `shop` / `ecommerce` - Nettbutikk (begge mapper til samme felt)
- `membership` - Medlemskapssystem
- `doorAccess` - Dørtilgangskontroll

---

### 2. Toggle Module

Aktiver eller deaktiver en modul for en tenant.

**Endpoint:**
```
POST /tenant-settings/modules/toggle
```

**Auth Required:** Ja (kun ADMIN eller SUPER_ADMIN)

**Request Body:**
```json
{
  "module": "membership",
  "enabled": false
}
```

**Parameters:**
- `module` (string, required) - Modulnavn (se liste over)
- `enabled` (boolean, required) - true for å aktivere, false for å deaktivere

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "324f12bc-a256-4fda-a85d-f7c705624767",
    "tenantId": "b79f1c2a-7b12-4ded-a6f8-df327d4bf10c",
    "accountingEnabled": true,
    "classesEnabled": true,
    "chatEnabled": true,
    "landingPageEnabled": true,
    "ecommerceEnabled": true,
    "membershipEnabled": false,
    "doorAccessEnabled": true,
    ...
  },
  "message": "membership-modulen er deaktivert"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Ugyldig modul"
}
```

---

## Eksempel: JavaScript/TypeScript

```typescript
// Fetch all module statuses
async function getModuleStatuses(token: string) {
  const response = await fetch('http://localhost:3000/api/tenant-settings/modules', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Toggle a module
async function toggleModule(token: string, module: string, enabled: boolean) {
  const response = await fetch('http://localhost:3000/api/tenant-settings/modules/toggle', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ module, enabled })
  });
  return response.json();
}

// Usage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Get all statuses
const statuses = await getModuleStatuses(token);
console.log(statuses.data);

// Disable membership module
const result = await toggleModule(token, 'membership', false);
console.log(result.message); // "membership-modulen er deaktivert"
```

---

## React Example Component

```tsx
import { useState, useEffect } from 'react';

interface ModuleStatus {
  accounting: boolean;
  classes: boolean;
  chat: boolean;
  landingPage: boolean;
  shop: boolean;
  ecommerce: boolean;
  membership: boolean;
  doorAccess: boolean;
}

export function ModuleManager() {
  const [modules, setModules] = useState<ModuleStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/tenant-settings/modules', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setModules(data.data);
    }
  };

  const handleToggle = async (module: string, enabled: boolean) => {
    setLoading(true);
    const token = localStorage.getItem('token');

    const response = await fetch('/api/tenant-settings/modules/toggle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ module, enabled })
    });

    const data = await response.json();
    if (data.success) {
      await fetchModules(); // Refresh
    }
    setLoading(false);
  };

  if (!modules) return <div>Loading...</div>;

  return (
    <div>
      <h2>Module Management</h2>
      {Object.entries(modules).map(([key, value]) => (
        <div key={key}>
          <label>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleToggle(key, e.target.checked)}
              disabled={loading}
            />
            {key}
          </label>
        </div>
      ))}
    </div>
  );
}
```

---

## Notes

1. **Default Values:**
   - `classes` og `chat` er aktivert by default (true hvis ikke spesifisert)
   - Alle andre moduler er deaktivert by default

2. **Tenant Isolation:**
   - Alle endepunkter bruker automatisk `tenantId` fra JWT token
   - Admins kan bare endre innstillinger for sin egen tenant

3. **Real-time Updates:**
   - Kunde-appen (mobile) bruker `ModuleContext` som automatisk henter modulstatuser ved innlogging
   - Call `refreshModules()` fra context for å oppdatere etter endringer

4. **Error Handling:**
   - Ugyldig modul returnerer 400 med "Ugyldig modul"
   - Manglende auth returnerer 401 med "Ingen tilgangstoken"
   - Feil rolle returnerer 403 med "Ingen tilgang"
