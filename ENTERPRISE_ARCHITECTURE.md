# ObliKey Enterprise - Multi-Tenant SaaS Platform

## 🎯 Konsept

En **white-label SaaS-plattform** som vi eier og drifter, hvor kunder leier løsningen basert på pakker de velger. All kontroll og oppdateringer skjer sentralt fra vår platform admin.

## 🏗️ Enterprise Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN (OSS)                          │
│     Vi administrerer alle tenants, pakker, billing, features    │
│              /platform-admin/* (super admin only)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
    ┌───────────▼──────────┐  ┌──────────▼──────────┐
    │   TENANT A           │  │   TENANT B          │
    │   (Fitnesssenter A)  │  │   (PT Studio B)     │
    │   - Basic pakke      │  │   - Enterprise      │
    │   - Landing + Book   │  │   - Full løsning    │
    │   - Vår branding     │  │   - Custom domain   │
    └──────────────────────┘  └─────────────────────┘
```

## 📦 Pakkebasert System

### Pakkeoversikt

| Pakke | Funksjoner | Pris/mnd |
|-------|-----------|----------|
| **Starter** | Landing page + Booking | 995 kr |
| **Basic** | Starter + Kunde portal + E-post | 1995 kr |
| **Pro** | Basic + PT modul + Betalinger | 3995 kr |
| **Enterprise** | Pro + Custom domain + API + White-label | 7995 kr |

### Feature Matrix

| Feature | Starter | Basic | Pro | Enterprise |
|---------|---------|-------|-----|------------|
| Landing Page | ✅ | ✅ | ✅ | ✅ |
| Booking System | ✅ | ✅ | ✅ | ✅ |
| Kunde Portal | ❌ | ✅ | ✅ | ✅ |
| E-post Varsler | ❌ | ✅ | ✅ | ✅ |
| PT Modul | ❌ | ❌ | ✅ | ✅ |
| Betalinger (Stripe/Vipps) | ❌ | ❌ | ✅ | ✅ |
| Treningsprogrammer | ❌ | ❌ | ✅ | ✅ |
| Statistikk & Rapporter | ❌ | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |
| White-label (fjern vårt branding) | ❌ | ❌ | ❌ | ✅ |
| API Tilgang | ❌ | ❌ | ❌ | ✅ |
| Prioritert Support | ❌ | ❌ | ❌ | ✅ |
| Max Brukere | 50 | 200 | 1000 | Unlimited |
| Max Klasser/mnd | 100 | 500 | Unlimited | Unlimited |

## 🎨 Multi-Branding System

### Tenant Configuration

Hver tenant har sin egen konfigurasjon som styrer utseende og funksjoner:

```typescript
interface TenantConfig {
  // Identifikasjon
  id: string;
  subdomain: string;           // tenant.oblikey.no
  customDomain?: string;       // www.kundens-domene.no

  // Branding
  branding: {
    companyName: string;       // "FitZone Oslo"
    logo: string;              // URL til logo
    favicon: string;
    primaryColor: string;      // "#FF5733"
    secondaryColor: string;
    accentColor: string;
    font: string;              // "Inter" | "Poppins" | etc
  };

  // Pakke & Features
  subscription: {
    plan: 'starter' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: Date;
    features: string[];        // ['booking', 'pt', 'payments']
  };

  // Feature Flags
  features: {
    booking: boolean;
    customerPortal: boolean;
    ptModule: boolean;
    trainingPrograms: boolean;
    payments: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    mobileApp: boolean;
    api: boolean;
    analytics: boolean;
  };

  // Limits
  limits: {
    maxUsers: number;
    maxClasses: number;
    maxStorage: number;        // MB
  };

  // Integrations
  integrations: {
    stripe?: { enabled: boolean; publicKey: string; };
    vipps?: { enabled: boolean; merchantId: string; };
    googleAnalytics?: { enabled: boolean; trackingId: string; };
  };

  // Metadata
  metadata: {
    createdAt: Date;
    onboardedBy: string;       // Platform admin user ID
    industry: string;          // "gym" | "pt" | "yoga" | etc
    country: string;
    language: string;
  };
}
```

## 🔐 Roller & Tilganger

### Platform Level (OSS)

| Rolle | Tilgang |
|-------|---------|
| **PLATFORM_OWNER** | Full tilgang til alt, alle tenants |
| **PLATFORM_ADMIN** | Administrer tenants, billing, support |
| **PLATFORM_SUPPORT** | Read-only tilgang, kunde support |

### Tenant Level (Kunde)

| Rolle | Tilgang |
|-------|---------|
| **TENANT_OWNER** | Full tilgang til sin tenant |
| **TENANT_ADMIN** | Administrere brukere, innstillinger |
| **TRAINER** | PT funksjoner, klasser |
| **CUSTOMER** | Book, se profil |

## 💳 Billing & Subscription System

### Billing Flow

```
1. Tenant velger pakke (via platform admin eller self-service)
   ↓
2. Stripe Subscription opprettes
   ↓
3. Tenant aktiveres med valgte features
   ↓
4. Månedlig/årlig auto-billing
   ↓
5. Ved payment failure → suspend tenant (soft delete)
   ↓
6. Ved kansellering → grace period (30 dager) → deaktiver
```

### Payment Integrations

**Stripe** (Standard for abonnementer)
- Subscription management
- Automatisk billing
- Invoice generation
- Payment failure handling

**Vipps** (For end-user payments i tenant)
- Kurs/time betalinger
- Medlemskap
- PT-økter

**Klarna** (Valgfritt)
- Installment payments
- For større pakker

## 🚀 Deployment Strategy

### Infrastructure

```
┌──────────────────────────────────────────────────────────┐
│                    Load Balancer                          │
│                  (Cloudflare / AWS ELB)                   │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐   ┌───▼────┐   ┌──▼─────┐
   │ App 1  │   │ App 2  │   │ App N  │  (Auto-scaling)
   │(Docker)│   │(Docker)│   │(Docker)│
   └────┬───┘   └───┬────┘   └──┬─────┘
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────▼──────────────┐
        │  PostgreSQL (Primary)    │
        │  + Read Replicas         │
        └──────────────────────────┘

        ┌──────────────────────────┐
        │  Redis (Cache/Sessions)  │
        └──────────────────────────┘

        ┌──────────────────────────┐
        │  S3/CloudStorage         │
        │  (Images, Files)         │
        └──────────────────────────┘
```

### Deployment Platforms

**Anbefalt Stack:**
- **App Hosting:** Railway / Render / DigitalOcean App Platform
- **Database:** Supabase / Railway PostgreSQL / AWS RDS
- **CDN:** Cloudflare
- **Storage:** AWS S3 / Cloudflare R2
- **Email:** SendGrid / AWS SES
- **Monitoring:** Sentry + Datadog / New Relic

**Alternative (Budget-friendly):**
- **App:** Render / Fly.io
- **DB:** Supabase (free tier → paid)
- **CDN:** Cloudflare (free)
- **Storage:** Cloudflare R2 (cheaper than S3)

### Docker Setup

```dockerfile
# Dockerfile (Backend + Frontend served together)
FROM node:18-alpine AS builder

# Build backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app

# Copy backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
RUN npm ci --production

# Copy frontend build
COPY --from=builder /app/frontend/dist ./public

# Serve frontend from backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Configuration

**Secrets Management:**
```bash
# Platform secrets (us)
PLATFORM_SECRET_KEY=xxx
DATABASE_URL=xxx
REDIS_URL=xxx
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# Per-tenant overrides (if needed)
TENANT_{ID}_STRIPE_KEY=xxx
TENANT_{ID}_VIPPS_KEY=xxx
```

## 🎛️ Platform Admin Features

### Dashboard Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Platform Dashboard                      │
├─────────────────────────────────────────────────────────┤
│  📊 Total Tenants: 45                                   │
│  💰 MRR: 125,775 kr                                     │
│  👥 Total End Users: 12,450                             │
│  📈 Growth: +15% this month                             │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬───────────┐
│  Active: 42  │ Trial: 3     │ Suspended: 2 │ Churn: 5% │
└──────────────┴──────────────┴──────────────┴───────────┘

Recent Tenants:
┌─────────────────────────────────────────────────────────┐
│ FitZone Oslo    │ Enterprise │ ✅ Active │ 325 users   │
│ YogaFlow Bergen │ Pro        │ ✅ Active │ 89 users    │
│ CrossFit Tromsø │ Basic      │ ⏸️ Trial  │ 15 users    │
└─────────────────────────────────────────────────────────┘
```

### Tenant Management

**Actions vi kan gjøre:**
1. ✅ Opprette ny tenant (onboarding)
2. ✅ Endre pakke (upgrade/downgrade)
3. ✅ Aktivere/deaktivere features
4. ✅ Suspend/unsuspend (ved non-payment)
5. ✅ Sette custom branding
6. ✅ Konfigurere integrasjoner
7. ✅ Se usage statistics
8. ✅ Access tenant as admin (impersonate)
9. ✅ Export tenant data
10. ✅ Migrate tenant data

### Automated Tenant Onboarding

**Self-Service Signup Flow:**

```
1. Prospect besøker oblikey.no/pricing
   ↓
2. Velger pakke (Starter, Basic, Pro, Enterprise)
   ↓
3. Fyller ut onboarding form:
   - Bedriftsnavn
   - Ønsket subdomain (fitzone → fitzone.oblikey.no)
   - Kontaktinfo
   - Bransje (Gym, PT, Yoga, etc.)
   ↓
4. Velger branding:
   - Last opp logo
   - Velg farger (eller auto-generate)
   - Velg font
   ↓
5. Betaling (Stripe Checkout):
   - Månedlig eller årlig
   - Første 14 dager gratis
   ↓
6. Automatisk provisjonering:
   - Opprett tenant i database
   - Setup subdomain
   - Opprett admin bruker
   - Send welcome email med innlogging
   ↓
7. Guided setup wizard:
   - Legg til første ansatte
   - Opprett første klasser
   - Konfigurer booking settings
   - Setup betalinger (Vipps/Stripe)
   ↓
8. 🎉 Live! Kunde kan bruke systemet
```

## 📊 Analytics & Monitoring

### Metrics vi tracker

**Platform Level:**
- Total tenants (active, trial, suspended)
- MRR (Monthly Recurring Revenue)
- Churn rate
- Customer acquisition cost
- Lifetime value
- Feature adoption rates
- System performance (uptime, response times)

**Tenant Level:**
- Daily/Monthly Active Users
- Bookings per month
- Revenue (for their business)
- Feature usage
- User growth
- Engagement metrics

### Alerting

**Vi får varsler ved:**
- Payment failures
- High error rates
- Performance degradation
- Security incidents
- Tenant approaching limits
- Unusual activity

## 🔄 Update Strategy

### Centralized Updates

**Fordel:** Vi oppdaterer alle kunder samtidig
- Deploy new version → all tenants get it
- No per-tenant deployments
- Feature flags control rollout

**Rollout Strategy:**
1. **Canary Deployment:** Test på 1-2 tenants først
2. **Gradual Rollout:** 10% → 50% → 100%
3. **Feature Flags:** Enable new features gradually
4. **Rollback:** Quick rollback if issues

### Database Migrations

```bash
# Run migration for all tenants
npx prisma migrate deploy

# Migrations are tenant-isolated but schema is shared
```

## 🛡️ Security & Compliance

### Data Isolation

- Row-level security med `tenantId`
- Prisma middleware for auto-filtering
- API validation av tenant access
- No cross-tenant data leaks

### GDPR Compliance

- Data export functionality
- Right to deletion
- Consent management
- Data processing agreements

### Security Features

- 2FA for platform admins
- Audit logs (all platform admin actions)
- Encryption at rest (database)
- Encryption in transit (SSL/TLS)
- Regular security scans
- Penetration testing

## 💰 Revenue Model

### Pricing Strategy

**For oss (ObliKey):**
- Starter: 995 kr/mnd × 30 kunder = 29,850 kr
- Basic: 1995 kr/mnd × 50 kunder = 99,750 kr
- Pro: 3995 kr/mnd × 20 kunder = 79,900 kr
- Enterprise: 7995 kr/mnd × 10 kunder = 79,950 kr

**Total MRR:** ~290,000 kr/mnd

**Costs:**
- Infrastructure: ~5,000 kr/mnd
- Email service: ~1,000 kr/mnd
- Payment processing: ~2-3%
- Support & development: Variabelt

**Profit margin:** ~80-90%

### Add-ons (Extra Revenue)

- 📱 Mobile App: +500 kr/mnd
- 📊 Advanced Analytics: +300 kr/mnd
- 🎓 Online Training: +800 kr/mnd
- 🛒 E-commerce: +600 kr/mnd
- 📞 SMS Notifications: +200 kr/mnd + usage
- 🎨 Custom Design: One-time 15,000 kr
- 📚 Onboarding/Training: 5,000 kr

## 🎯 Competitive Advantages

**Vs BoostSystem:**
1. ✅ Modern tech stack (React, TypeScript)
2. ✅ Better UX/UI
3. ✅ Faster performance
4. ✅ More flexible pricing
5. ✅ Better mobile experience
6. ✅ API access (Enterprise)
7. ✅ White-label options
8. ✅ More integrations

**Vs Building In-House:**
1. ✅ 10x cheaper
2. ✅ Live in days, not months
3. ✅ Continuous updates
4. ✅ Professional support
5. ✅ Proven solution
6. ✅ Scalable infrastructure

## 📱 Mobile Strategy

### Progressive Web App (PWA)

**Phase 1:** PWA (works on all devices)
- Responsive design
- Offline support
- Add to homescreen
- Push notifications

**Phase 2:** Native App (if demand)
- React Native
- iOS + Android
- Deep integrations
- Better performance

## 🔮 Roadmap

### Q1 2024
- ✅ Launch MVP (Basic pakke)
- ✅ Onboard first 10 customers
- ✅ Stripe integration
- ✅ Vipps integration

### Q2 2024
- 📱 Mobile app (React Native)
- 📊 Advanced analytics
- 🌍 Multi-language support
- 🎓 Online training/courses module

### Q3 2024
- 🛒 E-commerce/product sales
- 📹 Video streaming
- 🤝 Partnerships/integrations
- 📈 Marketing automation

### Q4 2024
- 🌐 International expansion
- 🏢 Enterprise features
- 🔌 Open API
- 🎨 Theme marketplace

---

**Dette er grunnlaget for en skalerbar, moderne SaaS-plattform som kan konkurrere med og overgå BoostSystem.no.**
