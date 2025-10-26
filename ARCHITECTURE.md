# ObliKey - Systemarkitektur og Funksjoner

## 🏗️ Arkitektur Oversikt

ObliKey er bygget som en moderne, skalerbar multi-tenant SaaS-løsning med følgende arkitektur:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│   React + TypeScript + Vite + TailwindCSS + React Router   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (HTTP/JSON)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                         Backend                              │
│     Node.js + Express + TypeScript + JWT Authentication    │
├─────────────────────────────────────────────────────────────┤
│                      Business Logic                          │
│  • Controllers  • Services  • Middleware  • Validation      │
└──────────────────────┬──────────────────────────────────────┘
                       │ Prisma ORM
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    PostgreSQL Database                       │
│              Multi-tenant data isolation                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│         • Email (SMTP/Nodemailer)  • File Storage           │
└─────────────────────────────────────────────────────────────┘
```

## 🗃️ Database Schema

### Multi-Tenant Struktur

Systemet bruker en **shared database, shared schema** tilnærming med tenant isolation:

```
Tenant (Virksomhet)
├── Users (Brukere)
├── Classes (Klasser)
├── Bookings (Bookinger)
├── PTSessions (PT-økter)
├── TrainingPrograms (Treningsprogrammer)
├── Payments (Betalinger)
└── Settings (Innstillinger)
```

### Viktige Relasjoner

- Hver bruker tilhører én tenant
- Alle data er isolert per tenant via `tenantId` foreign key
- Prisma middleware sikrer automatisk filtering på tenant-nivå

## 🎯 Funksjoner per Rolle

### 🔐 Autentisering & Autorisasjon

**Teknologi:**
- JWT tokens (JSON Web Tokens)
- Bcrypt password hashing
- Role-based access control (RBAC)

**Sikkerhetsfunksjoner:**
- Passordkryptering med bcrypt (10 salt rounds)
- Token expiration (standard 7 dager)
- Middleware for rute-beskyttelse
- Rolle-basert tilgangskontroll

### 👥 Brukerroller

#### 1. SUPER_ADMIN
- Full systemadministrasjon
- Kan opprette og administrere tenants
- Tilgang til alle tenants
- Systemstatistikk

#### 2. ADMIN (Virksomhetsadministrator)
- Administrere alle brukere i sin tenant
- Full tilgang til bookings og klasser
- Økonomisk oversikt og rapporter
- Innstillinger for virksomhet
- Brukerh\u00e5ndtering
- E-post malbehandling

#### 3. TRAINER (Personlig Trener)
- Opprett og administrer klasser
- Opprett PT-økter med klienter
- Lag treningsprogrammer
- Se og administrer klientliste
- Oppdater øktstatus
- Tilgang til kunde-portal funksjoner

#### 4. CUSTOMER (Kunde)
- Bla gjennom tilgjengelige klasser
- Book klasser (med kapasitetssjekk)
- Kanseller bookinger (med tidsfrister)
- Se egne bookinger
- Se tildelte PT-økter
- Se treningsprogrammer
- Oppdater profil
- Se betalingshistorikk

## 📅 Bookingsystem

### Funksjoner

**Klassehåndtering:**
- Forskjellige klassetyper: GROUP_CLASS, OPEN_GYM, FACILITY
- Kapasitetshåndtering
- Gjentakende klasser (recurring)
- Tidsbasert planlegging
- Trener-tildeling

**Booking Prosess:**
1. Kunde ser tilgjengelige klasser
2. Sjekk av ledig kapasitet
3. Opprett booking (status: CONFIRMED)
4. Send e-postbekreftelse
5. Automatisk oppdatering av ledig kapasitet

**Kansellering:**
- Konfigurerbar kanselleringsregel (standard 24 timer)
- Kanselleringsgrunn påkrevd
- Automatisk frigjøring av plass
- E-postvarsling

**Statuser:**
- PENDING - Venter på bekreftelse
- CONFIRMED - Bekreftet
- CANCELLED - Kansellert
- COMPLETED - Fullført
- NO_SHOW - Møtte ikke opp

## 💪 PT (Personal Training) Modul

### PT-Økter

**Funksjoner:**
- Planlegging av 1-on-1 økter
- Kunde-trener matching
- Lokasjonsspesifikasjon
- Notatfelt for økt
- Statussporing

**Workflow:**
1. Trener oppretter økt for kunde
2. Kunde får varsel
3. Økt kan bekreftes/kanselleres
4. Etter økt: Trener legger til notater
5. Status oppdateres til COMPLETED

### Treningsprogrammer

**Funksjoner:**
- Langsiktig planlegging
- Målsetting (goals)
- Detaljerte øvelsesplaner
- Start/sluttdato
- Aktiv/inaktiv status

**Struktur:**
```json
{
  "name": "8-ukers styrkeprogram",
  "goals": "Øke maxstyrke i knebøy og benkpress",
  "exercises": "Uke 1-2: Grunnleggende teknikk...",
  "startDate": "2024-01-01",
  "endDate": "2024-02-28"
}
```

## 💳 Betalingssystem

### Betalingstyper

- MEMBERSHIP - Medlemskap
- PT_SESSION - PT-økt
- CLASS - Enkeltstående klasse
- PRODUCT - Produktsalg

### Funksjoner

- Betalingssporing
- Statusoppdateringer
- Refunderingshåndtering
- Betalingshistorikk
- Rapporter og statistikk

### Integrasjonsklart

Systemet er forberedt for integrasjon med:
- Stripe
- Vipps
- Klarna
- PayPal

## 📧 E-postsystem

### E-post Maler

System inkluderer maler for:

1. **Booking Confirmation** - Bookingsbekreftelse
2. **Booking Reminder** - Påminnelse (24t før)
3. **Booking Cancellation** - Kansellering
4. **PT Session Confirmation** - PT-økt bekreftelse
5. **PT Session Reminder** - PT-økt påminnelse
6. **Welcome Email** - Velkomst til nye brukere
7. **Password Reset** - Tilbakestilling av passord
8. **Payment Receipt** - Betalingskvittering

### Konfigurasjon

- Tilpassbare maler per tenant
- HTML-formatering
- Dynamiske variabler
- SMTP-konfigurasjon
- Asynkron sending

## 🎨 Frontend Arkitektur

### Teknologistack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool og dev server
- **TailwindCSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icons

### Komponent Struktur

```
src/
├── components/       # Gjenbrukbare komponenter
│   └── Layout.tsx   # Hovedlayout med navigasjon
├── pages/           # Side-komponenter
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ClassesPage.tsx
│   ├── BookingsPage.tsx
│   ├── PTSessionsPage.tsx
│   ├── TrainingProgramsPage.tsx
│   ├── ProfilePage.tsx
│   └── AdminPage.tsx
├── contexts/        # React Context (state management)
│   └── AuthContext.tsx
├── services/        # API kommunikasjon
│   └── api.ts
├── types/           # TypeScript types
│   └── index.ts
├── utils/           # Hjelpefunksjoner
└── hooks/           # Custom React hooks
```

### State Management

- **Authentication:** React Context (AuthContext)
- **Lokal state:** useState hooks
- **Server state:** React Query (kan legges til)

### Routing

```
Public Routes:
/login              - Innloggingsside
/register           - Registreringsside

