# 🔒 TENANT ISOLATION SECURITY TEST

## 📋 Testbrukere Fra Forskjellige Tenants

### Tenant 1: ObliKey Demo (oblikey-demo)
```
ADMIN:
  Email: testadmin@oblikey.no
  Password: Admin123

SUPER_ADMIN:
  Email: superadmin@oblikey.no
  Password: password123

ADMIN (alternativ):
  Email: admin1@test.no
  Password: password123
```

### Tenant 2: Premium Gym (premium-gym)
```
ADMIN:
  Email: admin1@premiumgym.no
  Password: password123

ADMIN (alternativ):
  Email: admin2@premiumgym.no
  Password: password123
```

### Tenant 3: Basic Gym (basic-gym)
```
ADMIN:
  Email: admin1@basicgym.no
  Password: password123

ADMIN (alternativ):
  Email: admin2@basicgym.no
  Password: password123
```

---

## 🧪 TENANT ISOLATION TESTER

### Test 1: Admin Kan IKKE Se Data Fra Andre Tenants

**Formål:** Verifiser at admin fra én tenant ikke kan se PT-økter, kunder, eller trenere fra andre tenants.

#### Steg 1: Logg inn som ObliKey Demo Admin
1. Logg inn med: `testadmin@oblikey.no` / `Admin123`
2. Gå til **PT-administrasjon**
3. Klikk **"+"** for ny PT-økt
4. Klikk **"Velg PT"**
5. **FORVENTET:** Du skal se 11 trenere fra ObliKey Demo tenant
6. Klikk **"Velg kunde"**
7. **FORVENTET:** Du skal se 22 kunder fra ObliKey Demo tenant
8. Noter ned navnene på noen trenere og kunder

#### Steg 2: Logg inn som Premium Gym Admin
1. Logg ut
2. Logg inn med: `admin1@premiumgym.no` / `password123`
3. Gå til **PT-administrasjon**
4. Klikk **"+"** for ny PT-økt
5. Klikk **"Velg PT"**
6. **FORVENTET:** Du skal IKKE se trenere fra ObliKey Demo
7. **FORVENTET:** Du skal bare se trenere fra Premium Gym tenant
8. Klikk **"Velg kunde"**
9. **FORVENTET:** Du skal IKKE se kunder fra ObliKey Demo
10. **FORVENTET:** Du skal bare se kunder fra Premium Gym tenant

#### Steg 3: Logg inn som Basic Gym Admin
1. Logg ut
2. Logg inn med: `admin1@basicgym.no` / `password123`
3. Gå til **PT-administrasjon**
4. Klikk **"+"** for ny PT-økt
5. Klikk **"Velg PT"**
6. **FORVENTET:** Du skal IKKE se trenere fra ObliKey Demo eller Premium Gym
7. **FORVENTET:** Du skal bare se trenere fra Basic Gym tenant
8. Klikk **"Velg kunde"**
9. **FORVENTET:** Du skal IKKE se kunder fra andre tenants
10. **FORVENTET:** Du skal bare se kunder fra Basic Gym tenant

**✅ Test Bestått Hvis:**
- Hver admin ser bare data fra sin egen tenant
- Ingen data fra andre tenants er synlig
- Antall trenere/kunder er forskjellig for hver tenant

**❌ Test Feilet Hvis:**
- Du ser trenere eller kunder fra andre tenants
- Du kan opprette PT-økter med brukere fra andre tenants
- Data fra flere tenants blandes sammen

---

### Test 2: API-Endepunkter Respekterer Tenant Isolation

**Formål:** Verifiser at backend API returnerer bare data fra riktig tenant.

#### Test via Terminal (Backend API Direct)

