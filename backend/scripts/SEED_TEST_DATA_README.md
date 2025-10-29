# ObliKey Test Data Seed Script

This script creates comprehensive test data for the `oblikey-demo` tenant, including products, personal trainers, and test members.

## What Gets Created

### 🏢 Tenant
- **Name**: ObliKey Demo Gym
- **Subdomain**: oblikey-demo
- **All modules enabled**: E-commerce, Membership, Classes, Door Access, Accounting, etc.

### 💪 Personal Trainers (5)
Each trainer has:
- Unique Norwegian name
- Email and username
- Specialty (Strength, CrossFit, Yoga, Nutrition, Rehab)
- Bio description
- **Password**: `password123`

### 👥 Members/Customers (15)
With various membership statuses:
- 6 with ACTIVE memberships
- 2 with EXPIRED memberships
- 1 CANCELLED membership
- 1 FROZEN membership
- **Password**: `password123`

### 🛒 Products (22 total)

#### Membership Packages (4)
- Basis Medlemskap - 399 NOK/month
- Premium Medlemskap - 599 NOK/month
- VIP Medlemskap - 899 NOK/month
- Årskort Premium - 5990 NOK/year

#### Personal Training Packages (3)
- PT Intro - 1 time - 499 NOK
- PT Pakke - 5 timer - 2495 NOK
- PT Pakke - 10 timer - 4495 NOK

#### Group Classes (1)
- Gruppetime Klippekort - 10 stk - 899 NOK

#### Training Equipment (6)
- Treningshansker Premium - 349 NOK
- Yoga Matte Pro - 449 NOK
- Treningselastikk Sett - 299 NOK
- Kettlebell 16kg - 599 NOK
- Skippetau Speed - 199 NOK
- Foam Roller - 249 NOK

#### Supplements (5)
- Proteinpulver Vanilje 1kg - 449 NOK
- Proteinpulver Sjokolade 1kg - 449 NOK
- BCAA Energi 400g - 299 NOK
- Creatine Monohydrate 500g - 249 NOK
- Pre-Workout Boost - 349 NOK

#### Digital Products (2)
- 12-ukers Styrkeprogram - 799 NOK
- Kostholdsplan Vektreduksjon - 499 NOK

## How to Run

### Option 1: Using ts-node (Recommended)
```bash
cd /Users/johnmichaelobligar/Documents/Development/ObliKey/backend
npx ts-node scripts/seed-test-data.ts
```

### Option 2: Using tsx
```bash
cd /Users/johnmichaelobligar/Documents/Development/ObliKey/backend
npx tsx scripts/seed-test-data.ts
```

### Option 3: Compile and Run
```bash
cd /Users/johnmichaelobligar/Documents/Development/ObliKey/backend
npm run build
node dist/scripts/seed-test-data.js
```

## Prerequisites

1. **Database must be running** and accessible
2. **Environment variables** must be set (DATABASE_URL in .env)
3. **Prisma migrations** must be up to date:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

## Output

The script will print:
- ✅ Progress as it creates each entity
- 📊 Summary of what was created
- 🔑 Complete list of all test credentials
- 📝 Product categories and prices
- 🚀 Quick start instructions

## Test Credentials Format

All credentials use the same password: `password123`

**Trainers:**
- Email: trainer1@oblikey-demo.no, trainer2@oblikey-demo.no, etc.
- Username: trainer1, trainer2, trainer3, trainer4, trainer5

**Customers:**
- Email: kunde1@oblikey-demo.no, kunde2@oblikey-demo.no, etc.
- Username: kunde1, kunde2, kunde3, ..., kunde15

## Safety Features

- ✅ Checks if tenant already exists (won't duplicate)
- ✅ Checks if users already exist (won't duplicate)
- ✅ Checks if products already exist (won't duplicate)
- ✅ Safe to run multiple times

## Troubleshooting

### Error: "Tenant not found"
The script will automatically create the oblikey-demo tenant if it doesn't exist.

### Error: "Database connection failed"
Check your DATABASE_URL in `.env` file.

### Error: "Module not found"
Run `npm install` to install all dependencies.

### Products already exist
The script checks for existing products by slug and will skip duplicates.

## Cleaning Up Test Data

If you want to remove all test data:

```bash
# WARNING: This will delete all data for oblikey-demo tenant
npx prisma studio
# Then manually delete the tenant or use Prisma to delete
```

Or use SQL:
```sql
DELETE FROM tenants WHERE subdomain = 'oblikey-demo';
```

## Next Steps After Seeding

1. **Login to the application** using any of the test credentials
2. **Test e-commerce** by purchasing products as a customer
3. **Create PT sessions** as a trainer
4. **Book sessions** as a customer
5. **Test membership features** with different membership statuses

## Notes

- All product images use placeholder URLs from Unsplash
- Stock quantities are set for physical products
- Membership and PT packages have validity periods set
- All Norwegian names and realistic gym-related products
- Prices are in NOK (Norwegian Kroner)
