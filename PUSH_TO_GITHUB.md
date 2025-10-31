# Push til GitHub - Instruksjoner

## Status
✅ **Commit er klar!** Alle endringer er committed lokalt.

**Commit ID:** 6c4fe9f
**Branch:** main
**Remote:** https://github.com/job000/ObliKey.git

---

## Hvordan pushe til GitHub

### Metode 1: Push med Personal Access Token (Anbefalt)

1. Åpne Terminal og naviger til prosjektet:
   ```bash
   cd /Users/johnmichaelobligar/Documents/Development/ObliKey
   ```

2. Push til GitHub:
   ```bash
   git push origin main
   ```

3. Når du blir bedt om brukernavn og passord:
   - **Username:** job000 (ditt GitHub brukernavn)
   - **Password:** Bruk GitHub Personal Access Token (IKKE ditt GitHub passord)

4. Hvis du ikke har et Personal Access Token:
   - Gå til: https://github.com/settings/tokens
   - Klikk "Generate new token" → "Generate new token (classic)"
   - Gi det et navn (f.eks. "ObliKey Development")
   - Velg scope: `repo` (full control of private repositories)
   - Klikk "Generate token"
   - **Kopier token med en gang** (vises kun én gang!)
   - Bruk dette som passord når du pusher

---

### Metode 2: Cache credentials for enklere bruk

Sett opp credential helper for å lagre token:

```bash
# På macOS
git config --global credential.helper osxkeychain

# Push på nytt
git push origin main
```

Credentials vil nå bli lagret i macOS Keychain.

---

### Metode 3: Bruk SSH (Permanent løsning)

1. Generer SSH-nøkkel (hvis du ikke har en):
   ```bash
   ssh-keygen -t ed25519 -C "din-email@example.com"
   ```
   Trykk Enter for å akseptere standardplassering.

2. Kopier SSH public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub | pbcopy
   ```

3. Legg til på GitHub:
   - Gå til: https://github.com/settings/keys
   - Klikk "New SSH key"
   - Lim inn nøkkelen
   - Klikk "Add SSH key"

4. Endre remote URL til SSH:
   ```bash
   cd /Users/johnmichaelobligar/Documents/Development/ObliKey
   git remote set-url origin git@github.com:job000/ObliKey.git
   ```

5. Push:
   ```bash
   git push origin main
   ```

---

## Hva er i denne committen?

```
feat: Forbedringer i innstillinger, PT-administrasjon og rapporter

✅ Innstillinger (Settings)
   • Fikset "Ugyldig input oppdaget" feil ved lagring
   • Moderne tidsvelger for åpningstid og stengetid
   • iOS modal med "Ferdig"-knapp
   • Android native time picker

✅ PT-Administrasjon
   • Fikset dropdown-modaler for PT og kunde på iOS
   • Modal nesting for iOS compatibility

✅ Rapporter & Analyse
   • Fikset tittel layout (SafeAreaView)
   • Fikset omsetningsberegning (DELIVERED status)
   • Fikset skjulte rapport-kort nederst

✅ Testing & Dokumentasjon
   • test-analytics.sh
   • test-tenant-settings.sh
   • test-tenant-isolation.sh
   • TENANT_ISOLATION_TEST.md
```

**Filer endret:** 11
**Linjer lagt til:** 2915
**Linjer fjernet:** 268

---

## Trenger du hjelp?

Hvis du får feilmeldinger, sjekk:

1. **Error: "could not read Username"**
   → Bruk Personal Access Token (se Metode 1)

2. **Error: "Permission denied (publickey)"**
   → Sett opp SSH-nøkkel (se Metode 3)

3. **Error: "Authentication failed"**
   → Sjekk at Personal Access Token har `repo` scope

---

## Quick Command (Kopier og lim inn)

```bash
cd /Users/johnmichaelobligar/Documents/Development/ObliKey && git push origin main
```

Når dette kommandoen kjører, skriv inn:
- Username: `job000`
- Password: `[ditt Personal Access Token]`
