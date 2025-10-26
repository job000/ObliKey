# ObliKey - Manuell Testing Guide

Denne guiden viser deg hvordan du setter opp, kjører og tester hele ObliKey-plattformen lokalt.

## 📋 Innholdsfortegnelse

1. [Forutsetninger](#forutsetninger)
2. [Installasjon og Oppsett](#installasjon-og-oppsett)
3. [Kjøre Applikasjonen](#kjøre-applikasjonen)
4. [Manuell Testing - Steg for Steg](#manuell-testing---steg-for-steg)
5. [Automatiske Tester](#automatiske-tester)
6. [Vanlige Problemer](#vanlige-problemer)
7. [Testing Checklist](#testing-checklist)

---

## 🔧 Forutsetninger

Før du starter, sørg for at du har installert:

### Nødvendig Programvare

```bash
# Node.js (v20 eller nyere)
node --version  # Skal vise v20.x.x eller høyere

# PostgreSQL (v16 eller nyere)
psql --version  # Skal vise 16.x eller høyere

# Redis (v7 eller nyere) - Valgfritt men anbefalt
redis-cli --version

# Docker (valgfritt - for enklere oppsett)
docker --version
docker-compose --version
```

### Installere Manglende Programvare

**macOS**:
```bash
# Installer Homebrew hvis du ikke har det
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer Node.js
brew install node@20

# Installer PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Installer Redis
brew install redis
brew services start redis
```

**Windows** (med Chocolatey):
```bash
# Installer Node.js
choco install nodejs-lts

# Installer PostgreSQL
choco install postgresql16

# Installer Redis
choco install redis-64
```

**Linux** (Ubuntu/Debian):
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql-16

# Redis
sudo apt-get install redis-server
```

---

## 📦 Installasjon og Oppsett

### Alternativ 1: Docker (Enklest) ⭐

```bash
# 1. Naviger til prosjektmappen
cd ObliKey

# 2. Start alle tjenester med Docker
docker-compose up -d

# 3. Vent noen sekunder til tjenestene starter

# 4. Sjekk at alt kjører
docker-compose ps

# Du skal se:
# - postgres (running)
# - redis (running)
# - app (running)

# 5. Kjør database migrasjoner
docker-compose exec app npx prisma migrate dev

# 6. Åpne applikasjonen
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

### Alternativ 2: Manuelt Oppsett

#### Steg 1: Database Oppsett

```bash
# 1. Start PostgreSQL (hvis ikke allerede startet)
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# 2. Opprett database
psql postgres
CREATE DATABASE oblikey;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE oblikey TO postgres;
\q

# 3. Test tilkobling
psql -h localhost -U postgres -d oblikey
# Skriv passord: postgres
\q
```

#### Steg 2: Redis Oppsett (Valgfritt)

```bash
# Start Redis
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Test Redis
redis-cli ping
# Skal returnere: PONG
```

#### Steg 3: Backend Oppsett

```bash
# 1. Naviger til backend-mappen
cd backend

# 2. Installer avhengigheter
npm install

# 3. Kopier .env.example til .env
cp .env.example .env

# 4. Rediger .env filen
# Åpne .env i din favoritt editor og oppdater:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oblikey?schema=public"
JWT_SECRET="min-super-hemmelige-jwt-nokkel-123"
REDIS_URL="redis://localhost:6379"

# 5. Generer Prisma client
npx prisma generate

# 6. Kjør database migrasjoner
npx prisma migrate dev

# 7. (Valgfritt) Seed database med testdata
npx prisma db seed

# 8. Start backend server
npm run dev

# Backend skal nå kjøre på http://localhost:3000
```

#### Steg 4: Frontend Oppsett

```bash
# 1. Åpne ny terminal
# 2. Naviger til frontend-mappen
cd frontend

# 3. Installer avhengigheter
npm install

# 4. Kopier .env.example til .env
cp .env.example .env

# 5. Verifiser at .env inneholder riktig API URL
cat .env
# Skal vise: VITE_API_URL=http://localhost:3000/api

# 6. Start frontend development server
npm run dev

# Frontend skal nå kjøre på http://localhost:5173
```

---

## 🚀 Kjøre Applikasjonen

### Starte Alt Samtidig

**Med Docker**:
```bash
docker-compose up
# Trykk Ctrl+C for å stoppe
```

**Manuelt** (to terminaler):
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Verifisere at Alt Fungerer

```bash
# 1. Sjekk backend health
curl http://localhost:3000/health
# Skal returnere: {"status":"OK","timestamp":"..."}

# 2. Åpne frontend i nettleser
open http://localhost:5173
# Eller besøk manuelt i Chrome/Firefox

# 3. Åpne nettleserens Developer Tools (F12)
# Sjekk Console - skal ikke være noen feilmeldinger
```

---

## 🧪 Manuell Testing - Steg for Steg

### Test 1: Brukerregistrering

**Mål**: Verifisere at brukere kan registrere seg

1. Åpne http://localhost:5173/register
2. Fyll ut registreringsskjemaet:
   - **Email**: `test@example.com`
   - **Passord**: `Test123!` (minst 8 tegn, stor bokstav, tall)
   - **Fornavn**: `Test`
   - **Etternavn**: `Bruker`
   - **Tenant ID**: `test-tenant` (kan være hva som helst)
3. Klikk "Registrer"

**Forventet resultat**:
- ✅ Du blir automatisk logget inn
- ✅ Du blir redirectet til Dashboard
- ✅ Du ser ditt navn i navigasjonsbaren

**Feilsøking**:
```bash
# Hvis registrering feiler, sjekk backend logs:
# Terminal der backend kjører skal vise:
POST /api/auth/register 201

# Sjekk database:
docker-compose exec postgres psql -U postgres -d oblikey -c "SELECT * FROM \"User\";"
```

---

### Test 2: Innlogging

**Mål**: Verifisere at registrerte brukere kan logge inn

1. Logg ut (klikk på brukernavnet → Logg ut)
2. Gå til http://localhost:5173/login
3. Logg inn med:
   - **Email**: `test@example.com`
   - **Passord**: `Test123!`
4. Klikk "Logg inn"

**Forventet resultat**:
- ✅ Du blir logget inn
- ✅ Redirectet til Dashboard
- ✅ Token lagres i localStorage

**Verifisere Token**:
```javascript
// Åpne Browser DevTools (F12) → Console
localStorage.getItem('token')
// Skal vise en lang JWT token string

localStorage.getItem('user')
// Skal vise brukerdata i JSON format
```

---

### Test 3: Opprette en Klasse (som Trainer)

**Mål**: Verifisere at trenere kan opprette klasser

**Forutsetning**: Du må være logget inn som TRAINER

1. Opprett en trainer-bruker:
```bash
# Via API (bruk Postman, Insomnia, eller curl)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trainer@example.com",
    "password": "Test123!",
    "firstName": "Personal",
    "lastName": "Trainer",
    "tenantId": "test-tenant",
    "role": "TRAINER"
  }'

# Kopier token fra response
```

2. Logg inn som trainer på nettsiden
3. Gå til "Klasser" (http://localhost:5173/classes)
4. Klikk "Opprett ny klasse"
5. Fyll ut:
   - **Navn**: `Morgen Yoga`
   - **Beskrivelse**: `Avslappende yoga økter`
   - **Type**: `GROUP_CLASS`
   - **Kapasitet**: `15`
   - **Varighet**: `60` (minutter)
   - **Starttidspunkt**: Velg en dato i fremtiden
   - **Lokasjon**: `Studio A`
6. Klikk "Opprett"

**Forventet resultat**:
- ✅ Klassen blir opprettet
- ✅ Du ser klassen i listen
- ✅ Klassen viser riktig kapasitet (0/15)

---

### Test 4: Booke en Klasse

**Mål**: Verifisere booking-funksjonalitet

1. Logg inn som vanlig bruker (CUSTOMER rolle)
2. Gå til "Klasser"
3. Finn klassen "Morgen Yoga"
4. Klikk "Book" eller "Detaljer"
5. Klikk "Book denne klassen"
6. (Valgfritt) Legg til notater: `Første gang`
7. Klikk "Bekreft booking"

**Forventet resultat**:
- ✅ Booking blir opprettet
- ✅ Kapasitet oppdateres (1/15)
- ✅ Du ser bookingen under "Mine bookinger"

**Verifisere i Database**:
```bash
docker-compose exec postgres psql -U postgres -d oblikey -c "SELECT * FROM \"Booking\";"
```

---

### Test 5: Kansellere Booking

**Mål**: Verifisere kansellering med 24-timers regel

1. Gå til "Mine bookinger"
2. Finn bookingen du nettopp opprettet
3. Klikk "Kanseller"
4. Skriv grunn: `Endret planer`
5. Klikk "Bekreft kansellering"

**Forventet resultat**:
- ✅ Bookingen blir kansellert
- ✅ Status endres til "CANCELLED"
- ✅ Kapasitet oppdateres tilbake (0/15)

**Test 24-timers regel**:
1. Book en klasse som starter om mindre enn 24 timer
2. Prøv å kansellere
3. **Forventet**: Får feilmelding "Kan ikke kansellere mindre enn 24 timer før"

---

### Test 6: Chat/Meldinger

**Mål**: Verifisere messaging-systemet

**Forutsetning**: Du trenger 2 brukere

1. Logg inn som bruker 1
2. Gå til "Chat" (http://localhost:5173/chat)
3. Klikk "Ny samtale"
4. Velg bruker 2 fra listen
5. Send melding: `Hei! Hvordan går det?`

**Forventet resultat**:
- ✅ Samtale opprettes
- ✅ Melding sendes
- ✅ Melding vises i chat-vinduet

**Test som mottaker**:
1. Logg inn som bruker 2 (i annen nettleser eller incognito mode)
2. Gå til "Chat"
3. Se samtale med bruker 1
4. Se melding fra bruker 1
5. Svar: `Hei! Alt bra, takk!`

**Verifisere**:
- ✅ Begge brukere ser meldingene
- ✅ Uleste meldinger vises med badge
- ✅ Tidsstempler vises korrekt

---

### Test 7: PT Sesjon (Personal Training)

**Mål**: Verifisere PT session management

**Som Trainer**:
1. Logg inn som trainer
2. Gå til "PT Sesjoner"
3. Klikk "Ny sesjon"
4. Velg klient
5. Fyll ut:
   - **Starttidspunkt**: I morgen kl 10:00
   - **Varighet**: 60 minutter
   - **Type**: One-on-one
   - **Lokasjon**: Privat treningsrom
   - **Notater**: Styrketrening fokus
6. Klikk "Opprett"

**Forventet resultat**:
- ✅ Sesjon opprettes
- ✅ Vises i treners kalender
- ✅ Klient kan se sesjonen

**Som Klient**:
1. Logg inn som klienten
2. Gå til "PT Sesjoner"
3. Se økten planlagt av trainer

---

### Test 8: Treningsprogram

**Mål**: Verifisere training program funksjonalitet

**Som Trainer**:
1. Gå til "Treningsprogrammer"
2. Klikk "Nytt program"
3. Fyll ut:
   - **Navn**: `Styrkebygging - 12 uker`
   - **Klient**: Velg klient
   - **Beskrivelse**: `Progressiv overbelastning`
   - **Mål**: `Øke knebøy til 150kg`
   - **Øvelser**:
     - Knebøy: 4 sett x 8 reps @ 100kg
     - Markløft: 3 sett x 5 reps @ 120kg
4. Klikk "Opprett"

**Som Klient**:
1. Logg inn som klient
2. Gå til "Treningsprogrammer"
3. Se programmet
4. Logg en økt:
   - Knebøy: 4x8 @ 100kg
   - Rating: 4/5
   - Notater: `Følte meg sterk`
5. Klikk "Logg økten"

**Forventet resultat**:
- ✅ Program opprettes
- ✅ Klient kan se program
- ✅ Klient kan logge fremgang
- ✅ Trainer kan se klientens fremgang

---

### Test 9: Admin Dashboard

**Mål**: Verifisere admin-funksjonalitet

**Opprett Admin Bruker**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User",
    "tenantId": "test-tenant",
    "role": "TENANT_ADMIN"
  }'
```

**Som Admin**:
1. Logg inn som admin
2. Gå til "Admin" (http://localhost:5173/admin)
3. Se oversikt:
   - Totalt antall brukere
   - Antall bookinger
   - Inntekter
4. Gå til "Brukere"
5. Se liste over alle brukere
6. Klikk på en bruker
7. Endre rolle eller deaktiver bruker

**Forventet resultat**:
- ✅ Admin ser dashboard med statistikk
- ✅ Admin kan se alle brukere
- ✅ Admin kan administrere brukere

---

### Test 10: Security Testing

**Mål**: Verifisere sikkerhetstiltak

#### Test XSS Prevention
```bash
# Prøv å registrere bruker med XSS i navn
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "xss@example.com",
    "password": "Test123!",
    "firstName": "<script>alert(\"XSS\")</script>",
    "lastName": "Test",
    "tenantId": "test-tenant"
  }'

# Forventet: firstName skal være sanitized (ingen <script> tag)
```

#### Test SQL Injection Prevention
```bash
# Prøv SQL injection i login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin'\'' OR '\''1'\''='\''1",
    "password": "anything"
  }'

# Forventet: 401 Unauthorized (ikke SQL error)
```

#### Test Rate Limiting
```bash
# Send mange requests raskt
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}';
done

# Forventet: Etter 5 forsøk får du 429 Too Many Requests
```

#### Test Authentication
```bash
# Prøv å få tilgang uten token
curl http://localhost:3000/api/classes

# Forventet: 401 Unauthorized

# Prøv med ugyldig token
curl http://localhost:3000/api/classes \
  -H "Authorization: Bearer invalid-token"

# Forventet: 401 Unauthorized
```

---

## 🤖 Automatiske Tester

### Kjøre Backend Tester

```bash
cd backend

# Kjør alle tester
npm test

# Kjør med coverage rapport
npm test -- --coverage

# Kjør kun unit tests
npm run test:unit

# Kjør kun integration tests
npm run test:integration

# Watch mode (kjører automatisk ved endringer)
npm run test:watch

# Kjør spesifikk test fil
npm test -- auth.test.ts

# Kjør spesifikk test
npm test -- -t "should register a new user"
```

**Forventet resultat**:
```
PASS tests/unit/auth.test.ts
PASS tests/integration/booking.test.ts
PASS tests/integration/classes.test.ts
PASS tests/integration/chat.test.ts
PASS tests/integration/pt.test.ts

Test Suites: 5 passed, 5 total
Tests:       40 passed, 40 total
Coverage:    >70% (all metrics)
```

### Kjøre Frontend Tester (hvis implementert)

```bash
cd frontend

# Kjør tester
npm test

# Coverage
npm test -- --coverage
```

---

## 🐛 Vanlige Problemer

### Problem 1: Database Connection Error

**Symptom**:
```
Error: P1001: Can't reach database server at localhost:5432
```

**Løsning**:
```bash
# Sjekk at PostgreSQL kjører
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Start PostgreSQL hvis den ikke kjører
brew services start postgresql@16  # macOS
sudo systemctl start postgresql     # Linux

# Test tilkobling
psql -h localhost -U postgres -d oblikey
```

### Problem 2: Redis Connection Error

**Symptom**:
```
Error: Redis connection failed
```

**Løsning**:
```bash
# Sjekk at Redis kjører
redis-cli ping
# Skal returnere: PONG

# Start Redis hvis den ikke kjører
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Eller deaktiver Redis midlertidig:
# Kommenter ut REDIS_URL i .env
```

### Problem 3: Port Already in Use

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Løsning**:
```bash
# Finn prosess som bruker port 3000
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# Drep prosessen
kill -9 <PID>  # macOS/Linux

# Eller endre PORT i .env
PORT=3001
```

### Problem 4: CORS Error

**Symptom**:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Løsning**:
```bash
# Sjekk at ALLOWED_ORIGINS i backend/.env inneholder frontend URL
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Restart backend
```

### Problem 5: JWT Token Invalid

**Symptom**:
```
401 Unauthorized - Invalid token
```

**Løsning**:
```javascript
// Åpne Browser DevTools (F12) → Console
localStorage.clear()
// Logg inn på nytt
```

### Problem 6: Prisma Migration Error

**Symptom**:
```
Error: P3005: The database schema is not empty
```

**Løsning**:
```bash
# Reset database (ADVARSEL: Sletter all data!)
cd backend
npx prisma migrate reset

# Eller kjør migrations
npx prisma migrate dev
```

---

## ✅ Testing Checklist

Bruk denne sjekklisten for å verifisere at alt fungerer:

### Backend API
- [ ] Health endpoint fungerer (`/health`)
- [ ] Brukerregistrering fungerer
- [ ] Login fungerer
- [ ] JWT tokens genereres korrekt
- [ ] Authentication middleware fungerer
- [ ] Rate limiting fungerer
- [ ] Input sanitization fungerer

### Database
- [ ] PostgreSQL tilkobling fungerer
- [ ] Prisma migrations kjører
- [ ] Alle tabeller er opprettet
- [ ] Multi-tenant isolasjon fungerer (tenantId filter)
- [ ] Testdata kan opprettes

### Frontend
- [ ] Vite dev server starter
- [ ] Alle sider laster uten feil
- [ ] API kall fungerer
- [ ] Token lagres i localStorage
- [ ] Routing fungerer (React Router)
- [ ] Protected routes fungerer

### Autentisering
- [ ] Registrering med validering
- [ ] Login med riktige credentials
- [ ] Login feiler med feil credentials
- [ ] Logout fungerer
- [ ] Token refresh fungerer
- [ ] Protected routes redirecter til login

### Klasser
- [ ] Vise klasser
- [ ] Opprette klasse (som trainer)
- [ ] Redigere klasse
- [ ] Slette klasse
- [ ] Filtrere klasser
- [ ] Søke etter klasser

### Bookinger
- [ ] Book klasse
- [ ] Kanseller booking (>24 timer)
- [ ] Kan ikke kansellere (<24 timer)
- [ ] Kan ikke dobbeltbooke
- [ ] Respekterer kapasitet
- [ ] Vise mine bookinger

### PT Sessions
- [ ] Opprette PT session
- [ ] Vise sessions
- [ ] Oppdatere session
- [ ] Kansellere session
- [ ] Forhindre overlappende sessions

### Treningsprogrammer
- [ ] Opprette program
- [ ] Vise programmer
- [ ] Oppdatere program
- [ ] Logge fremgang
- [ ] Vise fremgang

### Chat
- [ ] Opprette samtale
- [ ] Sende melding
- [ ] Motta melding
- [ ] Markere som lest
- [ ] Slette melding
- [ ] Vise uleste antall

### Security
- [ ] XSS sanitering fungerer
- [ ] SQL injection forhindres
- [ ] Rate limiting fungerer
- [ ] CORS konfigurert korrekt
- [ ] Passord hashet (bcrypt)
- [ ] Tokens utløper riktig

### Automatiske Tester
- [ ] Alle backend tester passerer
- [ ] Test coverage >70%
- [ ] Ingen feilende tester

---

## 🎯 Neste Steg

Etter at du har testet alt manuelt:

1. **Kjør automatiske tester**
   ```bash
   cd backend
   npm test -- --coverage
   ```

2. **Sjekk test coverage rapport**
   ```bash
   open coverage/lcov-report/index.html
   ```

3. **Fikse eventuelle bugs** du fant under testing

4. **Dokumenter bugs** i GitHub Issues

5. **Deploy til staging** når alt fungerer lokalt

---

## 📞 Få Hjelp

Hvis du støter på problemer:

1. **Sjekk logs**:
   - Backend: Terminal der `npm run dev` kjører
   - Frontend: Browser DevTools Console (F12)
   - Database: `docker-compose logs postgres`

2. **Les dokumentasjon**:
   - API_DOCUMENTATION.md
   - TESTING_GUIDE.md
   - README files

3. **Søk i Issues**: GitHub Issues tab

4. **Spør teamet**: Slack/Discord/Email

---

## 🎉 Gratulerer!

Hvis alle tester passerer, er applikasjonen klar for staging deployment!

**Neste steg**: Se DEPLOYMENT.md for deploy instruksjoner.

---

**Sist oppdatert**: 2024-01-19
