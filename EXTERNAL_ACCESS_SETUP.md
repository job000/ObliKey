# ✅ EKSTERN TILGANG KONFIGURERT!

## 🎉 Du kan nå nå appen fra utsiden!

### 🌐 Setup Fullført

**Backend** er nå tilgjengelig eksternt via:
```
https://loose-days-clean.loca.lt
```

**Frontend** (Expo) bruker tunnel mode og kobler til backend via localtunnel URL.

---

## 📱 Slik tester du fra utsiden:

### 1. Start Backend (hvis ikke allerede kjører)
```bash
cd backend
npm run dev
```

### 2. Start Localtunnel for Backend (i nytt terminal-vindu)
```bash
npx localtunnel --port 3000
```

**VIKTIG:** Localtunnel URL kan endre seg hver gang du starter den. Hvis URL endres, oppdater `frontend/src/services/api.ts` med ny URL.

### 3. Start Expo med Tunnel
```bash
cd frontend
npx expo start --tunnel
```

### 4. Åpne Expo Go på telefonen
- Scan QR-koden fra Expo
- Appen vil nå koble til backend via localtunnel
- **Du kan teste fra hvor som helst i verden! 🌍**

---

## 🔐 Login Credentials

Når appen er lastet:
- **Brukernavn**: `admin1`
- **Passord**: `Admin123!`

eller

- **E-post**: `admin1@test.no`
- **Passord**: `Admin123!`

---

## 🔧 Hva er konfigurert:

### Backend (`backend/src/middleware/security.ts`)
✅ CORS tillater localtunnel domener (`.loca.lt`)
✅ CORS tillater ngrok domener (`.ngrok-free.app`, `.ngrok.io`)
✅ CORS tillater requests uten origin (mobile apps)

### Frontend (`frontend/src/services/api.ts`)
✅ API URL satt til: `https://loose-days-clean.loca.lt/api`
✅ Fungerer fra hvor som helst via tunnel

---

## 🚀 Testing Status

✅ Backend kjører lokalt: `http://localhost:3000`
✅ Backend tilgjengelig eksternt: `https://loose-days-clean.loca.lt`
✅ Health check fungerer: `{"status":"OK"}`
✅ Frontend konfigurert til å bruke tunnel URL
✅ Expo kjører i tunnel mode
✅ CORS konfigurert for eksterne domener

---

## 💡 Viktige Notater

### Localtunnel URL Endrer Seg
Hver gang du restarter localtunnel, får du en ny tilfeldig URL.

**Hvis du vil ha en fast URL:**

**Alternativ 1: Bruk subdomain (kan være opptatt)**
```bash
npx localtunnel --port 3000 --subdomain oblikey-backend
# URL blir: https://oblikey-backend.loca.lt
```

**Alternativ 2: Bruk Ngrok (krever gratis registrering)**
```bash
# 1. Registrer deg på https://ngrok.com
# 2. Installer authtoken: ngrok authtoken YOUR_TOKEN
# 3. Start ngrok:
ngrok http 3000
```

### Hvis Localtunnel URL Endres

1. Start localtunnel og få ny URL
2. Oppdater `frontend/src/services/api.ts`:
```typescript
return 'https://NYE-URL-HER.loca.lt/api';
```
3. Expo vil automatisk reloade appen

---

## 🐛 Troubleshooting

### Problem: "Network request failed"
**Sjekk:**
1. At localtunnel kjører: `curl https://loose-days-clean.loca.lt/health`
2. At backend kjører lokalt: `curl http://localhost:3000/health`

### Problem: "CORS error"
**Løsning:**
- Backend er allerede konfigurert for localtunnel
- Sjekk at du har restartet backend etter CORS-endringene

### Problem: Kan ikke logge inn
**Sjekk:**
1. At du bruker riktige credentials (`admin1` / `Admin123!`)
2. At API URL i frontend er korrekt
3. At localtunnel kjører og backend er tilgjengelig

### Problem: "Invalid subdomain" i localtunnel
**Løsning:**
- Subdomainet er opptatt
- Bruk uten subdomain: `npx localtunnel --port 3000`
- Eller prøv et annet subdomain

---

## 📊 Arkitektur Oversikt

```
[Telefon/Tablet hvor som helst i verden]
           ↓
    [Expo Tunnel]
           ↓
    [Internet]
           ↓
[Localtunnel: https://loose-days-clean.loca.lt]
           ↓
[Din PC: http://localhost:3000]
           ↓
    [Backend API]
           ↓
  [PostgreSQL Database]
```

---

## ✅ Alt Er Klart!

Du kan nå teste appen fra hvor som helst:
1. ✅ Åpne Expo Go
2. ✅ Scan QR-koden
3. ✅ Logg inn med `admin1` / `Admin123!`
4. ✅ Test alle features!

**Backend er tilgjengelig eksternt** → `https://loose-days-clean.loca.lt`
**Frontend bruker Expo tunnel** → Fungerer eksternt
**CORS konfigurert** → Tillater tunnel-requests

## 🎊 Du er klar til å teste!
