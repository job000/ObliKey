# Docker Quick Fix - Registreringsproblem

## 🔴 Problem
Registrering feiler når du bruker Docker.

## ✅ Løsning (Velg en)

---

## Metode 1: Bruk Development Docker Setup (Anbefalt)

Denne metoden setter opp alt korrekt med riktige miljøvariabler.

### Steg 1: Stopp eksisterende containers

```bash
docker-compose down
```

### Steg 2: Start med development config

```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Hva skjer:**
- PostgreSQL starter på port 5432
- Redis starter på port 6379
- Backend API starter på port 3000 (med riktig database kobling)
- Frontend starter på port 5173

### Steg 3: Vent 30-60 sekunder

La containers starte og migrasjoner kjøre.

### Steg 4: Test

Åpne: http://localhost:5173

Prøv å registrere:
- Email: test@example.com
- Passord: Test123!
- Fornavn: Test
- Etternavn: User
- Tenant ID: test-tenant

**Skal nå fungere! ✅**

---

## Metode 2: Manuell Fix (Hvis Metode 1 ikke fungerer)

### Diagnose først

```bash
# 1. Kjør diagnostic script
chmod +x debug-docker.sh
./debug-docker.sh
```

### Vanlige Problemer og Løsninger

#### Problem A: Backend svarer ikke

```bash
# Sjekk backend logs
docker-compose logs backend

# Hvis du ser "Cannot connect to database":
docker-compose down
docker-compose up -d postgres redis
sleep 10  # Vent på at database starter
docker-compose up -d backend
```

#### Problem B: JWT_SECRET mangler

```bash
# Opprett .env fil i root
cat > .env << EOF
JWT_SECRET=your-super-secret-jwt-key-change-in-production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=oblikey
EOF

# Restart containers
docker-compose down
docker-compose up -d
```

#### Problem C: CORS feil

Sjekk backend/.env og sørg for:
```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Problem D: Database migrations ikke kjørt

```bash
# Kjør migrations manuelt
docker-compose exec backend npx prisma migrate deploy

# Hvis det feiler, reset database:
docker-compose down -v  # ADVARSEL: Sletter all data
docker-compose up -d
```

---

## Metode 3: Kjør Lokalt Uten Docker (Raskeste)

Hvis Docker fortsatt ikke fungerer, kjør lokalt:

```bash
# 1. Stopp Docker
docker-compose down

# 2. Start kun database services
docker-compose up -d postgres redis

# 3. Start backend lokalt
cd backend
npm install
cp .env.example .env
# Rediger .env - sett DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oblikey
npx prisma generate
npx prisma migrate dev
npm run dev

# 4. I ny terminal, start frontend
cd frontend
npm install
npm run dev
```

Åpne: http://localhost:5173

---

## 🔍 Verifiser At Alt Fungerer

### 1. Sjekk Backend

```bash
curl http://localhost:3000/health
```

**Forventet:**
```json
{"status":"OK","timestamp":"..."}
```

### 2. Sjekk Database

```bash
docker-compose exec postgres psql -U postgres -d oblikey -c "SELECT count(*) FROM \"User\";"
```

### 3. Sjekk Frontend Console

1. Åpne http://localhost:5173
2. Trykk F12 (Developer Tools)
3. Gå til Console tab
4. Skal ikke være røde feilmeldinger

### 4. Sjekk Network Tab

1. I Developer Tools, gå til Network tab
2. Prøv å registrere
3. Se etter POST request til http://localhost:3000/api/auth/register
4. Sjekk response - skal være 201 eller 200, ikke 500

---

## 🐛 Fortsatt Problemer?

### Se detaljerte logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# Alle logs
docker-compose logs -f
```

### Test API direkte

```bash
# Test registrering via curl
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "tenantId": "test-tenant"
  }'
```

**Hvis dette fungerer** men frontend ikke gjør det = CORS problem
**Hvis dette feiler** = Backend/Database problem

### Sjekk miljøvariabler

```bash
docker-compose exec backend printenv | grep -E "DATABASE|JWT|NODE_ENV"
```

Skal vise:
- DATABASE_URL med riktig connection string
- JWT_SECRET (ikke tom)
- NODE_ENV=development eller production

---

## 📝 Vanlige Feil og Løsninger

| Feil | Årsak | Løsning |
|------|-------|---------|
| "Registrering feilet" (generisk) | Backend svarer ikke | Sjekk `docker-compose logs backend` |
| "Network error" | Backend ikke startet | Vent 30 sek, eller restart |
| "Cannot connect to database" | Database ikke klar | `docker-compose up -d postgres` først, vent 10 sek |
| "Invalid token" | JWT_SECRET mangler | Sett JWT_SECRET i .env |
| "CORS error" | CORS ikke konfigurert | Sjekk ALLOWED_ORIGINS i backend/.env |
| Blank side | Frontend build feil | Sjekk `docker-compose logs frontend` |

---

## ✅ Suksess Kriterier

Du vet at alt fungerer når:

1. ✅ `curl http://localhost:3000/health` returnerer `{"status":"OK"}`
2. ✅ Frontend laster på http://localhost:5173
3. ✅ Kan registrere ny bruker
4. ✅ Blir automatisk logget inn etter registrering
5. ✅ Ser Dashboard med ditt navn

---

## 🚀 Quick Commands

```bash
# Start alt
docker-compose -f docker-compose.dev.yml up

# Stopp alt
docker-compose down

# Restart kun backend
docker-compose restart backend

# Se logs
docker-compose logs -f backend

# Reset alt (ADVARSEL: Sletter data)
docker-compose down -v
docker-compose -f docker-compose.dev.yml up --build

# Kjør migrations
docker-compose exec backend npx prisma migrate deploy

# Åpne database shell
docker-compose exec postgres psql -U postgres -d oblikey
```

---

## 📞 Trenger Mer Hjelp?

Send meg output fra:

```bash
# 1. Container status
docker-compose ps

# 2. Backend logs
docker-compose logs backend | tail -50

# 3. Health check
curl -v http://localhost:3000/health

# 4. Environment
docker-compose exec backend printenv | grep -E "DATABASE|JWT"
```

---

**Sist oppdatert:** 2024-01-19
