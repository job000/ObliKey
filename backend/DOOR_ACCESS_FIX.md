# 🚪 Dørtilgang - Admin Kan Nå Gi Tilgang Uten Medlemskap

## ✅ Problem Løst

**FØR:** Vanlige brukere (CUSTOMER rolle) kunne IKKE åpne dører selv om admin hadde gitt dem eksplisitt tilgang, hvis de ikke hadde aktivt medlemskap.

**NÅ:** Admin kan gi hvilken som helst bruker dørtilgang uavhengig av medlemskapsstatus.

---

## 🔧 Hva Er Fikset

### 1. Fjernet Hard Medlemskapskrav

**Før:**
```typescript
// Step 4: For CUSTOMER role, active membership is REQUIRED
if (user.role === 'CUSTOMER') {
  const activeMembership = await this.checkActiveMembership(userId, tenantId);

  if (!activeMembership) {
    return {
      granted: false,
      reason: 'No active membership - customers must have an active membership to access doors',
    };
  }
}

// Step 5: Evaluate access rules (ALDRI NÅD hvis ingen medlemskap)
```

**Etter:**
```typescript
// Step 4: Check membership (for context, not requirement)
const activeMembership = await this.checkActiveMembership(userId, tenantId);

// Step 6: Evaluate access rules FØRST
// Check user-specific access (BYPASSES membership requirement)
if (rule.allowedUserIds && rule.allowedUserIds.includes(userId)) {
  return {
    granted: true,
    reason: 'Access granted via admin-defined user-specific rule (membership not required)',
  };
}

// For role-based rules, CUSTOMER still needs membership
if (user.role === 'CUSTOMER' && !activeMembership) {
  continue; // Skip this rule, try next
}
```

### 2. Prioritering av Tilgangsregler

**Ny logikk:**
1. ✅ **Admin/Super Admin** - Automatisk tilgang
2. ✅ **USER_SPECIFIC rules** - Gir tilgang uavhengig av medlemskap (HØYEST PRIORITET)
3. ✅ **ROLE-based rules** - Krever medlemskap for CUSTOMER rolle
4. ✅ **MEMBERSHIP-based rules** - Krever aktivt medlemskap

### 3. Fikset Feltnavnmismatch

**Database schema** definerer:
- `allowedUserIds` - Liste over bruker-IDer med tilgang
- `allowedRoles` - Liste over roller med tilgang
- `allowedMembershipStatuses` - Liste over medlemskapstatus med tilgang

**Koden brukte feil feltnavn:**
- ❌ `rule.userIds` → ✅ `rule.allowedUserIds`
- ❌ `rule.roleAccess` → ✅ `rule.allowedRoles`

Alle forekomster er nå fikset i:
- `src/services/access-control.service.ts`
- `src/controllers/door-access-rule.controller.ts`

---

## 📋 Hvordan Admin Gir Tilgang Uten Medlemskap

### Steg 1: Opprett Access Rule for Spesifikk Bruker

**API Endpoint:**
```http
POST /api/doors/:doorId/access-rules
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Spesifikk tilgang for Test Bruker",
  "description": "Gir Test Bruker tilgang uten medlemskapskrav",
  "type": "USER_SPECIFIC",
  "allowedUserIds": ["<bruker-uuid>"],
  "active": true,
  "priority": 1
}
```

**Parametere:**
- `name` - Navn på regelen (påkrevd)
- `description` - Beskrivelse (valgfri)
- `type` - Type regel, bruk `USER_SPECIFIC` for bruker-spesifikk tilgang (påkrevd)
- `allowedUserIds` - Array med bruker-IDer (UUID) som skal ha tilgang
- `priority` - Lavere tall = høyere prioritet (standard: 0)
- `active` - Om regelen er aktiv (standard: true)

**Valgfrie begrensninger:**
- `validFrom` - Startdato (ISO 8601)
- `validUntil` - Sluttdato (ISO 8601)
- `timeSlots` - Tidsbegrensninger (array)

### Steg 2: Legg Til Flere Brukere Til Eksisterende Regel

```http
POST /api/access-rules/:ruleId/add-users
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "userIds": [
    "uuid-bruker-1",
    "uuid-bruker-2",
    "uuid-bruker-3"
  ]
}
```

### Steg 3: Fjern Brukere Fra Regel

```http
POST /api/access-rules/:ruleId/remove-users
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "userIds": [
    "uuid-bruker-2"
  ]
}
```

---

## 🧪 Testing

### Test 1: Bruker Uten Medlemskap Får Tilgang

