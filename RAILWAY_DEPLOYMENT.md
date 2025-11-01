# Railway Deployment Guide - ObliKey Backend

Komplett guide for å deploye ObliKey backend til Railway med PostgreSQL database.

## Hvorfor Railway?

✅ **GRATIS** tier (500 timer/måned, $5 free credits)
✅ **Automatisk PostgreSQL** database inkludert
✅ **Deploy med én kommando**
✅ **Automatisk HTTPS** og SSL
✅ **Automatisk skalering**
✅ **Enkel environment variables management**

---

## Deployment Workflow

### 1. Logg Inn på Railway

```bash
railway login
```

Dette åpner nettleseren hvor du logger inn med GitHub, Google eller e-post.

---

### 2. Opprett Nytt Prosjekt

```bash
cd backend
railway init
```

Velg:
- **Create new project**
- Gi prosjektet navn: `oblikey-backend`

---

### 3. Legg Til PostgreSQL Database

```bash
railway add --database postgres
```

Dette oppretter automatisk:
- ✅ PostgreSQL database
- ✅ `DATABASE_URL` environment variable
- ✅ Backup og monitorering

---

### 4. Sett Environment Variables

Kjør dette scriptet for å sette alle nødvendige variabler:

```bash
# JWT Secret (generer en sterk secret)
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Node Environment
railway variables set NODE_ENV=production

# JWT Expiry
railway variables set JWT_EXPIRES_IN=7d

# PORT (Railway setter dette automatisk, men vi kan override)
railway variables set PORT=3000

# CORS - VIKTIG: Oppdater med dine faktiske domener
railway variables set ALLOWED_ORIGINS="https://expo.dev,https://your-frontend-domain.com"

# Frontend URL
railway variables set FRONTEND_URL="https://expo.dev"
```

**VALGFRITT - hvis du bruker Stripe/Email:**

```bash
# Stripe (hvis du bruker betalinger)
railway variables set STRIPE_SECRET_KEY="sk_live_your_key"
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_your_key"
railway variables set STRIPE_WEBHOOK_SECRET="whsec_your_secret"

# Email (hvis du bruker e-postbekreftelse)
railway variables set EMAIL_HOST="smtp.gmail.com"
railway variables set EMAIL_PORT=587
railway variables set EMAIL_USER="your-email@gmail.com"
railway variables set EMAIL_PASSWORD="your-app-password"
railway variables set EMAIL_FROM="ObliKey <noreply@oblikey.com>"
```

---

### 5. Deploy Backend

```bash
railway up
```

Dette vil:
1. ✅ Laste opp koden
2. ✅ Installere dependencies
3. ✅ Generere Prisma client
4. ✅ Bygge TypeScript
5. ✅ Kjøre database migrasjoner
6. ✅ Starte serveren

---

### 6. Få Production URL

```bash
railway domain
```

Dette genererer en public URL som:
```
https://oblikey-backend-production.up.railway.app
```

**VIKTIG:** Kopier denne URL-en - du trenger den for frontend!

---

## Verifiser Deployment

### Sjekk Server Status

```bash
curl https://oblikey-backend-production.up.railway.app/health
```

Skal returnere:
```json
{
  "status": "OK",
  "timestamp": "2025-11-01T..."
}
```

### Sjekk Database Connection

```bash
railway run npx prisma studio
```

Dette åpner Prisma Studio hvor du kan se databasen.

---

## Oppdatere Backend

### Method 1: Automatisk Deploy (Anbefalt)

**Koble GitHub Repository:**

1. Gå til Railway Dashboard: https://railway.app/dashboard
2. Velg `oblikey-backend` prosjekt
3. Klikk **Settings → Connect GitHub**
4. Velg `ObliKey` repository og `main` branch

Nå deployes backend automatisk ved hver `git push`!

---

### Method 2: Manuell Deploy

```bash
railway up
```

---

## Database Migrations

### Kjøre Nye Migrasjoner

Når du har endret Prisma schema:

```bash
# 1. Lag migrasjon lokalt
npx prisma migrate dev --name your_migration_name

# 2. Commit til git
git add .
git commit -m "feat: Add new database migration"
git push

# 3. Railway deployer automatisk og kjører migrasjoner
```

**Eller manuelt:**

```bash
railway run npx prisma migrate deploy
```

---

## Monitoring og Logs

### Live Logs

```bash
railway logs
```

### Railway Dashboard

Gå til: https://railway.app/dashboard

Her ser du:
- 📊 CPU/Memory usage
- 📈 Request metrics
- 🚨 Error logs
- 💾 Database størrelse

---

## Kostnader

### Free Tier

✅ **$5 gratis credits per måned**
✅ **500 execution timer**
✅ **PostgreSQL database (100 GB storage)**
✅ **1 GB RAM per service**

**Typisk bruk for ObliKey:**
- Backend server: ~$3-5/måned
- PostgreSQL: Inkludert
- **Total: Gratis første måneden, deretter ~$3-5/mnd**

### Hobby Plan ($5/mnd)

- ✅ $5/mnd subscription
- ✅ $5 gratis credits
- ✅ Priority support
- ✅ Mer ressurser

---

## Troubleshooting

### Problem: Build Failed

**Sjekk logs:**
```bash
railway logs --build
```

**Vanlige problemer:**
- TypeScript errors - kjør `npm run type-check` lokalt
- Missing dependencies - sjekk `package.json`
- Prisma schema errors - valider med `npx prisma validate`

---

### Problem: Database Connection Failed

**Sjekk DATABASE_URL:**
```bash
railway variables
```

**Test connection:**
```bash
railway run npx prisma migrate status
```

---

### Problem: Server Crashed

**Sjekk logs:**
```bash
railway logs
```

**Restart service:**
```bash
railway restart
```

---

## Environment Variables Oversikt

| Variable | Påkrevd | Beskrivelse |
|----------|---------|-------------|
| `DATABASE_URL` | ✅ | Settes automatisk av Railway |
| `JWT_SECRET` | ✅ | Secret for JWT tokens |
| `NODE_ENV` | ✅ | Sett til `production` |
| `PORT` | ⚠️ | Settes automatisk av Railway |
| `ALLOWED_ORIGINS` | ✅ | CORS whitelist |
| `FRONTEND_URL` | ✅ | Frontend URL for redirects |
| `STRIPE_SECRET_KEY` | ⚪ | Kun hvis du bruker Stripe |
| `EMAIL_HOST` | ⚪ | Kun hvis du sender e-post |

---

## Quick Commands Reference

```bash
# Logg inn
railway login

# Opprett prosjekt
railway init

# Legg til database
railway add --database postgres

# Sett environment variable
railway variables set KEY=value

# Se alle variables
railway variables

# Deploy
railway up

# Live logs
railway logs

# Åpne dashboard
railway open

# Kjør kommando i production
railway run <command>

# Restart service
railway restart

# Åpne database
railway run npx prisma studio
```

---

## Neste Steg

1. ✅ Deploy backend til Railway
2. ✅ Få production URL
3. ⏭️ Oppdater frontend `api.ts` med production URL
4. ⏭️ Deploy ny frontend versjon med `npm run deploy:demo`
5. ⏭️ Test at alt fungerer sammen

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Prisma Docs**: https://www.prisma.io/docs

---

**ObliKey Railway Deployment Guide** | **Version 1.0** | **2025**
