import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedTenantAndUsers() {
  console.log('Starting seed for tenants and users...\n');

  try {
    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // ========================================
    // TENANT 1: MED BUTIKK OG REGNSKAP
    // ========================================

    let tenant1 = await prisma.tenant.findUnique({
      where: { subdomain: 'premium-gym' }
    });

    if (!tenant1) {
      tenant1 = await prisma.tenant.create({
        data: {
          name: 'Premium Gym',
          subdomain: 'premium-gym',
          email: 'post@premiumgym.no',
          phone: '+47 123 45 678',
          address: 'Treningsgate 1, 0001 Oslo',
          active: true
        }
      });

      await prisma.tenantSettings.create({
        data: {
          tenantId: tenant1.id,
          accountingEnabled: true,
          ecommerceEnabled: true,
          classesEnabled: true,
          chatEnabled: true,
          landingPageEnabled: true,
          currency: 'NOK',
          timezone: 'Europe/Oslo'
        }
      });

      console.log('✓ Tenant 1 created: Premium Gym (MED butikk og regnskap)');
    } else {
      console.log('✓ Tenant 1 exists: Premium Gym');
    }

    // Create users for Tenant 1
    const tenant1Users = [
      // 2 Admins
      { username: 'admin1', email: 'admin1@premiumgym.no', firstName: 'Ola', lastName: 'Adminsen', role: UserRole.ADMIN },
      { username: 'admin2', email: 'admin2@premiumgym.no', firstName: 'Kari', lastName: 'Adminsen', role: UserRole.ADMIN },
      // 2 Trainers
      { username: 'trainer1', email: 'trainer1@premiumgym.no', firstName: 'Per', lastName: 'Trener', role: UserRole.TRAINER },
      { username: 'trainer2', email: 'trainer2@premiumgym.no', firstName: 'Anne', lastName: 'Trener', role: UserRole.TRAINER },
      // 2 Customers
      { username: 'kunde1', email: 'kunde1@premiumgym.no', firstName: 'Lars', lastName: 'Kunde', role: UserRole.CUSTOMER },
      { username: 'kunde2', email: 'kunde2@premiumgym.no', firstName: 'Nina', lastName: 'Kunde', role: UserRole.CUSTOMER },
    ];

    for (const userData of tenant1Users) {
      const existing = await prisma.user.findFirst({
        where: {
          tenantId: tenant1.id,
          username: userData.username
        }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            ...userData,
            tenantId: tenant1.id,
            password: hashedPassword,
            active: true,
            emailVerified: true
          }
        });
        console.log(`  ✓ ${userData.role}: ${userData.username}`);
      }
    }

    // ========================================
    // TENANT 2: UTEN BUTIKK OG REGNSKAP
    // ========================================

    let tenant2 = await prisma.tenant.findUnique({
      where: { subdomain: 'basic-gym' }
    });

    if (!tenant2) {
      tenant2 = await prisma.tenant.create({
        data: {
          name: 'Basic Gym',
          subdomain: 'basic-gym',
          email: 'post@basicgym.no',
          phone: '+47 987 65 432',
          address: 'Treningsveien 99, 0002 Bergen',
          active: true
        }
      });

      await prisma.tenantSettings.create({
        data: {
          tenantId: tenant2.id,
          accountingEnabled: false,
          ecommerceEnabled: false,
          classesEnabled: true,
          chatEnabled: true,
          landingPageEnabled: false,
          currency: 'NOK',
          timezone: 'Europe/Oslo'
        }
      });

      console.log('\n✓ Tenant 2 created: Basic Gym (UTEN butikk og regnskap)');
    } else {
      console.log('\n✓ Tenant 2 exists: Basic Gym');
    }

    // Create users for Tenant 2
    const tenant2Users = [
      // 2 Admins
      { username: 'basic_admin1', email: 'admin1@basicgym.no', firstName: 'Tom', lastName: 'Admin', role: UserRole.ADMIN },
      { username: 'basic_admin2', email: 'admin2@basicgym.no', firstName: 'Eva', lastName: 'Admin', role: UserRole.ADMIN },
      // 2 Trainers
      { username: 'basic_trainer1', email: 'trainer1@basicgym.no', firstName: 'Jan', lastName: 'PT', role: UserRole.TRAINER },
      { username: 'basic_trainer2', email: 'trainer2@basicgym.no', firstName: 'Liv', lastName: 'PT', role: UserRole.TRAINER },
      // 2 Customers
      { username: 'basic_kunde1', email: 'kunde1@basicgym.no', firstName: 'Erik', lastName: 'Medlem', role: UserRole.CUSTOMER },
      { username: 'basic_kunde2', email: 'kunde2@basicgym.no', firstName: 'Sara', lastName: 'Medlem', role: UserRole.CUSTOMER },
    ];

    for (const userData of tenant2Users) {
      const existing = await prisma.user.findFirst({
        where: {
          tenantId: tenant2.id,
          username: userData.username
        }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            ...userData,
            tenantId: tenant2.id,
            password: hashedPassword,
            active: true,
            emailVerified: true
          }
        });
        console.log(`  ✓ ${userData.role}: ${userData.username}`);
      }
    }

    console.log('\n=================================================================');
    console.log('SEED COMPLETED SUCCESSFULLY!');
    console.log('=================================================================');
    console.log('\n🏢 TENANT 1: Premium Gym (premium-gym)');
    console.log('   ✅ Nettbutikk: AKTIVERT');
    console.log('   ✅ Regnskap: AKTIVERT');
    console.log('   ---------------------------------');
    console.log('   👑 Admin 1:   admin1    / password123');
    console.log('   👑 Admin 2:   admin2    / password123');
    console.log('   💪 Trainer 1: trainer1  / password123');
    console.log('   💪 Trainer 2: trainer2  / password123');
    console.log('   👤 Kunde 1:   kunde1    / password123');
    console.log('   👤 Kunde 2:   kunde2    / password123');

    console.log('\n🏢 TENANT 2: Basic Gym (basic-gym)');
    console.log('   ❌ Nettbutikk: DEAKTIVERT');
    console.log('   ❌ Regnskap: DEAKTIVERT');
    console.log('   ---------------------------------');
    console.log('   👑 Admin 1:   basic_admin1   / password123');
    console.log('   👑 Admin 2:   basic_admin2   / password123');
    console.log('   💪 Trainer 1: basic_trainer1 / password123');
    console.log('   💪 Trainer 2: basic_trainer2 / password123');
    console.log('   👤 Kunde 1:   basic_kunde1   / password123');
    console.log('   👤 Kunde 2:   basic_kunde2   / password123');
    console.log('\n=================================================================\n');

  } catch (error) {
    console.error('Error seeding tenants and users:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTenantAndUsers()
    .then(() => {
      console.log('Seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed process failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