Protected Routes:
/dashboard          - Dashboard (rollebasert)
/classes            - Klasseoversikt
/bookings           - Mine bookinger (CUSTOMER)
/pt-sessions        - PT-økter
/training-programs  - Treningsprogrammer
/profile            - Brukerprofil
/admin              - Admin panel (ADMIN/SUPER_ADMIN)
```

## 🔌 API Endepunkter

### Autentisering
```
POST   /api/auth/register    - Registrer ny bruker
POST   /api/auth/login       - Logg inn
GET    /api/auth/me          - Hent innlogget bruker
```

### Tenants (SUPER_ADMIN)
```
POST   /api/tenants          - Opprett tenant
GET    /api/tenants          - Hent alle tenants
GET    /api/tenants/:id      - Hent tenant detaljer
PATCH  /api/tenants/:id/settings - Oppdater innstillinger
```

### Brukere
```
GET    /api/users            - Hent brukere (ADMIN/TRAINER)
GET    /api/users/:id        - Hent bruker
PATCH  /api/users/:id        - Oppdater bruker
DELETE /api/users/:id        - Deaktiver bruker (ADMIN)
```

### Klasser
```
POST   /api/classes          - Opprett klasse (ADMIN/TRAINER)
GET    /api/classes          - Hent klasser
GET    /api/classes/:id      - Hent klasse detaljer
PATCH  /api/classes/:id      - Oppdater klasse (ADMIN/TRAINER)
DELETE /api/classes/:id      - Slett klasse (ADMIN/TRAINER)
```

### Bookinger
```
POST   /api/bookings         - Opprett booking
GET    /api/bookings/my-bookings - Hent mine bookinger
PATCH  /api/bookings/:id/cancel - Kanseller booking
```

### PT-Økter
```
POST   /api/pt/sessions      - Opprett PT-økt (TRAINER)
GET    /api/pt/sessions      - Hent PT-økter
PATCH  /api/pt/sessions/:id  - Oppdater PT-økt (TRAINER)
```

### Treningsprogrammer
```
POST   /api/pt/programs      - Opprett program (TRAINER)
GET    /api/pt/programs      - Hent programmer
GET    /api/pt/programs/:id  - Hent program detaljer
PATCH  /api/pt/programs/:id  - Oppdater program (TRAINER)
```

### Betalinger
```
POST   /api/payments         - Opprett betaling (ADMIN/TRAINER)
GET    /api/payments         - Hent betalinger
PATCH  /api/payments/:id/status - Oppdater status (ADMIN)
GET    /api/payments/statistics - Hent statistikk (ADMIN)
```

### Klienter (TRAINER)
```
GET    /api/pt/clients       - Hent trenerens klienter
```

## 🔒 Sikkerhet

### Backend Sikkerhet

1. **Autentisering:**
   - JWT tokens med expiration
   - Secure password hashing (bcrypt)
   - Token validation på alle beskyttede ruter

2. **Autorisasjon:**
   - Role-based access control (RBAC)
   - Tenant isolation
   - Resource ownership validation

3. **Input Validation:**
   - Express-validator for all input
   - Type checking med TypeScript
   - Sanitization av user input

4. **Sikkerhetstiltak:**
   - CORS konfigurasjon
   - Rate limiting (kan implementeres)
   - SQL injection beskyttelse (Prisma ORM)
   - XSS beskyttelse

### Frontend Sikkerhet

1. **Token Håndtering:**
   - Tokens lagres i localStorage
   - Automatisk inkludering i requests
   - Auto-logout ved token expiration

2. **Route Protection:**
   - ProtectedRoute component
   - Redirect til login hvis ikke autentisert
   - Role-based conditional rendering

## 📊 Skalerbarhet

### Multi-Tenant Skalering

**Nåværende tilnærming:** Shared Database, Shared Schema
- Pro: Enkel å administrere, kostnadseffektiv
- Con: Begrenset isolasjon mellom tenants

**Fremtidig skalering:**
1. Database pooling
2. Caching (Redis)
3. Load balancing
4. Microservices arkitektur
5. Separate databases per tenant (for store kunder)

### Performance Optimalisering

**Backend:**
- Database indexing på ofte-brukte queries
- Pagination for store datasett
- Eager/lazy loading med Prisma
- Caching av ofte-brukte data

**Frontend:**
- Code splitting
- Lazy loading av komponenter
- Image optimization
- Service Worker (PWA)

## 🚀 Deployment

### Anbefalte Plattformer

**Backend:**
- Railway (database + backend)
- Vercel (serverless)
- DigitalOcean App Platform
- AWS Elastic Beanstalk

**Frontend:**
- Vercel (anbefalt)
- Netlify
- Cloudflare Pages
- AWS Amplify

**Database:**
- Railway PostgreSQL
- Supabase
- AWS RDS
- DigitalOcean Managed Databases

### Environment Variables (Produksjon)

**Backend:**
```env
DATABASE_URL=<production-db-url>
JWT_SECRET=<strong-random-string>
NODE_ENV=production
EMAIL_HOST=<smtp-server>
EMAIL_USER=<email-user>
EMAIL_PASSWORD=<email-password>
FRONTEND_URL=<production-frontend-url>
```

**Frontend:**
```env
VITE_API_URL=<production-api-url>
```

## 📈 Fremtidige Forbedringer

### Planlagte Funksjoner

1. **Medlemskap & Abonnementer**
   - Månedlige/årlige medlemskap
   - Automatisk fornyelse
   - Rabattkoder

2. **Mobil App**
   - React Native app
   - Push notifications
   - Offline support

3. **Analytics Dashboard**
   - Besøksstatistikk
   - Populære klasser
   - Revenue tracking

4. **Integrasjoner**
   - Kalendersync (Google, Outlook)
   - Fitness trackers (Strava, Garmin)
   - Regnskapssystemer (Tripletex)

5. **Sosiale Funksjoner**
   - Brukeranmeldelser
   - Sosial profil
   - Delingsmulig heter

## 🛠️ Vedlikehold

### Database Migrations

```bash
# Opprett ny migration
npx prisma migrate dev --name description

# Deploy til produksjon
npx prisma migrate deploy

# Reset development database
npx prisma migrate reset
```

### Testing

Anbefalt testing stack (kan implementeres):
- **Unit tests:** Jest
- **Integration tests:** Supertest
- **E2E tests:** Cypress/Playwright
- **Component tests:** React Testing Library

### Logging

Implementer strukturert logging:
- Winston/Pino for backend
- Sentry for error tracking
- LogRocket for frontend debugging

## 📞 Support

For teknisk support eller spørsmål om arkitekturen, se QUICK_START.md eller kontakt utviklerteamet.
