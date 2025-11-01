# EAS Deployment Guide - ObliKey

Komplett guide for deployment av ObliKey med Expo Application Services (EAS).

## Innholdsfortegnelse

1. [Hva er EAS?](#hva-er-eas)
2. [Førstegangs Oppsett](#førstegangs-oppsett)
3. [Deployment Workflow](#deployment-workflow)
4. [Kundedemo Workflow](#kundedemo-workflow)
5. [Build vs Update](#build-vs-update)
6. [Tilgjengelige Kommandoer](#tilgjengelige-kommandoer)
7. [Feilsøking](#feilsøking)

---

## Hva er EAS?

**EAS (Expo Application Services)** er Expo's cloud-tjeneste for:
- **EAS Update**: Over-the-air (OTA) oppdateringer - deploy kode uten app store
- **EAS Build**: Bygge native iOS/Android apps i skyen
- **EAS Submit**: Automatisk innsending til App Store/Google Play

### Fordeler med EAS Update for Kundedemoer

✅ **Ingen Tunnel-problemer**
- Ingen 2-timers timeout
- Ingen 8-timers hard limit
- Stabil forbindelse

✅ **Alltid Tilgjengelig**
- Kunden kan åpne appen når som helst
- Du trenger ikke ha Mac-en kjørende
- Fungerer i dager/uker uten timeout

✅ **Profesjonelt**
- Samme URL hver gang (QR-kode)
- Automatiske oppdateringer
- Flere kanaler (demo, staging, production)

✅ **Gratis**
- Inngår i Expo's gratis tier
- Ubegrenset antall updates
- Ubegrenset antall brukere

---

## Førstegangs Oppsett

### Steg 1: Installer EAS CLI

```bash
npm install -g eas-cli
```

### Steg 2: Logg Inn på Expo

```bash
eas login
```

Bruk din Expo-konto. Hvis du ikke har en:
```bash
eas register
```

### Steg 3: Konfigurer Prosjektet

```bash
cd frontend
eas build:configure
```

Dette vil:
1. Oppdatere `app.json` med `projectId`
2. Bekrefte `eas.json` konfigurasjon
3. Registrere prosjektet i Expo

**VIKTIG:** Etter `eas build:configure`, erstatt `YOUR_PROJECT_ID` i `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/DIN_FAKTISKE_PROJECT_ID"
    },
    "extra": {
      "eas": {
        "projectId": "DIN_FAKTISKE_PROJECT_ID"
      }
    }
  }
}
```

### Steg 4: Bygg Development Build (Kun Første Gang)

For første gang må du bygge en development client:

```bash
npm run build:dev
```

Dette bygger en app med Expo Go-funksjonalitet innebygd. Tar 10-15 minutter.

**Viktig:** Denne bygget må installeres på testtelefoner **én gang**. Alle fremtidige updates gjøres via `eas update`!

---

## Deployment Workflow

### Daglig Utvikling (Lokalt)

```bash
# Start med LAN (mest stabil)
npm run dev

# Eller med tunnel hvis nødvendig
npm run dev:tunnel
```

### Deploy til Kunder/Testere

```bash
# 1. Deploy til demo-kanal (for kunde)
npm run deploy:demo

# 2. Del QR-koden med kunden
# 3. Kunden scanner med Expo Go eller development build
# 4. Appen lastes ned og kjører!
```

### Deployment-kanaler

ObliKey har 4 deployment-kanaler:

| Kanal | Kommando | Bruk |
|-------|----------|------|
| **development** | `npm run deploy:dev` | Intern testing, bleeding edge |
| **demo** | `npm run deploy:demo` | Kundedemoer, stabil versjon |
| **staging** | `npm run deploy:staging` | Pre-production testing |
| **production** | `npm run deploy:prod` | Live produksjon |

---

## Kundedemo Workflow

### Forberedelser (Kun Første Gang)

**Steg 1:** Bygg development app
```bash
npm run build:preview
```

**Steg 2:** Last ned `.ipa` (iOS) eller `.apk` (Android) fra EAS dashboard
- Gå til https://expo.dev/accounts/job000/projects/oblikey/builds
- Last ned nyeste build
- Installer på testtelefoner via TestFlight (iOS) eller direkte (Android)

### Hver Gang Du Skal Vise til Kunde

**Steg 1:** Deploy til demo-kanal
```bash
npm run deploy:demo
```

**Steg 2:** Kopier QR-kode URL fra terminalen
```
✓ Published revision xxxxx
│
│  Branch:     demo
│  Runtime:    1.0.0
│  Platform:   ios, android
│
│  QR Code:    exp://u.expo.dev/update/xxxxx-xxxx
└
```

**Steg 3:** Send QR-kode til kunde via:
- E-post
- SMS
- Slack/Teams
- Eller generer på https://expo.dev/

**Steg 4:** Kunden åpner med Expo Go eller development build
```
1. Last ned Expo Go (App Store / Google Play)
2. Skann QR-koden
3. Appen lastes automatisk ned og starter
```

### Oppdatere Demo

Når du gjør endringer:

```bash
# 1. Gjør endringer i koden
# 2. Test lokalt
npm run dev

# 3. Deploy oppdatering
npm run deploy:demo
```

Kunden får automatisk oppdateringen neste gang de åpner appen!

---

## Build vs Update

### EAS Update (Rask - 2-3 minutter)

**Bruk når:**
- Du endrer JavaScript/TypeScript kode
- Du endrer styling/UI
- Du legger til nye screens
- Du oppdaterer business logic

**Kjør:**
```bash
npm run deploy:demo
```

**Deployment tid:** 2-3 minutter

### EAS Build (Langsom - 10-20 minutter)

**Bruk kun når:**
- Du endrer native kode (iOS/Android)
- Du legger til nye native dependencies
- Du oppdaterer `app.json` konfigurasjon
- Du endrer permissions/entitlements

**Kjør:**
```bash
npm run build:preview
```

**Deployment tid:** 10-20 minutter

---

## Tilgjengelige Kommandoer

### Development

```bash
# Start lokal utvikling (LAN - anbefalt)
npm run dev

# Start med tunnel (hvis LAN ikke fungerer)
npm run dev:tunnel

# Start Expo Go klassisk
npm start
```

### EAS Update (Deploy)

```bash
# Development kanal
npm run deploy:dev

# Demo kanal (for kunder) ⭐ MEST BRUKT
npm run deploy:demo

# Staging kanal
npm run deploy:staging

# Production kanal
npm run deploy:prod

# Manuell deploy med custom melding
eas update --branch demo --message "Fikset innlogging bug"
```

### EAS Build

```bash
# Development build (alle plattformer)
npm run build:dev

# Preview build (test før production)
npm run build:preview

# Production build (for app stores)
npm run build:prod

# Kun iOS
eas build --platform ios --profile preview

# Kun Android
eas build --platform android --profile preview
```

### Utility Kommandoer

```bash
# Sjekk TypeScript errors
npm run type-check

# Kjør tester
npm test
npm run test:watch
npm run test:coverage

# Sjekk EAS status
eas build:list
eas update:list

# Se hvilken versjon som er deployed
eas update:view --branch demo
```

---

## Feilsøking

### Problem: "projectId" mangler i app.json

**Løsning:**
```bash
# Kjør configure på nytt
eas build:configure

# Eller sett manuelt i app.json
# Finn project ID på https://expo.dev/
```

### Problem: "No development build found"

**Løsning:**
Du må bygge development client først:
```bash
npm run build:dev
# Installer .ipa/.apk på telefon
```

### Problem: Update ikke synlig på telefon

**Sjekk:**
```bash
# 1. Er du på riktig kanal?
eas update:view --branch demo

# 2. Restart appen fullstendig
# (force quit, ikke bare minimize)

# 3. Sjekk runtime version matching
# app.json version må matche deployed version
```

### Problem: Build failed

**Løsning:**
```bash
# 1. Sjekk build logs
eas build:list
eas build:view BUILD_ID

# 2. Vanlige problemer:
# - Feil i native kode (sjekk ios/android directories)
# - Manglende credentials (kjør eas credentials)
# - Package.json dependencies konflikt
```

### Problem: QR-kode fungerer ikke

**Løsning:**
```bash
# 1. Sjekk at projectId er korrekt i app.json

# 2. Generer ny QR via dashboard:
# https://expo.dev/accounts/job000/projects/oblikey/updates

# 3. Eller bruk direct URL:
# exp://u.expo.dev/update/[project-id]?channel-name=demo
```

---

## Best Practices

### 1. Bruk LAN for Daglig Utvikling

```bash
npm run dev  # LAN mode - mest stabil
```

Fordeler:
- Ingen timeout
- Raskere reload
- Mer stabil

### 2. Deploy til Demo for Kundedemoer

```bash
npm run deploy:demo
```

**Aldri** bruk tunnel for kundedemoer - bruk EAS Update!

### 3. Test Lokalt Først

```bash
# Alltid test før deploy
npm run dev
npm run type-check
npm test

# Deretter deploy
npm run deploy:demo
```

### 4. Bruk Beskrivende Commit Messages

```bash
# Dårlig
eas update --branch demo --message "update"

# Bra
eas update --branch demo --message "Fikset innlogging bug og forbedret PT-booking UX"
```

### 5. Hold Development Build Oppdatert

```bash
# Re-build hver måned eller ved større native changes
npm run build:preview
```

---

## Pricing

**Expo Free Tier** (Det vi bruker):
- ✅ Ubegrenset EAS Updates
- ✅ Ubegrenset brukere
- ✅ 30 builds/måned (mer enn nok)
- ✅ Alle kanaler (dev, demo, staging, prod)

**Expo Production** ($29/mnd):
- Samme som Free, men:
- Raskere builds
- Prioritert support
- Flere samtidige builds

---

## Quick Reference

### Første Gangs Setup
```bash
npm install -g eas-cli
eas login
cd frontend
eas build:configure
npm run build:dev
```

### Kundedemo Setup
```bash
npm run deploy:demo
# Send QR-kode til kunde
```

### Daglig Utvikling
```bash
npm run dev
# Gjør endringer
npm run deploy:demo  # Når klar for kunde
```

---

## Support

- **Expo Docs**: https://docs.expo.dev/eas/
- **Expo Dashboard**: https://expo.dev/accounts/job000/projects/oblikey
- **Expo Discord**: https://chat.expo.dev/

---

**ObliKey EAS Deployment Guide** | **Version 1.0** | **2025**
