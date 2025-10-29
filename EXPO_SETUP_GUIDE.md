# Expo Tunnel Setup Guide

## Problem
Du har startet Expo med `--tunnel` mode, men backend kjører fortsatt på localhost og er ikke tilgjengelig eksternt.

## Løsning

### Alternativ 1: Bruk Lokal IP (Enklest for samme nettverk)

Hvis din telefon er på **samme WiFi** som utviklingsmaskinen:

1. **Backend kjører allerede** på port 3000 ✅

2. **Finn din lokale IP**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

3. **Oppdater frontend API URL**:

Åpne `frontend/src/services/api.ts` og endre linje 12:

```typescript
// FØR:
return 'http://10.0.0.57:3000/api';

// ETTER (bruk din IP):
return 'http://DIN-IP-HER:3000/api';
```

4. **Restart Expo**:
```bash
# Stopp expo (Ctrl+C)
npx expo start
```

### Alternativ 2: Ngrok for Backend (For ekstern tilgang)

Hvis du vil teste fra **utenfor ditt nettverk**:

#### Steg 1: Start ngrok for backend

```bash
# I ett nytt terminal-vindu
ngrok http 3000
```

Dette vil gi deg en URL som: `https://abc123.ngrok-free.app`

#### Steg 2: Oppdater CORS i backend

Åpne `backend/src/index.ts` og legg til ngrok URL i CORS:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://abc123.ngrok-free.app',  // <-- Legg til din ngrok URL
    /^https:\/\/.*\.ngrok-free\.app$/  // Eller denne regex for alle ngrok URLs
  ],
  credentials: true
}));
```

#### Steg 3: Oppdater frontend API URL

I `frontend/src/services/api.ts`:

```typescript
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  // Bruk ngrok URL for mobile
  return 'https://abc123.ngrok-free.app/api';
};
```

#### Steg 4: Restart backend

```bash
cd backend
npm run dev
```

#### Steg 5: Restart Expo

```bash
cd frontend
npx expo start
```

---

## Troubleshooting

### Problem: "Network request failed"

**Løsning**: Backend er ikke tilgjengelig.

1. Sjekk at backend kjører:
```bash
curl http://localhost:3000/health
```

2. Sjekk at du bruker riktig IP/URL i `api.ts`

3. Sjekk at ngrok kjører (hvis du bruker det):
```bash
curl http://localhost:4040/status
```

### Problem: "CORS error"

**Løsning**: Legg til origin i CORS config (se Steg 2 over)

### Problem: Token ikke funnet ved innlogging

**Løsning**: Dette er normalt ved første innlogging. Prøv å logge inn med:
- **Brukernavn**: `admin1`
- **Passord**: `Admin123!`

Etter vellykket innlogging vil token lagres.

---

## Anbefalt Oppsett for Utvikling

### For Testing på Samme Nettverk:
✅ Bruk **Alternativ 1** (lokal IP)
- Enklest
- Raskere
- Ingen eksterne tjenester

### For Testing Eksternt:
✅ Bruk **Alternativ 2** (ngrok)
- Kan teste fra hvor som helst
- Gratis tier av ngrok er tilstrekkelig

---

## Current Status

- ✅ Backend kjører på `localhost:3000`
- ✅ Expo kjører med `--tunnel` mode
- ❌ Frontend peker til feil backend URL
- ❌ Backend er ikke eksponert eksternt

## Next Steps

1. Velg Alternativ 1 eller 2
2. Følg stegene over
3. Test innlogging med `admin1` / `Admin123!`
