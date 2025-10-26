# ObliKey Enterprise - Multi-Tenant SaaS Platform

> **En moderne white-label SaaS-løsning for fitness og PT-bransjen**
> Bedre enn BoostSystem • Pakkebasert • Full kontroll • Enkel deployment

---

## 🎯 Hva er ObliKey Enterprise?

ObliKey er en **enterprise-grade multi-tenant SaaS-plattform** som VI eier og drifter, hvor kunder leier løsningen basert på pakker de velger. All kontroll, oppdateringer og administrasjon skjer sentralt fra vår **Platform Admin Dashboard**.

### ✨ Hovedfordeler

| Funksjon | Beskrivelse |
|----------|-------------|
| 🎨 **White-Label** | Tilpass logo, farger, domene for hver kunde |
| 📦 **Pakkebasert** | 4 pakker (Starter → Enterprise) med ulike features |
| 💰 **Abonnement** | Automatisk billing via Stripe, 14 dagers gratis trial |
| 🔐 **Sentralisert Admin** | VI kontrollerer alt fra én platform |
| 🚀 **Rask Onboarding** | Ny kunde live på 5 minutter |
| 🔄 **Auto-Updates** | Alle kunder oppdateres samtidig |
| 💳 **Betalinger** | Stripe + Vipps integrert |
| 📊 **Analytics** | Track alle KPIs per kunde |

---

## 📦 Pakker & Priser

| Pakke | Pris/mnd | Funksjoner | Ideell for |
|-------|----------|-----------|------------|
| **Starter** | 995 kr | Landing + Booking | Små PT-studier |
| **Basic** | 1 995 kr | + Kunde-portal + E-post | Mellomstore gymer |
| **Pro** | 3 995 kr | + PT-modul + Betalinger | Store sentre |
| **Enterprise** | 7 995 kr | + Custom domain + API + White-label | Kjeder |

### Feature Matrix

| Feature | Starter | Basic | Pro | Enterprise |
|---------|:-------:|:-----:|:---:|:----------:|
| Landing Page | ✅ | ✅ | ✅ | ✅ |
| Bookingsystem | ✅ | ✅ | ✅ | ✅ |
| Kunde Portal | ❌ | ✅ | ✅ | ✅ |
| E-post Varsler | ❌ | ✅ | ✅ | ✅ |
| PT Modul | ❌ | ❌ | ✅ | ✅ |
| Stripe/Vipps | ❌ | ❌ | ✅ | ✅ |
| Treningsprogrammer | ❌ | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| API Tilgang | ❌ | ❌ | ❌ | ✅ |
| Max Brukere | 50 | 200 | 1000 | ∞ |

---

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────┐
│        PLATFORM ADMIN (Vi administrerer)        │
│  • Alle tenants  • Billing  • Support  • Stats │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼────────────┐
        │                        │
   ┌────▼─────┐            ┌────▼─────┐
   │ Tenant A │            │ Tenant B │
   │ FitZone  │            │ YogaFlow │
   │ Starter  │            │ Pro      │
   └──────────┘            └──────────┘
```

### Teknologistack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL (multi-tenant data isolation)
- Prisma ORM
- Redis (caching)
- Stripe (subscription billing)

**Frontend:**
- React 18 + TypeScript
- Vite (super-fast builds)
- TailwindCSS (utility-first CSS)
- React Router (client-side routing)

**Infrastructure:**
- Docker (containerization)
- PostgreSQL (database)
- Redis (caching/sessions)
- S3/R2 (file storage)
- Cloudflare (CDN + SSL)

---

## 🚀 Quick Start

### For Development

```bash
# 1. Clone repository
git clone https://github.com/yourorg/oblikey.git
cd oblikey

# 2. Start with Docker
docker-compose up -d

# 3. Run migrations
docker-compose exec app npx prisma migrate deploy

# 4. Open app
open http://localhost:3000
```

### For Production

```bash
# See DEPLOYMENT.md for detailed guide

# Quick deploy to Railway:
railway up

# Or Docker:
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📱 Platform Admin Dashboard

**URL:** `/platform-admin` (platform admin only)

