# ObliKey - Multi-Tenant SaaS Platform

En komplett multi-tenant SaaS-plattform for treningssentre, med omfattende funksjoner for medlemskap, booking, e-handel, regnskap og dørtilgangsstyring.

## Oversikt

ObliKey er en fullstack multi-tenant SaaS-plattform bygget for treningssentre og fitnessklubber. Plattformen tilbyr komplett administrasjon av medlemskap, PT-timer, klassebookinger, e-handel, regnskap og fysisk dørtilgang.

### Nøkkelfunksjoner

- **Multi-Tenant Arkitektur**: Fullstendig isolerte data per tenant
- **Super Admin Portal**: Sentralisert administrasjon av alle tenants med full bruker CRUD
- **Feature Management**: Fleksibel aktivering/deaktivering av funksjoner per tenant
- **Subscription Management**: Håndtering av abonnementer og fakturer
- **Mobile-First**: React Native (Expo) app med full iOS og Android støtte
- **Sikker Autentisering**: JWT-basert auth med role-based access control

## Teknisk Stack

### Backend
- **Runtime**: Node.js med TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL med Prisma ORM
- **Auth**: JWT (jsonwebtoken)
- **Storage**: Cloudinary
- **Payments**: Stripe

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation v6
- **State**: Context API + Hooks
- **Platform**: iOS, Android, Web

## Kom i Gang

### Backend Setup

1. Klon repository og installer dependencies:
```bash
git clone https://github.com/job000/ObliKey.git
cd ObliKey/backend
npm install
```

2. Konfigurer `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/oblikey"
JWT_SECRET="din-sikre-secret-key"
PORT=3000
```

3. Kjør migrasjoner og start server:
```bash
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npx expo start --ios  # eller --android / --web
```

## Super Admin Portal

Super Admin får full kontroll over:

### Tenant Management
- Opprett, rediger og slett tenants
- Aktiver/deaktiver tenants
- Full brukeradministrasjon per tenant:
  - Legg til nye brukere (ADMIN/CUSTOMER)
  - Rediger brukerinfo, rolle og aktiv status
  - Slett brukere

### Feature Management
- Globale features
- Feature packs
- Tenant-spesifikk aktivering

### Subscription Management
- Abonnementstyper
- Fakturering
- Trial tracking

## Nyeste Endringer (v2.0.1)

### Navigation Fix for Super Admin (2025-10-29)
- ✅ Fjernet "Admin" tab for SUPER_ADMIN (bruker dedikert "Super Admin" tab)
- ✅ Fjernet "Regnskap" tab for SUPER_ADMIN (tenant-spesifikk funksjonalitet)
- ✅ Klarere navigasjonsflyt: Super Admin → Tenant Management → Velg tenant → Full bruker CRUD

### Tenant User CRUD (2025-02-01)
- ✅ Full brukeradministrasjon for tenants i Super Admin Portal
- ✅ Legg til nye brukere til en tenant
- ✅ Rediger eksisterende brukere (navn, email, rolle, aktiv status)
- ✅ Slett brukere med bekreftelse
- ✅ EditTenantUserScreen for enkel redigering
- ✅ Navigation oppdatert for edit og delete funksjoner

## Test Brukere

**Super Admin**
- Email: `superadmin@oblikey.no`
- Password: `SuperAdmin123!`

**Demo Tenant (oblikey-demo)**
- Admin: `admin1@test.no` / `Admin123!`
- Kunde: `kunde1@test.no` / `Kunde123!`

## Dokumentasjon

- [API Endpoints](./API_ENDPOINTS.md)
- [Deployment Guide](./DEPLOYMENT_CHECKLIST.md)
- [Security Audit](./SECURITY_AUDIT_REPORT.md)
- [Implementation Report](./IMPLEMENTATION_REPORT.md)

## Lisens

Proprietær programvare

## Support

GitHub Issues: https://github.com/job000/ObliKey/issues

---

**Made in Norway 🇳🇴** | **Version 2.0.1** | **2025**