```bash
# Login som ObliKey Demo Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@oblikey.no","password":"Admin123"}' > /tmp/oblikey_login.json

# Hent token
OBLIKEY_TOKEN=$(cat /tmp/oblikey_login.json | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# Test get trainers for ObliKey Demo
curl -s -H "Authorization: Bearer $OBLIKEY_TOKEN" http://localhost:3000/api/pt/trainers | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
print(f'ObliKey Demo Trainers: {len(trainers)}')
for t in trainers[:3]:
    print(f'  - {t[\"firstName\"]} {t[\"lastName\"]} ({t[\"email\"]})')
"

# Test get customers for ObliKey Demo
curl -s -H "Authorization: Bearer $OBLIKEY_TOKEN" http://localhost:3000/api/pt/clients | python3 -c "
import sys, json
data = json.load(sys.stdin)
customers = data.get('data', [])
print(f'ObliKey Demo Customers: {len(customers)}')
for c in customers[:3]:
    print(f'  - {c[\"firstName\"]} {c[\"lastName\"]} ({c[\"email\"]})')
"

echo ""
echo "---"
echo ""

# Login som Premium Gym Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin1@premiumgym.no","password":"password123"}' > /tmp/premium_login.json

# Hent token
PREMIUM_TOKEN=$(cat /tmp/premium_login.json | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# Test get trainers for Premium Gym
curl -s -H "Authorization: Bearer $PREMIUM_TOKEN" http://localhost:3000/api/pt/trainers | python3 -c "
import sys, json
data = json.load(sys.stdin)
trainers = data.get('data', [])
print(f'Premium Gym Trainers: {len(trainers)}')
for t in trainers[:3]:
    print(f'  - {t[\"firstName\"]} {t[\"lastName\"]} ({t[\"email\"]})')
"

# Test get customers for Premium Gym
curl -s -H "Authorization: Bearer $PREMIUM_TOKEN" http://localhost:3000/api/pt/clients | python3 -c "
import sys, json
data = json.load(sys.stdin)
customers = data.get('data', [])
print(f'Premium Gym Customers: {len(customers)}')
for c in customers[:3]:
    print(f'  - {c[\"firstName\"]} {c[\"lastName\"]} ({c[\"email\"]})')
"
```

**✅ Test Bestått Hvis:**
- ObliKey Demo admin ser bare ObliKey Demo data
- Premium Gym admin ser bare Premium Gym data
- Ingen overlapping av data mellom tenants

**❌ Test Feilet Hvis:**
- Samme brukere vises for begge tenants
- Antall brukere er identisk for begge tenants
- API returnerer data fra feil tenant

---

### Test 3: SUPER_ADMIN Har IKKE Tilgang Til Andre Tenants

**Formål:** Selv SUPER_ADMIN skal bare se data fra sin egen tenant.

**VIKTIG SIKKERHETSPRINSIPP:**
SUPER_ADMIN har ekstra rettigheter INNENFOR sin tenant, men skal IKKE ha tilgang til andre tenants!

#### Steg:
1. Logg inn som: `superadmin@oblikey.no` / `password123`
2. Gå til **PT-administrasjon**
3. Sjekk PT-økter
4. **FORVENTET:** Du ser bare økter fra ObliKey Demo tenant
5. Klikk "Velg PT"
6. **FORVENTET:** Du ser bare trenere fra ObliKey Demo
7. Klikk "Velg kunde"
8. **FORVENTET:** Du ser bare kunder fra ObliKey Demo

**✅ Test Bestått Hvis:**
- SUPER_ADMIN ser bare data fra sin egen tenant (ObliKey Demo)
- Ingen data fra Premium Gym eller Basic Gym er synlig

**❌ Test Feilet Hvis:**
- SUPER_ADMIN kan se data fra andre tenants
- SUPER_ADMIN kan opprette PT-økter med brukere fra andre tenants

---

### Test 4: Cross-Tenant Attack Attempt (Security Test)

**Formål:** Forsøk å hacke systemet ved å sende requests med andre tenant IDs.

#### Test via API:

```bash
# Login som ObliKey Demo Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testadmin@oblikey.no","password":"Admin123"}' > /tmp/login.json

TOKEN=$(cat /tmp/login.json | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# Forsøk å hente data med wrong tenant ID i header (hvis appen bruker det)
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "X-Tenant-ID: premium-gym" \
     http://localhost:3000/api/pt/trainers | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'error' in data:
    print('✅ SECURE: Request blocked - Cannot access other tenant data')
else:
    trainers = data.get('data', [])
    if len(trainers) > 0:
        print('❌ SECURITY ISSUE: Could access Premium Gym data with ObliKey token!')
    else:
        print('✅ SECURE: No data returned')
"
```

**✅ Test Bestått Hvis:**
- API returnerer error eller tom liste
- Kan ikke hente data fra andre tenants selv med manipulation

**❌ Test Feilet Hvis:**
- API returnerer data fra andre tenants
- Header manipulation gir tilgang til feil tenant

---

### Test 5: Database Query Verification

**Formål:** Verifiser at database queries filtrerer korrekt på tenantId.

