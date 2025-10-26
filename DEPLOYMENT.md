# ObliKey Enterprise - Deployment Guide

## 🚀 Deployment Options

### Option 1: Docker (Recommended)

**Best for:** Production, easy management, scalability

```bash
# 1. Clone repository
git clone https://github.com/yourorg/oblikey.git
cd oblikey

# 2. Configure environment
cp .env.production.example .env
# Edit .env with your values

# 3. Build and start
docker-compose up -d

# 4. Run migrations
docker-compose exec app npx prisma migrate deploy

# 5. Create platform admin (first user)
docker-compose exec app node scripts/create-platform-admin.js

# Done! App running on http://localhost:3000
```

### Option 2: Railway

**Best for:** Quick deployment, managed infrastructure

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click "Deploy on Railway"
2. Configure environment variables
3. Connect your GitHub repo
4. Railway auto-deploys!

**Environment Variables to set:**
- `DATABASE_URL` (auto-configured by Railway Postgres)
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- All from `.env.production.example`

### Option 3: Render

**Best for:** Free tier available, easy setup

1. Create Render account
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - **Build Command:** `npm install && cd backend && npx prisma generate && npm run build && cd ../frontend && npm install && npm run build`
   - **Start Command:** `cd backend && npx prisma migrate deploy && node dist/index.js`
5. Add PostgreSQL database
6. Set environment variables

### Option 4: DigitalOcean App Platform

**Best for:** $5/month droplet, full control

```bash
# 1. Create App Platform project
doctl apps create --spec .do/app.yaml

# 2. Or use web interface:
# - Select GitHub repo
# - Dockerfile deployment
# - Add managed PostgreSQL database
# - Configure environment variables
```

### Option 5: Vercel + Supabase

**Best for:** Serverless, global CDN

**Backend (Vercel):**
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

**Database (Supabase):**
- Create Supabase project
- Get connection string
- Set as `DATABASE_URL`

### Option 6: AWS (Production-grade)

**Components:**
- **Compute:** ECS Fargate (Docker containers)
- **Database:** RDS PostgreSQL
- **Cache:** ElastiCache Redis
- **Storage:** S3 for file uploads
- **CDN:** CloudFront
- **Load Balancer:** Application Load Balancer

## 📋 Pre-Deployment Checklist

### Security

- [ ] Change all default passwords
- [ ] Generate secure JWT secret (min 32 characters)
- [ ] Configure CORS allowed origins
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable database backups

### Stripe Setup

1. **Create Products in Stripe Dashboard:**
   - Starter (995 NOK/month)
   - Basic (1995 NOK/month)
   - Pro (3995 NOK/month)
   - Enterprise (7995 NOK/month)

2. **Get Price IDs:**
   ```
   Products → Pricing → Copy Price ID
   ```

3. **Set up Webhook:**
   ```
   Developers → Webhooks → Add endpoint
   URL: https://yourdomain.com/api/webhooks/stripe
   Events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
   ```

4. **Get Webhook Secret:**
   ```
   Copy webhook signing secret → STRIPE_WEBHOOK_SECRET
   ```

### Vipps Setup

1. **Register as Vipps Partner**
2. **Get credentials:**
   - Client ID
   - Client Secret
   - Subscription Key
   - Merchant Serial Number
3. **Test in Test environment first**
4. **Apply for Production access**

### Email Setup

**Option 1: SendGrid** (Recommended)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxx  # API key
```

**Option 2: AWS SES**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=AKIAIOSFODNN7EXAMPLE
EMAIL_PASSWORD=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Option 3: Gmail** (Not recommended for production)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🔄 Database Migrations

### Production Migration

```bash
# Always backup first!
pg_dump $DATABASE_URL > backup.sql

# Run migrations
npx prisma migrate deploy

# Rollback if needed
psql $DATABASE_URL < backup.sql
```

### Zero-downtime Migration

1. Deploy new version (blue-green deployment)
2. Run migrations on new version
3. Switch traffic gradually
4. Monitor for errors
5. Rollback if needed

## 📊 Monitoring & Logging

### Sentry (Error Tracking)

```bash
npm install @sentry/node

# In src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Logging

```bash
npm install winston

# Configure structured logging
```

### Health Checks

```
GET /health
{
  "status": "OK",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Uptime Monitoring

- **UptimeRobot** (Free)
- **Pingdom**
- **Datadog**

## 🔐 SSL/HTTPS

### Option 1: Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Change nameservers
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"
5. Free SSL certificate auto-provisioned

### Option 2: Let's Encrypt + Nginx

```nginx
server {
    listen 80;
    server_name oblikey.com www.oblikey.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name oblikey.com www.oblikey.com;

    ssl_certificate /etc/letsencrypt/live/oblikey.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oblikey.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🌍 Custom Domains for Tenants

### Wildcard DNS

```
*.oblikey.no  →  Your Server IP
```

**Allows:**
- tenant1.oblikey.no
- tenant2.oblikey.no
- etc.

### Custom Domains (Enterprise Plan)

1. Customer adds CNAME record:
   ```
   www.theirgym.com  →  tenant1.oblikey.no
   ```

2. Verify domain ownership
3. Provision SSL certificate
4. Update tenant config:
   ```sql
   UPDATE tenants
   SET customDomain = 'www.theirgym.com'
   WHERE id = 'xxx';
   ```

## 📈 Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
    depends_on:
      - postgres
      - redis
```

### Load Balancing

**Nginx:**
```nginx
upstream oblikey {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    location / {
        proxy_pass http://oblikey;
    }
}
```

**Cloudflare Load Balancing:**
- Automatic
- Global distribution
- Health checks included

### Database Scaling

**Read Replicas:**
```typescript
// Prisma supports read replicas
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Read from replica
const users = await prisma.user.findMany({
  __replica: true,
});
```

**Connection Pooling:**
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

## 💾 Backup Strategy

### Automated Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump $DATABASE_URL | gzip > backups/backup-$DATE.sql.gz

# Retain 30 days
find backups/ -name "backup-*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp backups/backup-$DATE.sql.gz s3://oblikey-backups/
```

### Point-in-Time Recovery

Use managed databases with PITR:
- AWS RDS: 35 days retention
- Railway: Automatic backups
- Supabase: Point-in-time recovery

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t oblikey:latest .

      - name: Push to registry
        run: docker push oblikey:latest

      - name: Deploy
        run: |
          ssh user@server "
            docker pull oblikey:latest &&
            docker-compose up -d
          "
```

## 🛡️ Security Best Practices

1. **Environment Variables:** Never commit secrets
2. **Database:** Use strong passwords, restrict access
3. **API:** Rate limiting, input validation
4. **Dependencies:** Regular updates (`npm audit`)
5. **Monitoring:** Set up alerts for suspicious activity
6. **Backups:** Test restore procedures regularly
7. **SSL:** Enforce HTTPS everywhere
8. **Headers:** Security headers (helmet.js)

## 📞 Post-Deployment

### Smoke Tests

```bash
# Health check
curl https://yourdomain.com/health

# Auth
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Create tenant (platform admin)
curl -X POST https://yourdomain.com/api/platform/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Monitoring Dashboard

Set up:
- Error rate alerts
- Response time monitoring
- Database connection pool
- Memory/CPU usage
- Disk space

### Support

- Set up support email
- Create status page
- Document common issues
- Train support team

---

**Need help?** See troubleshooting guide or contact support.
