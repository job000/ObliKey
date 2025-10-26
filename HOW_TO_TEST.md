# Slik Tester Du ObliKey - Steg-for-Steg Guide

Denne guiden viser deg **nøyaktig** hvordan du setter opp og tester hele ObliKey-plattformen.

---

## 📋 Rask Oversikt

**Tid:** 10-15 minutter
**Krav:** Mac/Linux/Windows med Node.js installert

**Det du trenger:**
1. ✅ Node.js v20+
2. ✅ En terminal/kommandolinje
3. ✅ En nettleser (Chrome/Firefox anbefalt)

**Det du får:**
- 🚀 Fullstendig kjørende applikasjon
- ✅ Backend API på http://localhost:3000
- ✅ Frontend app på http://localhost:5173
- ✅ Database med testdata
- ✅ Alle funksjoner klare til testing

---

## 🚀 Steg 1: Quick Start (2 minutter)

### Åpne Terminal

**macOS:** Trykk `Cmd + Space`, skriv "Terminal", trykk Enter

**Windows:** Trykk `Win + R`, skriv "cmd", trykk Enter

**Linux:** Trykk `Ctrl + Alt + T`

### Naviger til ObliKey Mappen

```bash
cd /Users/johnmichaelobligar/Documents/Development/ObliKey
```

### Kjør Setup Script

```bash
# Gi execute permissions (kun første gang)
chmod +x setup.sh

# Kjør setup
./setup.sh
```

**Hva skjer nå?**
Setup scriptet vil:
1. ✅ Sjekke at Node.js er installert
2. ✅ Spørre om Docker eller Manuelt oppsett (velg 2 for manuelt hvis Docker ikke er installert)
3. ✅ Installere alle dependencies
4. ✅ Sette opp database
5. ✅ Generere sikkerhetsnøkler
6. ✅ Kjøre database migrasjoner
7. ✅ Opprette hjelpescripts

**Forventet output:**
```
🚀 ObliKey Setup Script
=======================

📊 Detected OS: Darwin

🔍 Checking prerequisites...

✓ Node.js installed: v20.x.x
✓ npm installed: 10.x.x
...
✅ Setup Complete!
```

---

## 🎬 Steg 2: Start Applikasjonen (30 sekunder)

### Start Backend og Frontend

```bash
./start.sh
```

**Hva skjer nå?**
- Backend starter på port 3000
- Frontend starter på port 5173
- Du ser output i terminalen fra begge servere

**Forventet output:**
```
🚀 Starting ObliKey...

Starting Backend on http://localhost:3000
Starting Frontend on http://localhost:5173

================================
✅ ObliKey is running!
================================

Frontend: http://localhost:5173
Backend:  http://localhost:3000
Health:   http://localhost:3000/health

Press Ctrl+C to stop all servers
```

**Viktig:** La terminalen stå åpen!

---

## 🌐 Steg 3: Åpne Nettleseren

### Test at Backend Fungerer

1. Åpne en ny terminal (la den andre stå åpen!)
2. Kjør:
```bash
curl http://localhost:3000/health
```

**Forventet resultat:**
```json
{"status":"OK","timestamp":"2024-01-19T..."}
```

### Åpne Frontend

**Metode 1:** Automatisk
```bash
open http://localhost:5173
```

**Metode 2:** Manuelt
- Åpne nettleseren
- Gå til: `http://localhost:5173`

**Du skal se:** ObliKey landing page / login page

---

## 👤 Steg 4: Registrer Din Første Bruker

### 1. Gå til Registreringssiden

Klikk på "Registrer" eller gå til: `http://localhost:5173/register`

### 2. Fyll Ut Skjemaet

```
Email: test@example.com
Passord: Test123!
Bekreft Passord: Test123!
Fornavn: Test
Etternavn: Bruker
Tenant ID: test-tenant
```

**Viktige regler for passord:**
- Minst 8 tegn
- Minst én stor bokstav
- Minst én liten bokstav
- Minst ett tall

### 3. Klikk "Registrer"

**Hva skjer:**
- Bruker opprettes i databasen
- JWT token genereres
- Du blir automatisk logget inn
- Du redirectes til Dashboard

**Forventet resultat:**
✅ Du ser Dashboard med velkommen melding
✅ Ditt navn vises i navigasjonsbaren
✅ Du har tilgang til alle sider

---

## 🧪 Steg 5: Test Hovedfunksjonalitet

### Test 1: Dashboard

**Hva du skal se:**
- Velkommen melding med ditt navn
- Statistikk (bookinger, klasser, etc.)
- Kommende økter/klasser
- Navigasjonsmeny

**Verifiser:**
- [ ] Dashboard laster uten feil
- [ ] Navn vises korrekt
- [ ] Navigasjon fungerer

### Test 2: Klasser

