# ObliKey - Komplett Rolleoversikt

## 🎭 Alle Roller i Systemet

### 📍 Tenant-Nivå Roller
Disse rollene gjelder innenfor hver enkelt gym/bedrift (tenant).

#### 1. SUPER_ADMIN
**Full kontroll over tenant**
- ✅ Administrere alle brukere
- ✅ Opprette og slette ADMIN-brukere
- ✅ Endre subscription-plan
- ✅ Tilgang til alle moduler
- ✅ Se økonomiske rapporter
- ✅ Konfigurere integrasjoner
- ✅ White-label innstillinger

**Typisk bruksområde:** Eier av gym-kjeden

#### 2. ADMIN
**Administrator for tenant**
- ✅ Administrere brukere (TRAINER, CUSTOMER)
- ✅ Opprette og administrere klasser
- ✅ Se alle bookinger
- ✅ Håndtere betalinger
- ✅ Se rapporter og statistikk
- ✅ Chat med alle brukere
- ✅ Sende e-post/SMS-varsler
- ❌ Kan ikke endre subscription
- ❌ Kan ikke slette andre ADMIN

**Typisk bruksområde:** Daglig leder, resepsjonist

#### 3. TRAINER (PT)
**Personal Trainer / Instruktør**
- ✅ Opprette gruppeklasser
- ✅ Opprette PT-økter
- ✅ Lage treningsprogrammer
- ✅ Se egne kunder
- ✅ Chat med egne kunder
- ✅ Se bookinger til egne klasser
- ❌ Kan ikke se andre trainers kunder
- ❌ Kan ikke administrere brukere
- ❌ Kan ikke se økonomiske rapporter

**Typisk bruksområde:** PT, gruppetimeinstruktør, yogalærer

#### 4. CUSTOMER
**Vanlig bruker / Medlem**
- ✅ Booke klasser
- ✅ Avbestille bookinger
- ✅ Se egne PT-økter
- ✅ Se egne treningsprogrammer
- ✅ Redigere profil
- ✅ Chat med ADMIN/TRAINER
- ✅ Se betalingshistorikk
- ❌ Kan ikke opprette klasser
- ❌ Kan ikke se andre brukere

**Typisk bruksområde:** Gymmmedlemmer

---

### 🌐 Platform-Nivå Roller
Disse rollene gjelder for SaaS-plattformen (multi-tenant).

#### 1. PLATFORM_OWNER
**Plattform-eier (Super-admin)**
- ✅ Full tilgang til alt
- ✅ Opprette/slette tenants
- ✅ Opprette PLATFORM_ADMIN
- ✅ Se all fakturering
- ✅ Konfigurere plattform-innstillinger
- ✅ Tilgang til alle tenants' data
- ✅ Deploy nye features
- ✅ Database-migrasjoner

**Typisk bruksområde:** CEO, CTO

#### 2. PLATFORM_ADMIN
**Platform administrator**
- ✅ Opprette tenants
- ✅ Håndtere subscription-planer
- ✅ Se fakturering for alle tenants
- ✅ Support - se tenant-data (read-only)
- ✅ Suspendere/aktivere tenants
- ✅ Endre tenant subscription
- ❌ Kan ikke slette PLATFORM_OWNER
- ❌ Kan ikke deploy kode

**Typisk bruksområde:** Platform manager, sales team

#### 3. PLATFORM_SUPPORT
**Support-team (kun lesetilgang)**
- ✅ Se tenant-informasjon
- ✅ Se brukere i tenants
- ✅ Se bookinger og klasser
- ✅ Chat med tenant admins
- ❌ Kan ikke endre data
- ❌ Kan ikke se betalingsinformasjon
- ❌ Kan ikke suspendere tenants

**Typisk bruksområde:** Kundeservice

---

## 🔐 Tilgangskontroll per Funksjon

### Klasser (Classes)
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Opprette klasse | ✅ | ✅ | ✅ | ❌ |
| Se alle klasser | ✅ | ✅ | ✅ | ✅ |
| Redigere klasse | ✅ | ✅ | ✅* | ❌ |
| Slette klasse | ✅ | ✅ | ✅* | ❌ |
| Booke klasse | ✅ | ✅ | ✅ | ✅ |

*Kun egne klasser

### PT-Økter
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Opprette PT-økt | ✅ | ✅ | ✅ | ❌ |
| Se alle PT-økter | ✅ | ✅ | ❌ | ❌ |
| Se egne PT-økter | ✅ | ✅ | ✅ | ✅ |
| Avlyse PT-økt | ✅ | ✅ | ✅* | ✅* |

*Kun egne økter

### Brukere (Users)
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Se alle brukere | ✅ | ✅ | ❌ | ❌ |
| Se egne kunder | ✅ | ✅ | ✅ | ❌ |
| Opprette bruker | ✅ | ✅ | ❌ | ❌ |
| Deaktivere bruker | ✅ | ✅ | ❌ | ❌ |
| Slette bruker | ✅ | ✅ | ❌ | ❌ |
| Endre rolle | ✅ | ✅* | ❌ | ❌ |

*Ikke til ADMIN eller SUPER_ADMIN

### Chat / Meldinger
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Start samtale | ✅ | ✅ | ✅ | ❌ |
| Chat med alle | ✅ | ✅ | ❌ | ❌ |
| Chat med egne kunder | ✅ | ✅ | ✅ | - |
| Svare på meldinger | ✅ | ✅ | ✅ | ✅ |