```bash
# 1. Finn bruker-ID
curl -X GET "http://localhost:3000/api/users" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 2. Finn dør-ID
curl -X GET "http://localhost:3000/api/doors" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Opprett access rule for bruker
curl -X POST "http://localhost:3000/api/doors/DOOR_UUID/access-rules" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tilgang Uten Medlemskap",
    "description": "Gir bruker tilgang uten medlemskapskrav",
    "type": "USER_SPECIFIC",
    "allowedUserIds": ["USER_UUID"],
    "active": true
  }'

# 4. Test tilgang som bruker (uten medlemskap)
curl -X POST "http://localhost:3000/api/doors/DOOR_UUID/unlock" \
  -H "Authorization: Bearer USER_TOKEN"

# Forventet: { "success": true, "message": "Door unlocked successfully" }
```

### Test 2: Verifiser Access Evaluation

```bash
# Se detaljert access evaluation
curl -X POST "http://localhost:3000/api/doors/DOOR_UUID/evaluate-access" \
  -H "Authorization: Bearer USER_TOKEN"

# Forventet response:
{
  "granted": true,
  "reason": "Access granted via admin-defined user-specific rule (membership not required)",
  "evaluationSteps": [
    "Checking door status",
    "Door found: Hovedinngangsdør",
    "Verifying user account",
    "User verified: Test Bruker (CUSTOMER)",
    "Checking membership status",
    "No active membership - will check for explicit access rules",
    "Evaluating access rules",
    "Evaluating rule: Test Tilgang Uten Medlemskap (priority: 1)",
    "User found in explicit user list - admin granted access",
    "Time restrictions passed - ACCESS GRANTED via admin rule"
  ]
}
```

---

## 🔐 Sikkerhet

### Hva Har IKKE Endret Seg

✅ **Admin/Super Admin** - Fortsatt automatisk tilgang til alle dører
✅ **TRAINER rolle** - Fortsatt tilgang via rolle-baserte regler
✅ **Data isolering** - Fortsatt 100% isolert per tenant
✅ **Audit logging** - Alle forsøk logges fortsatt

### Hva ER Endret

🔄 **CUSTOMER rolle**:
- **MED admin-gitt USER_SPECIFIC regel** → Får tilgang uten medlemskap
- **UTEN admin-gitt regel** → Krever fortsatt aktivt medlemskap

Dette gir admin full kontroll over hvem som kan åpne dører, uavhengig av medlemskapsstatus.

---

## 📊 Access Rule Typer

### 1. USER_SPECIFIC (Høyest Prioritet)
- Gir spesifikke brukere tilgang
- **Krever IKKE medlemskap**
- Perfekt for: Ansatte, eksterne leverandører, spesielle tilfeller

**Eksempel:**
```json
{
  "type": "USER_SPECIFIC",
  "allowedUserIds": ["uuid1", "uuid2", "uuid3"],
  "priority": 1
}
```

### 2. ROLE
- Gir alle brukere med en bestemt rolle tilgang
- **CUSTOMER rolle krever medlemskap**
- **ADMIN/TRAINER rolle krever IKKE medlemskap**

**Eksempel:**
```json
{
  "type": "ROLE",
  "allowedRoles": ["TRAINER", "ADMIN"],
  "priority": 10
}
```

### 3. MEMBERSHIP
- Gir brukere med aktivt medlemskap tilgang
- **Krever medlemskap**

**Eksempel:**
```json
{
  "type": "MEMBERSHIP",
  "allowedMembershipStatuses": ["ACTIVE"],
  "priority": 20
}
```

### 4. TIME_BASED
- Kombineres med andre typer
- Begrenser tilgang til spesifikke tider

**Eksempel:**
```json
{
  "type": "USER_SPECIFIC",
  "allowedUserIds": ["uuid"],
  "timeSlots": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "18:00"
    }
  ]
}
```

---

## 🎯 Vanlige Use Cases

### Use Case 1: Ansatt Uten Medlemskap
**Scenario:** Resepsjonist trenger tilgang til å åpne hovedinngangen, men er ikke medlem.

**Løsning:**
```bash
curl -X POST "http://localhost:3000/api/doors/MAIN_DOOR_UUID/access-rules" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Resepsjonist - Hovedinngang",
    "type": "USER_SPECIFIC",
    "allowedUserIds": ["RESEPSJONIST_UUID"],
    "active": true
  }'
```

### Use Case 2: Vaktmester Kun På Dagtid
**Scenario:** Vaktmester skal ha tilgang mandag-fredag 07:00-16:00, ingen medlemskap.

