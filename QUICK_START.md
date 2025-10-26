# ObliKey - Hurtigstart Guide

En komplett guide for å komme i gang med ObliKey multi-tenant fitness & PT management system.

## 📋 Forutsetninger

Før du starter, sørg for at du har installert:

- **Node.js** (v18 eller nyere) - [Last ned her](https://nodejs.org/)
- **PostgreSQL** (v14 eller nyere) - [Last ned her](https://www.postgresql.org/download/)
- **Git** - [Last ned her](https://git-scm.com/)

## 🚀 Installasjon

### 1. Database Oppsett

Først, opprett en PostgreSQL database:

```bash
# Logg inn i PostgreSQL
psql -U postgres

# Opprett database
CREATE DATABASE oblikey;

# Opprett bruker (valgfritt)
CREATE USER oblikey_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE oblikey TO oblikey_user;

# Avslutt
\q
```

### 2. Backend Oppsett

```bash
# Naviger til backend-mappen
cd backend

# Installer avhengigheter
npm install

# Kopier og konfigurer .env fil
cp .env.example .env
```

Rediger `.env` filen med dine innstillinger:

```env
DATABASE_URL="postgresql://oblikey_user:your_secure_password@localhost:5432/oblikey?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET="change-this-to-a-very-secure-random-string"
JWT_EXPIRES_IN="7d"

# E-post konfigurasjon (Gmail eksempel)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="ObliKey <noreply@oblikey.com>"

FRONTEND_URL="http://localhost:5173"
```

**Viktig for Gmail:**
- Bruk en [App Password](https://support.google.com/accounts/answer/185833) for sikkerhet
- Ikke bruk ditt vanlige Gmail-passord

```bash
# Generer Prisma client
npx prisma generate

# Kjør database migreringer
npx prisma migrate dev --name init

# Start backend server
npm run dev
```

Backend kjører nå på `http://localhost:3000` 🎉

### 3. Frontend Oppsett

Åpne en ny terminal:

```bash
# Naviger til frontend-mappen
cd frontend

# Installer avhengigheter
npm install

# Kopier og konfigurer .env fil
cp .env.example .env
```

Rediger `.env` filen:

```env
VITE_API_URL=http://localhost:3000/api
```

```bash
# Start frontend server
npm run dev
```

Frontend kjører nå på `http://localhost:5173` 🎉

## 👤 Opprett Første Bruker

### Metode 1: Via API (Opprett Super Admin)

Bruk Postman, Insomnia, eller cURL:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@oblikey.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "tenantId": "your-tenant-id"
  }'
```

### Metode 2: Opprett Tenant først (anbefalt)

1. Opprett en tenant via Prisma Studio:

```bash
cd backend
npx prisma studio
```

2. Gå til `http://localhost:5555`
3. Opprett en ny `Tenant` record
4. Bruk tenant ID når du registrerer brukere

### Metode 3: Via Registreringssiden

1. Åpne `http://localhost:5173/register`
2. Fyll inn skjemaet
3. **Merk:** Du må oppdatere `tenantId` i RegisterPage.tsx til en gyldig tenant ID

## 🔑 Standard Roller

Systemet støtter 4 roller:

- **SUPER_ADMIN** - Full systemadministrasjon (alle tenants)
- **ADMIN** - Virksomhetsadministrasjon (en tenant)
- **TRAINER** - PT/Trener med klienthåndtering
- **CUSTOMER** - Kunde med booking og treningsplan

## 📱 Hovedfunksjoner

### For Kunder (CUSTOMER)
- ✅ Bla gjennom og book klasser
- ✅ Se mine bookinger
- ✅ Kanseller bookinger (24 timer regel)
- ✅ Se PT-økter
- ✅ Se treningsprogrammer
- ✅ Oppdater profil

### For Trenere (TRAINER)
- ✅ Alle kunde-funksjoner
- ✅ Opprett og administrer klasser
- ✅ Opprett PT-økter
- ✅ Opprett treningsprogrammer for klienter
- ✅ Se klientliste

### For Admins (ADMIN)
- ✅ Alle trener-funksjoner
- ✅ Brukerh\u00e5ndtering
- ✅ Statistikk og rapporter
- ✅ Innstillinger for virksomhet
- ✅ Betalingsoversikt

## 🛠️ Nyttige Kommandoer

### Backend

```bash
# Utviklingsmodus (med hot reload)
npm run dev

# Bygg for produksjon
npm run build

# Start produksjonsserver
npm start

# Åpne Prisma Studio (database GUI)
npx prisma studio

# Generer nye migrations
npx prisma migrate dev --name beskrivelse_av_endring

# Reset database (SLETTER ALL DATA!)
npx prisma migrate reset
```

### Frontend

```bash
# Utviklingsmodus
npm run dev

# Bygg for produksjon
npm run build

# Preview produksjonsbygg
npm run preview

# Linting
npm run lint
```

## 🔍 Testing API Endpoints

### Autentisering

```bash
# Registrer bruker
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant-id"
}

# Logg inn
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Hent innlogget bruker
GET /api/auth/me
Headers: Authorization: Bearer <token>
```

### Klasser

```bash
# Hent alle klasser
GET /api/classes
Headers: Authorization: Bearer <token>

# Opprett klasse
POST /api/classes
Headers: Authorization: Bearer <token>
{
  "name": "Morgen Yoga",
  "description": "En rolig start på dagen",
  "type": "GROUP_CLASS",
  "capacity": 20,
  "duration": 60,
  "startTime": "2024-12-01T08:00:00Z"
}
```

### Bookinger

```bash
# Opprett booking
POST /api/bookings
Headers: Authorization: Bearer <token>
{
  "classId": "class-id",
  "notes": "Første gang"
}

# Hent mine bookinger
GET /api/bookings/my-bookings
Headers: Authorization: Bearer <token>
```

## ⚠️ Feilsøking

### Database Connection Feil

```
Error: P1001: Can't reach database server
```

**Løsning:**
- Sjekk at PostgreSQL kjører: `pg_ctl status`
- Verifiser DATABASE_URL i .env filen
- Test tilkobling: `psql -U oblikey_user -d oblikey`

### Port Already in Use

```
Error: Port 3000 is already in use
```

**Løsning:**
```bash
# Finn prosess som bruker porten
lsof -i :3000

# Drep prosessen
kill -9 <PID>

# Eller endre PORT i .env
PORT=3001
```

### Email Sending Fails

**Løsning:**
- For Gmail: Bruk App Password, ikke vanlig passord
- Sjekk at EMAIL_* variablene er riktig konfigurert
- Test e-post konfigurasjon separat

### CORS Errors

**Løsning:**
- Sjekk at FRONTEND_URL i backend .env er riktig
- Verifiser at VITE_API_URL i frontend .env peker til riktig backend

## 📚 Neste Steg

1. **Tilpass branding:**
   - Oppdater farger i `frontend/tailwind.config.js`
   - Legg til logo og favicon
   - Endre bedriftsnavn i `frontend/index.html`

2. **Legg til betalingsintegrasjon:**
   - Implementer Stripe eller Vipps
   - Oppdater Payment modellen

3. **Deploy til produksjon:**
   - Backend: Vercel, Railway, eller DigitalOcean
   - Frontend: Vercel, Netlify, eller Cloudflare Pages
   - Database: Supabase, Railway, eller AWS RDS

4. **Konfigurer domene:**
   - Sett opp eget domene
   - Konfigurer SSL sertifikater
   - Oppdater CORS innstillinger

## 🆘 Support

For spørsmål eller problemer:
1. Sjekk denne dokumentasjonen
2. Se på eksisterende issues i prosjektet
3. Opprett et nytt issue med detaljert beskrivelse

## 📄 Lisens

Proprietary - Alle rettigheter reservert