```bash
# Sjekk at hver tenant har sine egne brukere
psql postgresql://postgres:password@localhost:5432/oblikey -c "
SELECT
  t.name as tenant_name,
  COUNT(CASE WHEN u.role = 'ADMIN' THEN 1 END) as admins,
  COUNT(CASE WHEN u.role = 'TRAINER' THEN 1 END) as trainers,
  COUNT(CASE WHEN u.role = 'CUSTOMER' THEN 1 END) as customers
FROM tenants t
LEFT JOIN users u ON u.\"tenantId\" = t.id
GROUP BY t.id, t.name
ORDER BY t.name;
"
```

**Forventet Output:**
```
tenant_name  | admins | trainers | customers
--------------+--------+----------+-----------
Basic Gym    |   2    |    2     |    10
ObliKey Demo |   4    |    7     |    22
Premium Gym  |   3    |    2     |    15
```

**✅ Test Bestått Hvis:**
- Hver tenant har forskjellige antall brukere
- Data er tydelig separert per tenant

---

## 🚨 KRITISKE SIKKERHETSKRAV

### ✅ Krav Som MÅ Være Oppfylt:

1. **Tenant Isolation i Data:**
   - Brukere fra én tenant kan ALDRI se data fra andre tenants
   - Database queries ALLTID filtrerer på tenantId

2. **Authentication Scoping:**
   - JWT token inneholder tenantId
   - Alle API requests validerer token.tenantId mot data.tenantId

3. **Role-Based Access (Innenfor Tenant):**
   - SUPER_ADMIN har høyere rettigheter enn ADMIN
   - MEN bare innenfor sin egen tenant
   - SUPER_ADMIN fra tenant A har INGEN tilgang til tenant B

4. **API Security:**
   - Alle endepunkter sjekker tenantId fra token
   - Ingen hardkodet tenant IDs i frontend
   - Ingen tenant ID manipulation mulig

5. **Database Constraints:**
   - Alle tabeller med tenant-spesifikk data har tenantId foreign key
   - Database indexes på tenantId for performance

---

## 📊 Test Resultat Template

```
TENANT ISOLATION TEST RESULTS
Date: [DATE]
Tester: [NAME]

Test 1: Admin Cannot See Other Tenant Data
  ObliKey Demo → Premium Gym: [PASS/FAIL]
  ObliKey Demo → Basic Gym: [PASS/FAIL]
  Premium Gym → ObliKey Demo: [PASS/FAIL]
  Notes:

Test 2: API Endpoint Isolation
  GET /api/pt/trainers: [PASS/FAIL]
  GET /api/pt/clients: [PASS/FAIL]
  GET /api/pt/sessions: [PASS/FAIL]
  Notes:

Test 3: SUPER_ADMIN Scoped to Own Tenant
  Data Access: [PASS/FAIL]
  Notes:

Test 4: Cross-Tenant Attack Prevention
  Header Manipulation: [PASS/FAIL]
  Notes:

Test 5: Database Query Verification
  Tenant Separation: [PASS/FAIL]
  Notes:

OVERALL: [PASS/FAIL]
Critical Issues Found: [NUMBER]
Recommendations:
```

---

## 🔍 Debugging Tips

**Hvis tenant isolation IKKE fungerer:**

1. Sjekk JWT token payload:
   ```javascript
   console.log(jwt.decode(token));
   // Skal inneholde: { userId, tenantId, email, role }
   ```

2. Sjekk middleware i backend:
   ```typescript
   // Alle protected routes skal ha:
   const tenantId = req.user.tenantId;
   // Og filtrere alle queries med:
   where: { tenantId }
   ```

3. Sjekk Prisma queries:
   ```typescript
   // RIKTIG:
   const users = await prisma.user.findMany({
     where: { tenantId: req.user.tenantId }
   });

   // FEIL (returnerer alle tenants):
   const users = await prisma.user.findMany({});
   ```

---

## ✅ Forventet Resultat

Alle tester skal BESTÅ med disse resultatene:

- ✅ Ingen cross-tenant data leakage
- ✅ API endpoints respekterer tenant isolation
- ✅ SUPER_ADMIN begrenset til sin tenant
- ✅ Security attacks avvist
- ✅ Database queries korrekte

**Hvis noen tester feiler = KRITISK SIKKERHETSPROBLEM!**

Test grundig før produksjon!
