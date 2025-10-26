# ObliKey - Multi-Tenant Fitness Platform

> Enterprise-grade SaaS platform for fitness studios, gyms, and personal trainers.

![Status](https://img.shields.io/badge/status-production--ready-success)
![Coverage](https://img.shields.io/badge/coverage->70%25-brightgreen)
![Node](https://img.shields.io/badge/node-20.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

---

## 🚀 Quick Start

### Enkleste Måte (2 minutter)

```bash
# 1. Kjør setup script
chmod +x setup.sh
./setup.sh

# 2. Start applikasjonen
./start.sh

# 3. Åpne i nettleser
open http://localhost:5173
```

**Det er alt! 🎉**

Setup scriptet gjør alt for deg:
- ✅ Sjekker forutsetninger
- ✅ Installerer dependencies
- ✅ Setter opp database
- ✅ Konfigurerer miljøvariabler
- ✅ Kjører migrasjoner

---

## 📋 Innhold

- [Funksjoner](#-funksjoner)
- [Teknologi Stack](#-teknologi-stack)
- [Forutsetninger](#-forutsetninger)
- [Installasjon](#-installasjon)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Dokumentasjon](#-dokumentasjon)
- [Support](#-support)

---

## ✨ Funksjoner

### Core Features
- 🔐 **Autentisering** - Sikker JWT-basert auth med roller
- 📅 **Klasse Management** - Opprett og administrer treningsklasser
- 🎟️ **Booking System** - Book klasser med kapasitetshåndtering
- 💪 **Personal Training** - PT sesjon og program management
- 💬 **Chat/Messaging** - Real-time meldinger mellom brukere
- 💳 **Betalinger** - Stripe og Vipps integrasjon
- 👥 **Multi-Tenant** - Komplett isolasjon mellom kunder
- 🎨 **White-Label** - Tilpass branding per kunde

### Enterprise Features
- 🏢 **Platform Admin** - Administrer alle kunder fra ett sted
- 🚩 **Feature Flags** - Aktiver/deaktiver funksjoner per pakke
- 📊 **Analytics** - Omfattende rapportering og metrics
- 🔒 **Security** - Rate limiting, XSS/SQL prevention
- 📈 **Scalable** - Bygget for vekst fra dag 1

---

## 🛠️ Teknologi Stack

### Backend
- **Node.js** 20+ med TypeScript
- **Express** - Web framework
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Database
- **Redis** - Caching & rate limiting
- **JWT** - Authentication
- **Stripe & Vipps** - Payments

### Frontend
- **React** 18 med TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Jest & Supertest** - Testing

---

## 📦 Forutsetninger

### Må Ha
- **Node.js** v20 eller nyere ([Last ned](https://nodejs.org/))
- **PostgreSQL** v16+ ([Installasjon guide](https://www.postgresql.org/download/))

### Anbefalt
- **Docker & Docker Compose** (enkleste oppsett)
- **Redis** (for rate limiting og caching)

### Installer Alt på macOS
```bash
# Installer Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer alt du trenger
brew install node@20 postgresql@16 redis docker
```

### Installer Alt på Windows (Chocolatey)
```bash
choco install nodejs-lts postgresql16 redis-64 docker-desktop
```

---

## 🔧 Installasjon

### Metode 1: Automatisk Setup (Anbefalt) ⭐

```bash
# Kjør setup script
chmod +x setup.sh
./setup.sh

# Følg instruksjonene
# Velg Docker (1) eller Manuelt (2)
```

### Metode 2: Docker Compose

```bash
# Start alle tjenester
docker-compose up -d

# Kjør migrasjoner
docker-compose exec app npx prisma migrate dev

# Åpne i nettleser
open http://localhost:5173
```

### Metode 3: Manuelt

Se detaljert guide i [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)

---

## 🧪 Testing

### Kjør Alle Tester

```bash
./test.sh
```

### Manuell Testing

```bash
# Backend tester
cd backend
npm test

# Med coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Test Coverage

Current coverage: **>70%** på alle metrics

```bash
# Generer coverage rapport
npm test -- --coverage

# Åpne HTML rapport
open coverage/lcov-report/index.html
```

Se full testguide: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 📱 Bruk Applikasjonen

### 1. Registrer Deg

```
http://localhost:5173/register

Email: test@example.com
Passord: Test123! (minst 8 tegn, stor bokstav, tall)
```

### 2. Utforsk Features

- **Dashboard** - Oversikt over aktivitet
- **Klasser** - Bla og book klasser
- **PT Sesjoner** - Administrer PT sessions
- **Chat** - Send meldinger
- **Admin** - Administrer brukere (admin rolle)

### 3. Test API Direkte

```bash
# Health check
curl http://localhost:3000/health

# Registrer bruker
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "tenantId": "test-tenant"
  }'
```

---

## 🚀 Deployment

### Railway (Anbefalt for MVP)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### AWS ECS / DigitalOcean / Render

Se detaljert guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📚 Dokumentasjon

### For Utviklere

| Dokument | Beskrivelse |
|----------|-------------|
| [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) | **START HER** - Komplett guide for testing |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Alle API endpoints med eksempler |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Automatisert testing best practices |

### For DevOps

| Dokument | Beskrivelse |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment til prod/staging |
| [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) | GitHub Actions workflows |
| [ENTERPRISE_ARCHITECTURE.md](./ENTERPRISE_ARCHITECTURE.md) | System arkitektur |

### For Business

| Dokument | Beskrivelse |
|----------|-------------|
| [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) | Executive overview |
| [FINAL_DELIVERY.md](./FINAL_DELIVERY.md) | Feature liste og business model |

---

## 📊 Prosjekt Struktur

```
ObliKey/
├── backend/                 # Express + TypeScript + Prisma
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, security, validation
│   │   ├── services/       # Business logic
│   │   └── index.ts       # Server entry
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── tests/             # Jest tests
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/         # All pages
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API service
│   └── public/            # Static assets
│
├── .github/workflows/     # CI/CD pipelines
├── setup.sh              # Quick setup script
├── start.sh              # Start servers
├── stop.sh               # Stop servers
├── test.sh               # Run tests
└── docker-compose.yml    # Docker setup
```

---

## 🔥 Vanlige Kommandoer

```bash
# Start applikasjonen
./start.sh

# Stopp applikasjonen
./stop.sh

# Kjør tester
./test.sh

# Åpne Prisma Studio (database GUI)
cd backend && npx prisma studio

# Generer ny migration
cd backend && npx prisma migrate dev --name your_migration_name

# Reset database (ADVARSEL: Sletter all data)
cd backend && npx prisma migrate reset

# Build for production
cd backend && npm run build
cd frontend && npm run build
```

---

## 🐛 Feilsøking

### Problem: Database connection error

```bash
# Sjekk at PostgreSQL kjører
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@16
```

### Problem: Port already in use

```bash
# Finn prosess på port 3000
lsof -i :3000

# Drep prosessen
kill -9 <PID>
```

### Problem: Redis error

```bash
# Start Redis
brew services start redis

# Eller kommenter ut REDIS_URL i .env
```

Se full feilsøkingsguide: [MANUAL_TESTING_GUIDE.md#vanlige-problemer](./MANUAL_TESTING_GUIDE.md#vanlige-problemer)

---

## 🤝 Bidra

### Development Workflow

1. Fork repository
2. Opprett feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push til branch (`git push origin feature/amazing-feature`)
5. Åpne Pull Request

### Commit Convention

Vi bruker [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Ny feature
- `fix:` - Bug fix
- `docs:` - Dokumentasjon
- `test:` - Tester
- `refactor:` - Code refactoring
- `chore:` - Maintenance

---

## 📞 Support

### For Utviklere
- **GitHub Issues** - Rapporter bugs
- **Dokumentasjon** - Se docs/ mappen

### For Kunder
- **Email** - support@oblikey.com
- **Telefon** - +47 XXX XX XXX

---

## 📄 Lisens

**Proprietary** - Copyright © 2024 ObliKey AS

All rights reserved. Unauthorized copying or distribution is prohibited.

---

## 🎯 Subscription Packages

| Package | Pris | Features |
|---------|------|----------|
| **Starter** | 995 kr/mnd | Landing page, basic branding |
| **Basic** | 1,995 kr/mnd | Full app, 100 users |
| **Pro** | 3,995 kr/mnd | 500 users, all features, API |
| **Enterprise** | 7,995 kr/mnd | Unlimited, white-label, priority support |

---

## 🏆 Status

- ✅ **Backend** - Production ready
- ✅ **Frontend** - Production ready
- ✅ **Testing** - >70% coverage
- ✅ **Documentation** - Complete
- ✅ **CI/CD** - Automated pipelines
- ✅ **Security** - Enterprise-grade
- 🟡 **Staging** - Ready to deploy
- 🟡 **Production** - Ready to deploy

---

## 🌟 Key Features Checklist

- ✅ Multi-tenant architecture
- ✅ User authentication & authorization
- ✅ Class & booking management
- ✅ PT session management
- ✅ Training programs
- ✅ Real-time chat/messaging
- ✅ Payment integration (Stripe, Vipps)
- ✅ Platform admin dashboard
- ✅ Rate limiting & security
- ✅ Comprehensive testing
- ✅ CI/CD pipelines
- ✅ Docker deployment
- ✅ Complete documentation

---

## 🚀 Quick Links

- 🏠 **Homepage**: http://localhost:5173
- 🔧 **API**: http://localhost:3000/api
- 💚 **Health**: http://localhost:3000/health
- 📊 **DB Admin**: `cd backend && npx prisma studio`

---

**Built with ❤️ for the fitness industry**

*For mer informasjon, se [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)*
