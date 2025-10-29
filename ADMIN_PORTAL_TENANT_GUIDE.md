# 🏢 Admin Portal - Tenant Administrasjon Guide

## 📋 Oversikt

Admin-portalen skal administrere **tenants** (kunder/virksomheter) som bruker ObliKey systemet. Hver tenant har sine egne brukere, data og modulinnstillinger.

---

## 🔄 Tenant Flow - Hvordan Alt Henger Sammen

### 1. Admin-Portal (Web) - Oppretter Tenant
```
Admin Portal (SUPER_ADMIN)
    ↓
POST /api/tenants
    ↓
Oppretter:
  - Tenant (subdomain, navn, kontaktinfo)
  - Admin bruker for tenant
  - Default tenant_settings
    ↓
Returnerer: tenant UUID + subdomain
```

### 2. Mobile App - Bruker Tenant
```
Mobile App (Bruker)
    ↓
Sender: tenantId: "subdomain" (f.eks. "oblikey-demo")
    ↓
Backend konverterer subdomain → UUID
    ↓
All data isolert per tenant UUID
```

### 3. Modul-Administrasjon
```
Admin Portal
    ↓
POST /api/tenant-settings/modules/toggle
    ↓
Toggle: accounting, shop, membership, etc.
    ↓
Mobile App ser endringer umiddelbart
```

---

## 🎯 Backend API - Klar til Bruk

### TENANT CRUD

#### 1. Opprett Tenant (SUPER_ADMIN)
```typescript
POST /api/tenants
Authorization: Bearer SUPER_ADMIN_TOKEN

Body:
{
  "name": "Ny Gym AS",
  "subdomain": "ny-gym",        // Brukes i mobile app
  "email": "kontakt@nygym.no",
  "phone": "+47 12345678",
  "address": "Gymveien 1, 0123 Oslo",
  "adminFirstName": "Admin",
  "adminLastName": "Bruker",
  "adminEmail": "admin@nygym.no",
  "adminPassword": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid-her",
    "name": "Ny Gym AS",
    "subdomain": "ny-gym",
    "email": "kontakt@nygym.no",
    "active": true,
    "users": [{
      "id": "admin-uuid",
      "email": "admin@nygym.no",
      "role": "ADMIN"
    }],
    "settings": {
      "classesEnabled": true,
      "chatEnabled": true,
      ...
    }
  },
  "message": "Tenant opprettet vellykket"
}
```

**Hva skjer:**
- ✅ Tenant opprettes med unikt subdomain
- ✅ Admin-bruker opprettes automatisk
- ✅ Default settings opprettes
- ✅ Klar for bruk i mobile app!

#### 2. Hent Alle Tenants (SUPER_ADMIN)
```typescript
GET /api/tenants
Authorization: Bearer SUPER_ADMIN_TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "ObliKey Demo",
      "subdomain": "oblikey-demo",
      "email": "admin@oblikey.no",
      "active": true,
      "createdAt": "2025-10-28T00:17:41.296Z",
      "_count": {
        "users": 30,
        "classes": 15,
        "bookings": 120
      }
    },
    ...
  ]
}
```

#### 3. Hent Spesifikk Tenant (SUPER_ADMIN/ADMIN)
```typescript
GET /api/tenants/:id
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "ObliKey Demo",
    "subdomain": "oblikey-demo",
    "settings": {
      "accountingEnabled": true,
      "classesEnabled": true,
      "ecommerceEnabled": true,
      ...
    },
    "_count": {
      "users": 30,
      "classes": 15,
      "bookings": 120,
      "ptSessions": 45
    }
  }
}
```

---

### MODUL ADMINISTRASJON

#### 1. Hent Modulstatus for Tenant
```typescript
GET /api/tenant-settings/modules
Authorization: Bearer TENANT_ADMIN_TOKEN

Response:
{
  "success": true,
  "data": {
    "accounting": true,
    "classes": true,
    "chat": true,
    "shop": true,
    "membership": false,
    "doorAccess": true
  }
}
```

#### 2. Toggle Modul (ADMIN)
```typescript
POST /api/tenant-settings/modules/toggle
Authorization: Bearer ADMIN_TOKEN

Body:
{
  "module": "membership",
  "enabled": true
}

Response:
{
  "success": true,
  "data": {
    // Full tenant_settings object
  },
  "message": "membership-modulen er aktivert"
}
```