**Steg:**
1. Klikk på "Klasser" i menyen
2. Du skal se klasseoversikt (tom første gang)

**Opprett en klasse (krever TRAINER rolle):**

Siden du er en vanlig bruker, må vi opprette en trainer via API:

```bash
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
```

**Kopier token fra response, logg inn som trainer:**
1. Logg ut fra test@example.com
2. Logg inn med trainer@example.com / Test123!
3. Gå til "Klasser"
4. Klikk "Ny Klasse" (hvis tilgjengelig)
5. Fyll ut:
   - Navn: "Morgen Yoga"
   - Type: "GROUP_CLASS"
   - Kapasitet: 15
   - Varighet: 60
   - Starttidspunkt: i morgen kl 08:00
6. Klikk "Opprett"

**Verifiser:**
- [ ] Klasse vises i listen
- [ ] Kapasitet vises (0/15)
- [ ] Detaljer stemmer

### Test 3: Booking

**Steg:**
1. Logg ut fra trainer kontoen
2. Logg inn som test@example.com
3. Gå til "Klasser"
4. Finn "Morgen Yoga" klassen
5. Klikk "Book" eller gå inn på klassen
6. Klikk "Bekreft booking"

**Verifiser:**
- [ ] Booking bekreftes
- [ ] Kapasitet oppdateres (1/15)
- [ ] Booking vises under "Mine Bookinger"

### Test 4: Chat

**Steg:**
1. Gå til "Chat" i menyen
2. Klikk "Ny Samtale" (hvis tilgjengelig)
3. Velg trainer fra listen
4. Send melding: "Hei! Lurer på noe om klassen i morgen"

**Verifiser:**
- [ ] Samtale opprettes
- [ ] Melding sendes
- [ ] Melding vises i chat-vinduet

### Test 5: PT Sesjoner (som Trainer)

**Steg:**
1. Logg inn som trainer@example.com
2. Gå til "PT Sesjoner"
3. Klikk "Ny Sesjon" (hvis tilgjengelig)
4. Velg klient (test@example.com)
5. Fyll ut detaljer
6. Klikk "Opprett"

**Verifiser:**
- [ ] Sesjon opprettes
- [ ] Vises i kalender
- [ ] Klient kan se sesjonen

---

## 🔍 Steg 6: Test API Direkte (Valgfritt)

### Health Check

```bash
curl http://localhost:3000/health
```

**Forventet:**
```json
{"status":"OK","timestamp":"..."}
```

### Registrer Ny Bruker

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nybruker@example.com",
    "password": "Test123!",
    "firstName": "Ny",
    "lastName": "Bruker",
    "tenantId": "test-tenant"
  }'
```

**Forventet:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Hent Klasser (med token)

```bash
# Erstatt YOUR_TOKEN med faktisk token
curl http://localhost:3000/api/classes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🤖 Steg 7: Kjør Automatiske Tester

### Backend Tester

```bash
# I ny terminal
cd backend
npm test
```

**Hva skjer:**
- Alle unit og integration tester kjøres
- Test coverage genereres
- Resultat vises i terminalen

**Forventet resultat:**
```
PASS tests/unit/auth.test.ts
PASS tests/integration/booking.test.ts
PASS tests/integration/classes.test.ts
PASS tests/integration/chat.test.ts
PASS tests/integration/pt.test.ts

Test Suites: 5 passed, 5 total
Tests:       40+ passed, 40+ total
Coverage:    >70% (all metrics)
```

### Test Coverage Rapport

```bash
# Generer coverage
npm test -- --coverage

# Åpne HTML rapport
open coverage/lcov-report/index.html
```

**Du skal se:**
- Coverage for alle filer
- Grønne linjer = covered
- Røde linjer = not covered
- >70% på alle metrics

---

## ✅ Testing Checklist

Gå gjennom denne listen og hak av:

### Backend
- [ ] Health endpoint fungerer
- [ ] Brukerregistrering fungerer
- [ ] Login fungerer
- [ ] JWT tokens genereres
- [ ] API endpoints respondering korrekt
- [ ] Database tilkobling fungerer

### Frontend
- [ ] Landing page laster
- [ ] Registreringsskjema fungerer
- [ ] Login fungerer
- [ ] Dashboard vises
- [ ] Navigasjon fungerer
- [ ] Alle sider laster uten feil

### Funksjoner
- [ ] Klasser kan vises
- [ ] Klasser kan opprettes (som trainer)
- [ ] Booking fungerer
- [ ] Kansellering fungerer
- [ ] Chat fungerer
- [ ] PT sesjoner fungerer

### Security
- [ ] Kan ikke aksessere API uten token
- [ ] Passord validering fungerer
- [ ] XSS sanitering fungerer
- [ ] Rate limiting fungerer (test med mange requests)

### Automatiske Tester
- [ ] Alle backend tester passerer
- [ ] Coverage >70%