### Funksjoner

1. **Dashboard**
   - Total tenants (active, trial, suspended)
   - MRR (Monthly Recurring Revenue)
   - Total end users
   - Growth metrics

2. **Tenant Management**
   - Opprett ny tenant (onboarding)
   - Endre pakke (upgrade/downgrade)
   - Aktivere/deaktivere features
   - Suspend/unsuspend (non-payment)
   - Se usage statistics
   - Impersonate (logg inn som kunde)

3. **Billing**
   - Se alle subscriptions
   - Fakturahistorikk
   - Payment failures
   - Refunds

4. **Analytics**
   - Revenue tracking
   - Churn rate
   - Feature adoption
   - Customer lifetime value

5. **Support**
   - Audit logs (alle admin actions)
   - Tenant support requests
   - System health monitoring

---

## 🎨 White-Label / Multi-Branding

Hver tenant kan ha:

```typescript
{
  // Identitet
  subdomain: "fitzone.oblikey.no",
  customDomain: "www.fitzone.no",  // Enterprise only

  // Branding
  branding: {
    logo: "https://cdn.oblikey.no/fitzone/logo.png",
    primaryColor: "#FF5733",
    secondaryColor: "#33C4FF",
    font: "Inter"
  },

  // Features (styres av pakke)
  features: {
    booking: true,
    ptModule: true,
    payments: true,
    // ... etc
  }
}
```

---

## 💳 Betalinger

### Stripe (Subscription Billing)

**For oss (ObliKey):**
- Månedlige/årlige abonnementer
- Automatisk billing
- Invoice generation
- Payment retry logic

**Setup:**
1. Create products in Stripe dashboard
2. Get Price IDs for each plan
3. Configure webhook endpoint
4. Test with Stripe CLI

### Vipps (End-User Payments)

**For tenants (deres kunder):**
- Kurs/timebetaling
- Medlemskap
- PT-økter

**Per-tenant configuration:**
- Each tenant gets own Vipps credentials
- Configured in Platform Admin
- Isolated payment flows

---

## 🔐 Sikkerhet & Compliance

### Data Isolation

- **Row-level security** via `tenantId`
- **Prisma middleware** for auto-filtering
- **No cross-tenant data leaks**
- **Audit logs** for all admin actions

### Encryption

- **In transit:** SSL/TLS (Cloudflare)
- **At rest:** PostgreSQL encryption
- **Secrets:** Environment variables (never in code)

### GDPR

- Data export functionality
- Right to deletion
- Consent management
- DPA (Data Processing Agreement) templates

---

## 📊 Revenue Model

### Eksempel MRR Calculation

```
Starter:  30 kunder × 995 kr  =  29,850 kr
Basic:    50 kunder × 1995 kr =  99,750 kr
Pro:      20 kunder × 3995 kr =  79,900 kr
Enterprise: 10 kunder × 7995 kr =  79,950 kr
────────────────────────────────────────────
Total MRR:                       289,450 kr

Infrastructure costs:             -5,000 kr
Payment processing (2.5%):        -7,236 kr
────────────────────────────────────────────
Net profit:                       277,214 kr
```

**Profit margin:** ~95% 💰

### Add-Ons (Extra Revenue)

- 📱 Mobile App: +500 kr/mnd
- 📊 Advanced Analytics: +300 kr/mnd
- 🛒 E-commerce: +600 kr/mnd
- 📞 SMS Notifications: +200 kr/mnd
- 🎨 Custom Design: 15,000 kr (one-time)

---

## 🛠️ For Utviklere

### Project Structure

```
oblikey/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── platformAdmin.controller.ts    # Platform admin
│   │   │   ├── auth.controller.ts              # Auth
│   │   │   ├── class.controller.ts             # Classes
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── featureFlag.ts                  # Feature flags
│   │   │   ├── auth.ts                         # JWT auth
│   │   │   └── tenant.ts                       # Tenant validation
│   │   ├── services/
│   │   │   ├── stripe.service.ts               # Stripe integration
│   │   │   ├── vipps.service.ts                # Vipps integration
│   │   │   └── email.ts                        # Email service
│   │   └── utils/
│   └── prisma/
│       └── schema-enterprise.prisma            # Full schema
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── platform-admin/                 # Platform admin pages
│   │   │   ├── DashboardPage.tsx              # Tenant dashboard
│   │   │   └── ...
│   │   ├── components/
│   │   └── services/
│   │       └── api.ts                          # API client
├── docker-compose.yml
├── Dockerfile
└── DEPLOYMENT.md
```

