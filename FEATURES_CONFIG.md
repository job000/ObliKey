# ObliKey - Modulbasert Features Konfigurasjon

## 📋 Oversikt

Dette dokumentet forklarer ObliKeys modulbaserte arkitektur og hvordan funksjoner enkelt kan aktiveres/deaktiveres per kunde/tenant.

## 🎯 Roller i Systemet

### Tenant-nivå (Gym/Bedrift)
| Rolle | Beskrivelse | Tilgang |
|-------|-------------|---------|
| `SUPER_ADMIN` | Full kontroll over tenant | Alt |
| `ADMIN` | Administrator | Brukere, klasser, betalinger, rapporter |
| `TRAINER` | PT/Instruktør | Opprette klasser/PT-økter, se egne kunder |
| `CUSTOMER` | Vanlig bruker | Booke timer, se treningsprogrammer |

### Platform-nivå (SaaS)
| Rolle | Beskrivelse | Tilgang |
|-------|-------------|---------|
| `PLATFORM_OWNER` | Plattform-eier | Full kontroll over hele SaaS |
| `PLATFORM_ADMIN` | Platform admin | Håndtere tenants, fakturering |
| `PLATFORM_SUPPORT` | Support-team | Kun lesetilgang |

## 🧩 Modulbasert Arkitektur

### Backend Struktur

```
backend/
├── src/
│   ├── controllers/      # Business logic per modul
│   │   ├── auth.controller.ts
│   │   ├── class.controller.ts
│   │   ├── booking.controller.ts
│   │   ├── pt.controller.ts
│   │   ├── user.controller.ts
│   │   ├── chat.controller.ts
│   │   └── payment.controller.ts
│   ├── routes/           # API endpoints per modul
│   │   ├── auth.routes.ts
│   │   ├── class.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── pt.routes.ts
│   │   ├── user.routes.ts
│   │   ├── chat.routes.ts
│   │   └── payment.routes.ts
│   ├── middleware/       # Auth, roller, validering
│   │   ├── auth.ts
│   │   ├── roleCheck.ts
│   │   └── errorHandler.ts
│   └── services/         # Eksterne tjenester
│       ├── email.ts
│       ├── stripe.ts
│       └── storage.ts
```

### Frontend Struktur

```
frontend/
├── src/
│   ├── pages/           # En side per modul
│   │   ├── DashboardPage.tsx
│   │   ├── ClassesPage.tsx
│   │   ├── BookingsPage.tsx
│   │   ├── PTSessionsPage.tsx
│   │   ├── TrainingProgramsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ChatPage.tsx
│   ├── components/      # Gjenbrukbare komponenter
│   ├── contexts/        # State management
│   └── services/        # API klient
```

## ⚙️ Feature Flags per Tenant

### Database: `tenant_features` tabell

```typescript
model TenantFeatures {
  id                   String  @id @default(uuid())
  tenantId             String  @unique

  // Booking Features
  booking              Boolean @default(true)
  customerPortal       Boolean @default(false)

  // PT Module
  ptModule             Boolean @default(false)
  trainingPrograms     Boolean @default(false)

  // Payments
  payments             Boolean @default(false)

  // Communication
  emailNotifications   Boolean @default(false)
  smsNotifications     Boolean @default(false)
  pushNotifications    Boolean @default(false)

  // Advanced
  analytics            Boolean @default(false)
  apiAccess            Boolean @default(false)
  mobileApp            Boolean @default(false)
  whiteLabel           Boolean @default(false)
  customDomain         Boolean @default(false)
}
```

### Bruk i Kode

**Backend - Middleware:**
```typescript
// middleware/featureCheck.ts
export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;

    const features = await prisma.tenantFeatures.findUnique({
      where: { tenantId }
    });

    if (!features || !features[feature]) {
      return res.status(403).json({
        error: 'Denne funksjonen er ikke aktivert for din bedrift'
      });
    }

    next();
  };
};

// Bruk:
router.post('/pt/sessions',
  authenticate,
  requireFeature('ptModule'),
  ptController.createSession
);
```

**Frontend - Hook:**
```typescript
// hooks/useFeatures.ts
export function useFeatures() {
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    // Hent features for current tenant
    fetchTenantFeatures().then(setFeatures);
  }, []);

  return {
    hasFeature: (feature: string) => features?.[feature] || false,
    features
  };
}

// Bruk i komponenter:
const { hasFeature } = useFeatures();

{hasFeature('ptModule') && (
  <Link to="/pt-sessions">PT Økter</Link>
)}
```

## 📦 Subscription Plans og Features

### Plan Nivåer

| Plan | Pris/mnd | Features |
|------|----------|----------|
| **STARTER** | 995 NOK | Booking, basis |
| **BASIC** | 1995 NOK | + Kundeportal, e-post |
| **PRO** | 3995 NOK | + PT-modul, betalinger, SMS |
| **ENTERPRISE** | 7995 NOK | + API, white-label, custom domain |

### Plan -> Features Mapping

```typescript
// Fra platformAdmin.controller.ts
private getPlanFeatures(plan: string): any {
  const features = {
    STARTER: {
      booking: true,
      customerPortal: false,
      ptModule: false,
      payments: false,
      emailNotifications: false,
    },
    BASIC: {
      booking: true,
      customerPortal: true,
      ptModule: false,
      payments: false,
      emailNotifications: true,
    },
    PRO: {
      booking: true,
      customerPortal: true,
      ptModule: true,
      payments: true,
      emailNotifications: true,
      smsNotifications: true,
      analytics: true,
    },
    ENTERPRISE: {
      // Alt aktivert
      booking: true,
      customerPortal: true,
      ptModule: true,
      trainingPrograms: true,
      payments: true,
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      analytics: true,
      apiAccess: true,
      mobileApp: true,
      whiteLabel: true,
      customDomain: true,
    }
  };

  return features[plan] || features.STARTER;
}
```

