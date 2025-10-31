# 🧪 PT-ØKT FRONTEND TEST PLAN

## ✅ Backend Status
**ALL BACKEND TESTS PASSED!**
- ✅ Login fungerer
- ✅ GET /api/pt/trainers returnerer 11 trenere
- ✅ GET /api/pt/clients returnerer 22 kunder
- ✅ POST /api/pt/sessions oppretter nye økter
- ✅ PATCH /api/pt/sessions/:id oppdaterer økter

## 📱 Frontend Testing Checklist

Frontend kjører nå på: **http://localhost:8081**

### Test 1: Login
1. Åpne http://localhost:8081 i nettleser
2. Logg inn med:
   - Email: `testadmin@oblikey.no`
   - Passord: `Admin123`
3. ✅ Du skal komme inn til dashboard

### Test 2: Navigere til PT-administrasjon
1. Klikk på "PT-administrasjon" i menyen
2. ✅ Du skal se en liste med eksisterende PT-økter
3. ✅ Du skal se en "+" knapp øverst til høyre

### Test 3: Åpne "Ny PT-økt" Modal
1. Klikk på "+" knappen
2. ✅ En modal skal åpne seg fra bunnen av skjermen
3. ✅ Du skal se alle feltene:
   - Tittel
   - Beskrivelse
   - Velg PT (dropdown)
   - Velg kunde (dropdown)
   - Starttid
   - Sluttid
4. ✅ Du skal se "Avbryt" og "Opprett" knapper nederst

### Test 4: Teste PT Dropdown (KRITISK TEST!)
1. Klikk på "Velg PT" feltet
2. ✅ En ny modal skal åpne seg fra bunnen
3. ✅ Du skal se:
   - Et søkefelt øverst
   - En liste med 11 trenere
   - Hver trener skal vise: Avatar, navn, og email
4. ✅ Klikk på en trener i listen
5. ✅ Modalen skal lukke seg
6. ✅ "Velg PT" feltet skal nå vise den valgte treneren med avatar, navn og email

### Test 5: Teste Kunde Dropdown (KRITISK TEST!)
1. Klikk på "Velg kunde" feltet
2. ✅ En ny modal skal åpne seg fra bunnen
3. ✅ Du skal se:
   - Et søkefelt øverst
   - En liste med 22 kunder
   - Hver kunde skal vise: Avatar, navn, og email
4. ✅ Test søkefunksjonen ved å skrive et navn
5. ✅ Listen skal filtrere seg
6. ✅ Klikk på en kunde i listen
7. ✅ Modalen skal lukke seg
8. ✅ "Velg kunde" feltet skal nå vise den valgte kunden

### Test 6: Opprette Ny PT-økt
1. Fyll ut alle feltene:
   - Tittel: "Test PT-økt fra frontend"
   - Beskrivelse: "Testing complete flow"
   - Velg en PT
   - Velg en kunde
   - Velg starttid (i morgen kl 10:00)
   - Velg sluttid (i morgen kl 11:00)
2. ✅ Klikk på "Opprett" knappen
3. ✅ Du skal få en suksessmelding
4. ✅ Modalen skal lukke seg
5. ✅ Den nye økten skal vises i listen

### Test 7: Redigere Eksisterende PT-økt
1. Finn en økt i listen
2. Klikk på "Oppdater" knappen (blyant-ikon)
3. ✅ Modalen skal åpne seg med eksisterende data
4. ✅ PT og kunde skal være forhåndsvalgt
5. ✅ Endre tittelen til "OPPDATERT TEST"
6. ✅ Klikk på "Velg PT" dropdown
7. ✅ Dropdownen skal åpne seg (med checkmark på valgt PT)
8. ✅ Velg en annen PT
9. ✅ Klikk på "Oppdater" knappen
10. ✅ Økten skal oppdatere seg i listen

### Test 8: Test Søkefunksjonalitet i Dropdowns
1. Åpne "Ny PT-økt"
2. Klikk på "Velg PT"
3. ✅ Skriv "Super" i søkefeltet
4. ✅ Listen skal filtrere og vise kun PTs med "Super" i navnet
5. ✅ Klikk på "X" i søkefeltet
6. ✅ Listen skal vise alle PTs igjen
7. Gjør det samme for kunde-dropdown

## 🐛 Hvis noe ikke fungerer

### Problem: Dropdowns åpner seg ikke
**Løsning:**
- Sjekk browser console (F12) for feilmeldinger
- Se etter "[PTManagement]" logger
- Verifiser at modals er utenfor SafeAreaView (de skal være siblings)

### Problem: Tom liste i dropdown
**Løsning:**
- Backend returnerer data (verifisert i test)
- Sjekk Network tab i DevTools
- Se etter 401 eller 403 errors
- Verifiser at Authorization header sendes

### Problem: Kan ikke opprette/oppdatere økt
**Løsning:**
- Backend fungerer (verifisert med curl)
- Sjekk at alle required fields er fylt ut
- Se i Network tab for error response
- Sjekk at API URL er korrekt (http://localhost:3000)

## 📊 Forventet Resultat

Etter alle tester skal du kunne:
1. ✅ Åpne PT-administrasjon
2. ✅ Klikke "+" for ny økt
3. ✅ Se alle feltene i modalen
4. ✅ Åpne PT dropdown og se 11 trenere
5. ✅ Velge en PT fra listen
6. ✅ Åpne kunde dropdown og se 22 kunder
7. ✅ Velge en kunde fra listen
8. ✅ Søke i begge dropdowns
9. ✅ Opprette en ny PT-økt
10. ✅ Redigere en eksisterende PT-økt

## 🎯 Kritiske Fikser Implementert

1. **Modal Nesting Fix**: Flyttet dropdown modals UTENFOR SafeAreaView
2. **Fragment Wrapper**: Bruker `<>` for å returnere multiple root elements
3. **Unique Modal Styles**: Separate styles for dropdown modals vs main modal
4. **SUPER_ADMIN Authorization**: Lagt til i /pt/clients endpoint
5. **Backend PATCH**: Bruker riktig HTTP method for update

## 📝 Console Logs å Se Etter

Når du tester, skal du se disse loggene i browser console:

```
[PTManagement] Loading trainers and customers...
[PTManagement] Trainers loaded: 11
[PTManagement] Customers loaded: 22
[PTManagement] Opening trainer dropdown. Trainers: 11
[PTManagement] Opening customer dropdown. Customers: 22
```

Hvis du IKKE ser disse loggene, er det et problem med komponenten.

## 🚀 Neste Steg

Etter at alle tester er bestått:
1. Test på iOS simulator
2. Test på Android emulator
3. Test edge cases (ugyldig data, nettverksfeil, etc.)
4. Performance testing med mange økter

---

**Status**: Backend verifisert ✅ | Frontend klar for testing 🧪