### Betalinger
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Se alle betalinger | ✅ | ✅ | ❌ | ❌ |
| Se egne betalinger | ✅ | ✅ | ✅ | ✅ |
| Behandle betalinger | ✅ | ✅ | ❌ | ❌ |
| Refundere | ✅ | ✅ | ❌ | ❌ |

### Rapporter / Analytics
| Handling | SUPER_ADMIN | ADMIN | TRAINER | CUSTOMER |
|----------|-------------|-------|---------|----------|
| Dashboard statistikk | ✅ | ✅ | ✅* | ✅* |
| Økonomiske rapporter | ✅ | ✅ | ❌ | ❌ |
| Brukerstatistikk | ✅ | ✅ | ❌ | ❌ |

*Kun egen statistikk

---

## 🔨 Implementering i Kode

### Backend - Middleware

```typescript
// middleware/auth.ts
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Du har ikke tilgang til denne ressursen'
      });
    }

    next();
  };
};

// Bruk i routes:
router.post('/classes',
  authenticate,
  authorize('ADMIN', 'TRAINER'),
  classController.createClass
);
```

### Frontend - Conditional Rendering

```typescript
// components/Layout.tsx
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();

// Vis admin-link kun for ADMIN og SUPER_ADMIN
{(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
  <Link to="/admin">Admin Panel</Link>
)}

// Vis "Opprett klasse" kun for ADMIN og TRAINER
{(user?.role === 'ADMIN' || user?.role === 'TRAINER') && (
  <button>Opprett Klasse</button>
)}
```

### Database - Prisma Enum

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  TRAINER
  CUSTOMER
}

enum PlatformRole {
  PLATFORM_OWNER
  PLATFORM_ADMIN
  PLATFORM_SUPPORT
}

model User {
  id    String   @id @default(uuid())
  role  UserRole @default(CUSTOMER)
  // ...
}

model PlatformAdmin {
  id    String       @id @default(uuid())
  role  PlatformRole
  // ...
}
```

---

## 📝 Standard Brukerflyt

### Ny Tenant Opprettes
1. **PLATFORM_ADMIN** oppretter tenant via platform admin panel
2. Første bruker får automatisk **SUPER_ADMIN** rolle
3. **SUPER_ADMIN** inviterer **ADMIN** brukere
4. **ADMIN** oppretter **TRAINER** og **CUSTOMER** brukere

### Daglig Drift
1. **CUSTOMER** registrerer seg selv (eller blir opprettet av ADMIN)
2. **TRAINER** oppretter klasser og PT-økter
3. **CUSTOMER** booker klasser
4. **ADMIN** følger med på statistikk og betalinger

### Support Scenario
1. **CUSTOMER** sender support-henvendelse via chat
2. **ADMIN** eller **TRAINER** svarer
3. Hvis nødvendig, eskaleres til **PLATFORM_SUPPORT**
4. **PLATFORM_ADMIN** kan suspendere tenant hvis nødvendig

---

## 🚀 Endre Brukerrolle

### Via Admin Panel
```typescript
// AdminPage.tsx - Endre rolle funksjon
const handleChangeRole = async (userId: string) => {
  const newRole = prompt('Velg ny rolle (CUSTOMER, TRAINER, ADMIN):');
  await api.updateUserRole(userId, newRole);
};
```

### Via Backend API
```bash
PATCH /api/users/:userId/role
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "role": "TRAINER"
}
```

### Via Database (Emergency)
```bash
cd backend
node update-user-role.js
```

---

## 🔒 Sikkerhet

### Aldri Tillat:
- ❌ CUSTOMER oppgradere seg selv til ADMIN
- ❌ TRAINER se andre trainers private data
- ❌ ADMIN slette SUPER_ADMIN
- ❌ Frontend-only rolle-sjekk (alltid valider backend)

### Alltid Sjekk:
- ✅ Rolle på backend (middleware)
- ✅ Tenant isolation (bruker kan kun se data fra sin tenant)
- ✅ Feature flags (subscription-plan)
- ✅ Audit logging (hvem gjorde hva)

---

## 📊 Rollefordeling - Typisk Gym

**ØnskeBO Fitness** (50 medlemmer)
- 1x SUPER_ADMIN (Eier)
- 2x ADMIN (Daglig leder + resepsjonist)
- 5x TRAINER (PTs og instruktører)
- 42x CUSTOMER (Medlemmer)

**StorGym Kjede** (500 medlemmer, 3 lokasjoner)
- 1x SUPER_ADMIN (Kjede-eier)
- 6x ADMIN (2 per lokasjon)
- 25x TRAINER
- 468x CUSTOMER

---

## 🎯 Oppsummering

| Nivå | Roller | Bruksområde |
|------|--------|-------------|
| **Platform** | OWNER, ADMIN, SUPPORT | SaaS-drift |
| **Tenant** | SUPER_ADMIN, ADMIN | Gym-administrasjon |
| **Staff** | TRAINER | Personell |
| **Member** | CUSTOMER | Vanlige brukere |

Systemet er **modulbasert og rollebasert** - hver funksjon sjekker:
1. ✅ Er brukeren autentisert?
2. ✅ Har brukeren riktig rolle?
3. ✅ Er feature aktivert for tenant?
4. ✅ Tilhører data brukerens tenant?