**Løsning:**
```json
{
  "name": "Vaktmester - Dagtid",
  "type": "USER_SPECIFIC",
  "allowedUserIds": ["VAKTMESTER_UUID"],
  "timeSlots": [
    { "dayOfWeek": 1, "startTime": "07:00", "endTime": "16:00" },
    { "dayOfWeek": 2, "startTime": "07:00", "endTime": "16:00" },
    { "dayOfWeek": 3, "startTime": "07:00", "endTime": "16:00" },
    { "dayOfWeek": 4, "startTime": "07:00", "endTime": "16:00" },
    { "dayOfWeek": 5, "startTime": "07:00", "endTime": "16:00" }
  ]
}
```

### Use Case 3: Midlertidig Tilgang
**Scenario:** Håndverker trenger tilgang i 2 uker.

**Løsning:**
```json
{
  "name": "Håndverker - Midlertidig",
  "type": "USER_SPECIFIC",
  "allowedUserIds": ["HANDVERKER_UUID"],
  "validFrom": "2025-10-29T00:00:00Z",
  "validUntil": "2025-11-12T23:59:59Z"
}
```

---

## 🔍 Troubleshooting

### Problem: Bruker Får Fortsatt "No membership" Feil

**Mulige årsaker:**
1. ✅ Sjekk at access rule har `type: "USER_SPECIFIC"`
2. ✅ Sjekk at bruker-UUID er i `allowedUserIds` array
3. ✅ Sjekk at rule er `active: true`
4. ✅ Sjekk at `validFrom` / `validUntil` datoer er korrekte
5. ✅ Sjekk at tid-begrensninger (timeSlots) ikke blokkerer

**Debug:**
```bash
# Se alle regler for en dør
curl -X GET "http://localhost:3000/api/doors/DOOR_UUID/access-rules" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Evaluer tilgang for en bruker
curl -X POST "http://localhost:3000/api/doors/DOOR_UUID/evaluate-access" \
  -H "Authorization: Bearer USER_TOKEN"
```

### Problem: "Access rule not found" Når Du Oppretter Regel

**Løsning:** Sjekk at du bruker korrekte feltnavnene:
- ✅ `allowedUserIds` (ikke `userIds`)
- ✅ `allowedRoles` (ikke `roleAccess`)
- ✅ `allowedMembershipStatuses` (ikke `membershipStatuses`)

---

## ✅ Oppsummering

### Før Fiksen:
- ❌ Admin kunne IKKE gi dørtilgang til brukere uten medlemskap
- ❌ Alle CUSTOMER-brukere fikk "No active membership" feil
- ❌ Feltnavnmismatch mellom schema og kode

### Etter Fiksen:
- ✅ Admin kan gi dørtilgang til ALLE brukere, uavhengig av medlemskap
- ✅ USER_SPECIFIC regler bypasser medlemskapskrav
- ✅ ROLE-based regler krever fortsatt medlemskap for CUSTOMER (sikkerhet)
- ✅ Feltnavnene matcher database schema
- ✅ Fullstendig audit trail i `evaluationSteps`

---

## 📝 API Referanse

### Alle Door Access Rule Endpoints

```
POST   /api/doors/:doorId/access-rules           → Opprett ny regel
GET    /api/doors/:doorId/access-rules           → List alle regler for dør
GET    /api/access-rules/:ruleId                 → Hent spesifikk regel
PUT    /api/access-rules/:ruleId                 → Oppdater regel
DELETE /api/access-rules/:ruleId                 → Slett regel
PATCH  /api/access-rules/:ruleId/toggle          → Aktiver/deaktiver regel
POST   /api/access-rules/:ruleId/add-users       → Legg til brukere
POST   /api/access-rules/:ruleId/remove-users    → Fjern brukere

POST   /api/doors/:doorId/unlock                 → Lås opp dør
POST   /api/doors/:doorId/evaluate-access        → Evaluer tilgang (debug)
GET    /api/doors/my-access                      → Hent dører bruker har tilgang til
```

**Alle endpoints krever autentisering:**
- CRUD operasjoner: `ADMIN` eller `SUPER_ADMIN` rolle
- Unlock/evaluate: Alle autentiserte brukere (evalueres server-side)

---

**Status:** ✅ Implementert og testet
**Filer endret:**
- `backend/src/services/access-control.service.ts`
- `backend/src/controllers/door-access-rule.controller.ts`

**Brukere kan nå få dørtilgang uten aktivt medlemskap! 🎉**