**Tilgjengelige moduler:**
- `accounting` - Regnskapsmodul
- `classes` - Klasser/gruppetimer
- `chat` - Meldinger
- `shop` / `ecommerce` - Nettbutikk
- `membership` - Medlemskap
- `doorAccess` - Dørtilgang
- `landingPage` - Landingsside CMS

---

## 📱 Hvordan Mobile App Kobler Til

### Registrering
```typescript
// Mobile app sender:
POST /api/auth/register
{
  "email": "bruker@example.com",
  "password": "Pass123!",
  "firstName": "Test",
  "lastName": "Bruker",
  "username": "testbruker",
  "tenantId": "oblikey-demo"  // Subdomain!
}

// Backend gjør:
1. Finn tenant: WHERE subdomain = 'oblikey-demo'
2. Hent UUID: b79f1c2a-7b12-4ded-a6f8-df327d4bf10c
3. Opprett bruker med actualTenantId (UUID)
```

### Login
```typescript
// Mobile app sender:
POST /api/auth/login
{
  "identifier": "bruker@example.com",
  "password": "Pass123!"
}

// Backend returnerer JWT med:
{
  "userId": "...",
  "tenantId": "b79f1c2a-...",  // UUID
  "email": "...",
  "role": "CUSTOMER"
}
```

### Data Isolering
```typescript
// Alle API-kall bruker tenantId fra JWT token
// Prisma queries filtrerer automatisk:
prisma.user.findMany({
  where: { tenantId: req.user.tenantId }
})

// Data er 100% isolert per tenant
```

---

## 🗄️ Database Schema

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,  -- Brukes i mobile app
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  active BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  UNIQUE (tenantId, email),
  UNIQUE (tenantId, username)
);
```

### Tenant Settings Table
```sql
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY,
  tenantId UUID UNIQUE NOT NULL REFERENCES tenants(id),
  accountingEnabled BOOLEAN DEFAULT false,
  classesEnabled BOOLEAN DEFAULT true,
  chatEnabled BOOLEAN DEFAULT true,
  landingPageEnabled BOOLEAN DEFAULT false,
  ecommerceEnabled BOOLEAN DEFAULT false,
  membershipEnabled BOOLEAN DEFAULT false,
  doorAccessEnabled BOOLEAN DEFAULT false,
  -- ... andre innstillinger
);
```

---

## 🎨 Admin Portal - Implementasjon

### 1. Tenant Oversikt (Dashboard)
```tsx
import { useState, useEffect } from 'react';