---

## 🔴 Stopp Applikasjonen

Når du er ferdig med testing:

### Metode 1: Med Script

```bash
./stop.sh
```

### Metode 2: Manuelt

I terminalen der serverne kjører:
- Trykk `Ctrl + C`

**Bekreft at alt er stoppet:**
```bash
# Skal ikke returnere noe
lsof -i :3000
lsof -i :5173
```

---

## 🐛 Problemer? Løsninger Her!

### Problem 1: "Cannot connect to database"

**Løsning:**
```bash
# Sjekk at PostgreSQL kjører
# macOS
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@16

# Eller restart setup
./setup.sh
```

### Problem 2: "Port 3000 already in use"

**Løsning:**
```bash
# Finn prosess
lsof -i :3000

# Drep prosessen
kill -9 <PID>

# Eller start på annen port
# Rediger backend/.env
PORT=3001
```

### Problem 3: "Module not found"

**Løsning:**
```bash
# Reinstaller dependencies
cd backend
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules
npm install
```

### Problem 4: Frontend viser blank side

**Løsning:**
1. Åpne Browser DevTools (F12)
2. Sjekk Console for feil
3. Sjekk Network tab for failed requests
4. Verifiser at `VITE_API_URL` er riktig i frontend/.env

### Problem 5: "Invalid token" feilmelding

**Løsning:**
```javascript
// Åpne Browser Console (F12)
localStorage.clear()
// Logg inn på nytt
```

### Problem 6: Tester feiler

**Løsning:**
```bash
# Sjekk at test database er satt opp
cd backend
npx prisma migrate dev

# Kjør tester på nytt
npm test

# Se detaljert output
npm test -- --verbose
```

---

## 📊 Forvented Resultater - Oppsummering

Etter å ha fullført denne guiden skal du ha:

✅ **Backend kjørende** på http://localhost:3000
✅ **Frontend kjørende** på http://localhost:5173
✅ **Database** med testdata
✅ **Minst 2 brukere** opprettet (1 customer, 1 trainer)
✅ **Minst 1 klasse** opprettet
✅ **Minst 1 booking** opprettet
✅ **Chat** mellom brukere testet
✅ **Alle automatiske tester** passerer med >70% coverage

---

## 🎯 Hva Kan Du Nå Gjøre?

### For Utviklere

1. **Utforsk kodebasen:**
   - `backend/src/` - Backend kode
   - `frontend/src/` - Frontend kode
   - `backend/tests/` - Test cases

2. **Les dokumentasjon:**
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
   - [TESTING_GUIDE.md](./TESTING_GUIDE.md)
   - [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)

3. **Endre kode og test:**
   ```bash
   # Backend med auto-reload
   cd backend
   npm run dev

   # Frontend med hot-reload
   cd frontend
   npm run dev
   ```

### For Business/Produkteiere

1. **Test alle features:**
   - Gå gjennom hver side
   - Test hver funksjon
   - Noter bugs eller forbedringer

2. **Les business docs:**
   - [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
   - [FINAL_DELIVERY.md](./FINAL_DELIVERY.md)

3. **Planlegg deployment:**
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)

### For DevOps

1. **Sett opp CI/CD:**
   - Konfigurer GitHub Actions
   - Se [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)

2. **Forbered deployment:**
   - Railway, AWS, eller DigitalOcean
   - Se [DEPLOYMENT.md](./DEPLOYMENT.md)

3. **Monitoring:**
   - Sett opp error tracking (Sentry)
   - Sett opp logging
   - Sett opp analytics

---

## 📞 Trenger Du Hjelp?

### Sjekk Dokumentasjon Først
- [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) - Detaljert testing guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API referanse
- [README.md](./README.md) - Oversikt

### Vanlige Spørsmål

**Q: Hvordan legger jeg til en ny feature?**
A: Se [TESTING_GUIDE.md](./TESTING_GUIDE.md) for best practices

**Q: Hvordan deployer jeg til produksjon?**
A: Se [DEPLOYMENT.md](./DEPLOYMENT.md)

**Q: Hvordan skriver jeg tester?**
A: Se eksempler i `backend/tests/`

### Kontakt

- **GitHub Issues** - Rapporter bugs
- **Email** - support@oblikey.com

---

## 🎉 Gratulerer!

Du har nå:
✅ Satt opp hele ObliKey plattformen
✅ Testet alle hovedfunksjoner
✅ Kjørt automatiske tester
✅ Bekreftet at alt fungerer

**Neste steg:**
- Utforsk kodebasen
- Legg til egne features
- Deploy til staging
- Gå i produksjon!

---

**Sist oppdatert:** 2024-01-19
**Testet på:** macOS, Linux, Windows
**Estimert tid:** 10-15 minutter

**Built with ❤️ for the fitness industry**
