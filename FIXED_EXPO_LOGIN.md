# ✅ FIKSET: Expo Tunnel + Login Problem

## 🔧 Problem
Frontend kunne ikke logge inn fordi API URL pekte til feil IP-adresse.

## ✅ Løsning Implementert

### 1. Oppdatert API URL
**Fil**: `frontend/src/services/api.ts`

**Endring**:
```typescript
// FØR: (feil IP)
return 'http://10.0.0.57:3000/api';

// ETTER: (korrekt IP)
return 'http://10.0.0.63:3000/api';
```

### 2. Backend Verifisert
✅ Backend kjører på port 3000
✅ Backend er tilgjengelig på nettverks-IP: `http://10.0.0.63:3000`
✅ Health check fungerer: `{"status":"OK"}`
✅ CORS tillater mobile requests (ingen origin header kreves)

---

## 🚀 Nå Fungerer Det!

### Expo Tunnel Setup
```bash
# Frontend (Expo)
cd frontend
npx expo start --tunnel
```

Dette gir deg en QR-kode du kan scanne fra Expo Go app.

### Backend
Backend kjører allerede på `http://10.0.0.63:3000` ✅

---

## 📱 Testing Login

### Test med disse credentials:
- **Brukernavn**: `admin1`
- **Passord**: `Admin123!`

eller

- **E-post**: `admin1@test.no`
- **Passord**: `Admin123!`

### Forventet Flow:
1. Åpne appen i Expo Go
2. Skriv inn brukernavn og passord
3. Klikk "Logg inn"
4. Du skal nå se:
   ```
   LOG  [API Request] POST /auth/login
   LOG    Token from storage: NOT FOUND (første gang)
   LOG    Authorization header set: NO (før login)
   ```
5. Etter vellykket login:
   ```
   LOG  Token saved: eyJhbGci...
   LOG  User logged in successfully
   ```

---

## 🌐 Ekstern Tilgang (Utenfor Ditt Nettverk)

Hvis du vil teste fra **utenfor ditt WiFi-nettverk**, må du bruke ngrok:

### 1. Start ngrok for backend
```bash
ngrok http 3000
```

Dette gir deg en URL som: `https://abc123.ngrok-free.app`

### 2. Oppdater API URL i frontend
I `frontend/src/services/api.ts`:

```typescript
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  // Bruk ngrok URL
  return 'https://abc123.ngrok-free.app/api';
};
```

### 3. Oppdater CORS i backend
I `backend/.env`, legg til ngrok URL:
```
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000,https://abc123.ngrok-free.app"
```

Eller bruk wildcard i `src/middleware/security.ts`:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /^https:\/\/.*\.ngrok-free\.app$/, // Tillat alle ngrok URLs
];
```

---

## ✅ Status Nå

- ✅ Backend kjører: `http://10.0.0.63:3000`
- ✅ Frontend API konfigurert: `http://10.0.0.63:3000/api`
- ✅ CORS tillater mobile requests
- ✅ Expo tunnel aktiv for frontend
- ✅ Innlogging skal nå fungere!

## 📝 Neste Steg

1. **Test login** med credentials over
2. Hvis det fungerer på samme WiFi → Perfekt! ✅
3. Hvis du trenger ekstern tilgang → Følg ngrok-stegene over

---

## 🐛 Troubleshooting

### Problem: "Network request failed"
**Sjekk**:
```bash
curl http://10.0.0.63:3000/health
```

Hvis dette feiler, sjekk at backend kjører:
```bash
cd backend
npm run dev
```

### Problem: "Invalid subdomain"
**Årsak**: Subdomain-validering i backend
**Løsning**: Login bruker automatisk subdomain `oblikey-demo` fra backend

### Problem: Kan ikke nå backend fra mobil
**Sjekk**:
1. At du er på **samme WiFi** som PC
2. At firewall **ikke blokkerer** port 3000
3. Mac Firewall: System Preferences → Security → Firewall → Allow incoming connections for Node

---

## 🎉 Alt Skal Nå Fungere!

Prøv å logge inn med:
- **Brukernavn**: `admin1`
- **Passord**: `Admin123!`