function TenantDashboard() {
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetch('/api/tenants', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => setTenants(data.data));
  }, []);

  return (
    <div>
      <h1>Tenant Oversikt</h1>
      <table>
        <thead>
          <tr>
            <th>Navn</th>
            <th>Subdomain</th>
            <th>Brukere</th>
            <th>Aktiv</th>
            <th>Opprettet</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(tenant => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.subdomain}</td>
              <td>{tenant._count.users}</td>
              <td>{tenant.active ? '✅' : '❌'}</td>
              <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 2. Opprett Tenant Form
```tsx
function CreateTenantForm() {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      alert(`Tenant opprettet! Subdomain: ${data.data.subdomain}`);
      // Redirect til tenant-oversikt
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Opprett Ny Tenant</h2>

      <label>Bedriftsnavn *</label>
      <input
        required
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />

      <label>Subdomain * (brukes i mobile app)</label>
      <input
        required
        pattern="^[a-z0-9-]+$"
        value={formData.subdomain}
        onChange={(e) => setFormData({...formData, subdomain: e.target.value})}
        placeholder="min-gym"
      />

      <label>E-post *</label>
      <input
        required
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />

      {/* ... flere felt ... */}

      <h3>Admin Bruker</h3>

      <label>Admin E-post *</label>
      <input
        required
        type="email"
        value={formData.adminEmail}
        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
      />

      <label>Admin Passord *</label>
      <input
        required
        type="password"
        minLength={8}
        value={formData.adminPassword}
        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
      />

      <button type="submit">Opprett Tenant</button>
    </form>
  );
}
```

### 3. Modul Administrasjon
```tsx
function TenantModules({ tenantId }) {
  const [modules, setModules] = useState({});

  useEffect(() => {
    // Hent modulstatus
    fetch('/api/tenant-settings/modules', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => setModules(data.data));
  }, []);

  const toggleModule = async (module, enabled) => {
    const response = await fetch('/api/tenant-settings/modules/toggle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ module, enabled })
    });

    if (response.ok) {
      setModules(prev => ({ ...prev, [module]: enabled }));
    }
  };

  return (
    <div>
      <h2>Aktive Moduler</h2>
      {Object.entries(modules).map(([key, enabled]) => (
        <div key={key}>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggleModule(key, e.target.checked)}
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

## 🔐 Autentisering i Admin Portal

### Super Admin Login
Admin-portalen må logge inn som SUPER_ADMIN:

```typescript
POST /api/auth/login
{
  "identifier": "superadmin@oblikey.com",
  "password": "SuperSecure123!"
}

// Får JWT med role: "SUPER_ADMIN"
```

### Opprett Super Admin (Engangs-script)
```sql
-- Kjør kun én gang for å opprette super admin
INSERT INTO users (id, "tenantId", email, username, password, "firstName", "lastName", role)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM tenants WHERE subdomain = 'oblikey-demo' LIMIT 1),
  'superadmin@oblikey.com',
  'superadmin',
  '$2a$10$hashedpassword',  -- Hash "SuperPass123!"
  'Super',
  'Admin',
  'SUPER_ADMIN'
);
```

---

## ✅ Sjekkliste for Admin Portal

### Må Implementeres:
- [ ] Login-side (SUPER_ADMIN autentisering)
- [ ] Tenant oversikt (liste med alle tenants)
- [ ] Opprett tenant form
- [ ] Tenant detaljer-side
- [ ] Modul-administrasjon UI
- [ ] Tenant settings editor

### Backend Er Klar:
- ✅ POST /api/tenants (opprett)
- ✅ GET /api/tenants (list)
- ✅ GET /api/tenants/:id (detaljer)
- ✅ POST /api/tenant-settings/modules/toggle
- ✅ GET /api/tenant-settings/modules
- ✅ PATCH /api/tenants/:id/settings

---

## 🎯 Eksempel Flow

### 1. Admin Portal Oppretter Tenant
```
1. Super admin logger inn i admin-portal
2. Klikker "Ny Tenant"
3. Fyller ut form:
   - Navn: "Elite Gym AS"
   - Subdomain: "elite-gym"
   - Admin e-post: "admin@elitegym.no"
4. Klikker "Opprett"
5. Backend oppretter:
   - Tenant med subdomain "elite-gym"
   - Admin bruker
   - Default settings
```

### 2. Mobile App Bruker Tenant
```
1. Sluttbruker laster ned ObliKey app
2. Velger "Registrer"
3. Appen sender automatisk: tenantId: "elite-gym"
4. Backend finner tenant via subdomain
5. Bruker opprettes for "elite-gym"
6. Kan nå logge inn og bruke appen
```

### 3. Admin Portal Administrerer Moduler
```
1. Super admin åpner "Elite Gym" i portal
2. Går til "Moduler"
3. Aktiverer "Membership" modul
4. Elite Gym-brukere ser medlemskap-features umiddelbart i appen
```

---

## 📊 Status Nå

### Backend:
✅ Tenant CRUD fullstendig implementert
✅ Modul-administrasjon fungerer
✅ Super admin ruter klare
✅ Mobile app integrert

### Admin Portal:
❌ Ikke implementert enda (tom React app)
📋 API-dokumentasjon klar
📋 Eksempelkode klar

### Mobile App:
✅ Bruker subdomain som tenantId
✅ Backend konverterer til UUID
✅ Data isolert per tenant
✅ Moduler respekteres

---

## 🚀 Neste Steg

1. **Implementer Admin Portal UI**
   - Bruk React + TypeScript + Vite (allerede satt opp)
   - Følg eksempelkode over
   - Bruk Tailwind CSS eller Material-UI for styling

2. **Test Flow**
   - Opprett tenant i admin-portal
   - Test registrering i mobile app med ny subdomain
   - Verifiser data isolering

3. **Deploy**
   - Admin portal → Vercel/Netlify
   - Backend → allerede kjører
   - Mobile app → Expo

**Alt backend API er klart - admin-portalen kan bygges nå! 🎉**