## 🔧 Legge til Ny Feature

### 1. Database Migration

```prisma
// Legg til i TenantFeatures model
model TenantFeatures {
  // ... existing fields
  newFeature Boolean @default(false)
}
```

Kjør migration:
```bash
npx prisma migrate dev --name add_new_feature
```

### 2. Backend Route

```typescript
// routes/newFeature.routes.ts
import { Router } from 'express';
import { NewFeatureController } from '../controllers/newFeature.controller';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/featureCheck';

const router = Router();
const controller = new NewFeatureController();

router.use(authenticate);
router.use(requireFeature('newFeature'));

router.get('/', controller.getAll);
router.post('/', controller.create);

export default router;
```

### 3. Frontend Side

```typescript
// pages/NewFeaturePage.tsx
import { useFeatures } from '../hooks/useFeatures';

export default function NewFeaturePage() {
  const { hasFeature } = useFeatures();

  if (!hasFeature('newFeature')) {
    return <UpgradePlanPrompt feature="newFeature" />;
  }

  return (
    <Layout>
      {/* Your new feature UI */}
    </Layout>
  );
}
```

### 4. Legg til i Navigation (hvis role har tilgang)

```typescript
// components/Layout.tsx
{hasFeature('newFeature') && (user.role === 'ADMIN' || user.role === 'TRAINER') && (
  <NavLink to="/new-feature">Ny Feature</NavLink>
)}
```

### 5. Oppdater Plan Features

```typescript
// platformAdmin.controller.ts
PRO: {
  // ... existing features
  newFeature: true,  // Legg til her
},
```

## 🎨 Best Practices

### 1. **Separation of Concerns**
- Hver modul har sin egen controller, routes, og page
- Hold business logic i controllers
- Hold UI logic i components/pages

### 2. **Role-Based Access Control (RBAC)**
```typescript
// Alltid sjekk rolle og features
router.post('/classes',
  authenticate,
  authorize('ADMIN', 'TRAINER'),
  requireFeature('booking'),
  classController.create
);
```

### 3. **Feature Toggles**
```typescript
// Bruk feature flags i stedet for å slette kode
if (hasFeature('betaFeature')) {
  // Ny funksjonalitet
} else {
  // Gammel funksjonalitet
}
```

### 4. **Graceful Degradation**
```typescript
// Hvis feature ikke er tilgjengelig, vis upgrade-prompt
{!hasFeature('analytics') ? (
  <UpgradePrompt feature="analytics" />
) : (
  <AnalyticsDashboard />
)}
```

### 5. **Database Migrations**
- Alltid bruk Prisma migrations
- Test migrations i development først
- Backup database før production migrations

## 🚀 Aktivere/Deaktivere Features

### For Én Tenant (via API)

```bash
# Aktiver PT-modul for en tenant
curl -X PATCH http://localhost:3000/api/platform/tenants/TENANT_ID/features \
  -H "Authorization: Bearer PLATFORM_ADMIN_TOKEN" \
  -d '{"ptModule": true}'
```

### For Alle Tenants på en Plan

```typescript
// platformAdmin.controller.ts
async updateTenantPlan(req, res) {
  const { plan } = req.body;

  // Oppdater features basert på plan
  await prisma.tenantFeatures.update({
    where: { tenantId },
    data: this.getPlanFeatures(plan)
  });
}
```

### Via Admin Panel

Gå til **Platform Admin > Tenants > [Velg Tenant] > Features**

## 📊 Eksempel: PT-Modul som Feature

### Backend
- ✅ `pt.controller.ts` - Håndterer PT-økter
- ✅ `pt.routes.ts` - API endpoints med `requireFeature('ptModule')`

### Frontend
- ✅ `PTSessionsPage.tsx` - Vises kun hvis `hasFeature('ptModule')`
- ✅ Navigation viser "PT Økter" kun hvis feature er aktivert

### Database
- ✅ `ptSessions` tabell
- ✅ `TenantFeatures.ptModule` boolean
- ✅ Kun BASIC+ planer har tilgang

## 🔐 Sikkerhet

1. **Alltid valider på backend** - Aldri stol på frontend checks
2. **Sjekk både rolle OG feature** - Dobbel sikkerhet
3. **Log feature access** - Spor hvem som bruker hva
4. **Rate limiting** - Per feature, ikke bare globalt

## 📝 Oppsummering

ObliKey bruker en **modulbasert arkitektur** der:
- ✅ Hver feature er en egen modul (controller + routes + page)
- ✅ Features aktiveres/deaktiveres via `TenantFeatures` tabell
- ✅ Planer (STARTER, BASIC, PRO, ENTERPRISE) mapper til feature-sett
- ✅ Roller (ADMIN, TRAINER, CUSTOMER) bestemmer hvem som kan bruke features
- ✅ Frontend og backend sjekker features uavhengig

Dette gjør det **enkelt** å:
- 🚀 Legge til nye features
- 🔧 Aktivere/deaktivere for spesifikke kunder
- 💰 Lage nye subscription-planer
- 📦 Deploye kun moduler kunden betaler for