### Key Files

| File | Purpose |
|------|---------|
| `schema-enterprise.prisma` | Full database schema with subscriptions |
| `featureFlag.ts` | Middleware for feature gating |
| `platformAdmin.controller.ts` | Platform admin endpoints |
| `stripe.service.ts` | Stripe subscription management |
| `vipps.service.ts` | Vipps payment integration |

### Feature Flag System

```typescript
// Require feature for route
router.post('/pt/sessions',
  authenticate,
  requireFeature('ptModule'),  // ← Check if tenant has PT module
  (req, res) => ptController.createSession(req, res)
);

// Check limits
router.post('/classes',
  authenticate,
  checkLimits('classes'),      // ← Check if within monthly limit
  (req, res) => classController.create(req, res)
);
```

---

## 📈 Skalering

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 5  # Run 5 instances
```

### Database Scaling

- **Read replicas** for read-heavy workloads
- **Connection pooling** (PgBouncer)
- **Caching** with Redis

### CDN

- **Cloudflare** for static assets
- **Edge caching** for improved performance globally

---

## 🎯 Competitive Advantages

### Vs BoostSystem

| Feature | BoostSystem | ObliKey |
|---------|:-----------:|:-------:|
| Modern UI/UX | ❌ | ✅ |
| TypeScript | ❌ | ✅ |
| Docker Deploy | ❌ | ✅ |
| API Access | Enterprise only | Pro+ |
| White-label | ❌ | Enterprise |
| Custom Domain | ❌ | Enterprise |
| Vipps Integration | ✅ | ✅ |
| Price (Basic) | 2,500 kr | 1,995 kr |

### Vs Building In-House

- **10x cheaper** than hiring developers
- **Live in days**, not months
- **Continuous updates** included
- **Professional support**
- **Proven, tested solution**

---

## 📞 Support & Documentation

### Documentation

- **QUICK_START.md** - Development setup
- **ARCHITECTURE.md** - Technical details
- **ENTERPRISE_ARCHITECTURE.md** - Platform overview
- **DEPLOYMENT.md** - Production deployment
- **API_DOCS.md** - API reference (coming soon)

### Support Channels

- 📧 Email: support@oblikey.com
- 💬 Discord: [discord.gg/oblikey](https://discord.gg/oblikey)
- 📖 Docs: [docs.oblikey.com](https://docs.oblikey.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yourorg/oblikey/issues)

---

## 🗺️ Roadmap

### Q1 2024 ✅
- ✅ MVP launch
- ✅ Basic + Pro packages
- ✅ Stripe + Vipps
- ✅ Docker deployment

### Q2 2024 🚧
- 📱 Mobile app (React Native)
- 📊 Advanced analytics dashboard
- 🌍 Multi-language support
- 🎓 Online training module

### Q3 2024 📋
- 🛒 E-commerce/product sales
- 📹 Video streaming
- 🤝 Partner integrations (Strava, Fitbit)
- 📈 Marketing automation

### Q4 2024 💭
- 🌐 International expansion
- 🏢 Franchise management
- 🔌 Public API
- 🎨 Theme marketplace

---

## 📄 Lisens

**Proprietary** - Alle rettigheter reservert

Dette er en commercial SaaS-løsning. Ikke til fri bruk eller videredistribusjon.

For lisens spørsmål: license@oblikey.com

---

## 👥 Team

Bygget med ❤️ av ObliKey-teamet

- **Backend:** Node.js + TypeScript
- **Frontend:** React + TypeScript
- **Database:** PostgreSQL + Prisma
- **Infrastructure:** Docker + Railway

---

**Klar til å revolusjonere fitness-bransjen? La oss bygge fremtiden sammen! 🚀**
