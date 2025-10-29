# ObliKey Testbrukere

## Oversikt

Det er opprettet **2 tenants** med ulike moduler aktivert:

---

## 🏢 TENANT 1: Premium Gym

**Subdomain:** `premium-gym`
**Moduler:**
- ✅ **Nettbutikk:** AKTIVERT
- ✅ **Regnskap:** AKTIVERT
- ✅ **Klasser:** AKTIVERT
- ✅ **Chat:** AKTIVERT
- ✅ **Landing Page:** AKTIVERT

### Testbrukere

| Rolle | Brukernavn | Passord | E-post | Navn |
|-------|------------|---------|--------|------|
| 👑 Admin | `admin1` | `password123` | admin1@premiumgym.no | Ola Adminsen |
| 👑 Admin | `admin2` | `password123` | admin2@premiumgym.no | Kari Adminsen |
| 💪 Trainer | `trainer1` | `password123` | trainer1@premiumgym.no | Per Trener |
| 💪 Trainer | `trainer2` | `password123` | trainer2@premiumgym.no | Anne Trener |
| 👤 Kunde | `kunde1` | `password123` | kunde1@premiumgym.no | Lars Kunde |
| 👤 Kunde | `kunde2` | `password123` | kunde2@premiumgym.no | Nina Kunde |

---

## 🏢 TENANT 2: Basic Gym

**Subdomain:** `basic-gym`
**Moduler:**
- ❌ **Nettbutikk:** DEAKTIVERT
- ❌ **Regnskap:** DEAKTIVERT
- ✅ **Klasser:** AKTIVERT
- ✅ **Chat:** AKTIVERT
- ❌ **Landing Page:** DEAKTIVERT

### Testbrukere

| Rolle | Brukernavn | Passord | E-post | Navn |
|-------|------------|---------|--------|------|
| 👑 Admin | `basic_admin1` | `password123` | admin1@basicgym.no | Tom Admin |
| 👑 Admin | `basic_admin2` | `password123` | admin2@basicgym.no | Eva Admin |
| 💪 Trainer | `basic_trainer1` | `password123` | trainer1@basicgym.no | Jan PT |
| 💪 Trainer | `basic_trainer2` | `password123` | trainer2@basicgym.no | Liv PT |
| 👤 Kunde | `basic_kunde1` | `password123` | kunde1@basicgym.no | Erik Medlem |
| 👤 Kunde | `basic_kunde2` | `password123` | kunde2@basicgym.no | Sara Medlem |

---

## Hvordan logge inn

1. Åpne appen
2. Skriv inn **brukernavn** (f.eks. `admin1` eller `basic_kunde1`)
3. Skriv inn **passord**: `password123`
4. Trykk "Logg inn"

## Testing av moduler

### Test Nettbutikk (kun Premium Gym)

Logg inn med en bruker fra **Premium Gym**:
- Du skal kunne se og bruke produktadministrasjon (som admin)
- Du skal kunne legge produkter i handlekurv (alle roller)
- Du skal kunne opprette bestillinger

Logg inn med en bruker fra **Basic Gym**:
- Produkter og handlekurv skal være skjult/deaktivert
- Du vil få feilmelding hvis du prøver å få tilgang

### Test Regnskap (kun Premium Gym)

Logg inn som **admin** på **Premium Gym**:
- Du skal se regnskap-menyen
- Du skal kunne opprette kontoer og transaksjoner

Logg inn som **admin** på **Basic Gym**:
- Regnskap skal være skjult/utilgjengelig

---

## Kjøre seed på nytt

Hvis du vil slette all data og kjøre seed på nytt:

```bash
# Slett all data (OBS: Dette sletter ALT!)
cd backend
npx prisma migrate reset

# Kjør seed
npx ts-node src/seeds/seedTenantAndUsers.ts

# Kjør accounting seed (valgfritt)
npx ts-node src/seeds/seedAccounts.ts
```

**NB:** Seed-scriptet sjekker om tenants allerede eksisterer og hopper over duplikater.

---

## Database-informasjon

**Database:** PostgreSQL
**Tilkobling:** `postgresql://postgres:password@localhost:5432/oblikey`

### Sjekk brukere i databasen

```bash
psql postgresql://postgres:password@localhost:5432/oblikey -c "SELECT username, email, role FROM users;"
```

### Sjekk tenant-innstillinger

```bash
psql postgresql://postgres:password@localhost:5432/oblikey -c "SELECT \"tenantId\", \"ecommerceEnabled\", \"accountingEnabled\" FROM tenant_settings;"
```

---

## Oppsummering

**Totalt antall brukere:** 12
- **6 brukere** med nettbutikk og regnskap (Premium Gym)
- **6 brukere** uten nettbutikk og regnskap (Basic Gym)

Hver tenant har:
- 2 Admins
- 2 Trainers
- 2 Kunder

**Alle brukere har samme passord:** `password123`
