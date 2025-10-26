const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'oblikey-demo';

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  // Update or create ADMIN user
  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: 'admin@oblikey.no'
      }
    },
    update: {
      password: adminPassword,
      active: true,
      role: 'ADMIN'
    },
    create: {
      tenantId,
      email: 'admin@oblikey.no',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Bruker',
      role: 'ADMIN',
      active: true,
      emailVerified: true
    }
  });

  console.log('✅ Admin user:', admin.email, '/ admin123');

  // Update or create TRAINER user
  const trainer = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: 'pt@oblikey.no'
      }
    },
    update: {
      password: trainerPassword,
      active: true,
      role: 'TRAINER'
    },
    create: {
      tenantId,
      email: 'pt@oblikey.no',
      password: trainerPassword,
      firstName: 'PT',
      lastName: 'Instruktør',
      role: 'TRAINER',
      active: true,
      emailVerified: true
    }
  });

  console.log('✅ Trainer user:', trainer.email, '/ trainer123');

  // Update or create CUSTOMER user
  const customer = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: 'kunde@oblikey.no'
      }
    },
    update: {
      password: customerPassword,
      active: true,
      role: 'CUSTOMER'
    },
    create: {
      tenantId,
      email: 'kunde@oblikey.no',
      password: customerPassword,
      firstName: 'Test',
      lastName: 'Kunde',
      role: 'CUSTOMER',
      active: true,
      emailVerified: true
    }
  });

  console.log('✅ Customer created:', customer.email, '/ customer123');

  console.log('\n📋 Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADMIN:    admin@oblikey.no    / admin123');
  console.log('TRAINER:  pt@oblikey.no       / trainer123');
  console.log('CUSTOMER: kunde@oblikey.no    / customer123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
