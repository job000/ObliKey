import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🌱 Creating test users...');

    // Get the demo tenant
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain: 'oblikey-demo' }
    });

    if (!tenant) {
      console.error('❌ Tenant not found. Please create a tenant first.');
      return;
    }

    console.log(`✅ Using tenant: ${tenant.name}`);

    const hashedPassword = await bcrypt.hash('password123', 10);

    const testUsers = [
      {
        email: 'kunde1@test.no',
        password: hashedPassword,
        firstName: 'Kunde',
        lastName: '1',
        phone: '+47 123 45 001',
        role: 'CUSTOMER' as const,
        active: true,
        emailVerified: true
      },
      {
        email: 'kunde2@test.no',
        password: hashedPassword,
        firstName: 'Kunde',
        lastName: '2',
        phone: '+47 123 45 002',
        role: 'CUSTOMER' as const,
        active: true,
        emailVerified: true
      },
      {
        email: 'admin1@test.no',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: '1',
        phone: '+47 123 45 003',
        role: 'ADMIN' as const,
        active: true,
        emailVerified: true
      },
      {
        email: 'admin2@test.no',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: '2',
        phone: '+47 123 45 004',
        role: 'ADMIN' as const,
        active: true,
        emailVerified: true
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: userData.email
        }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          ...userData,
          tenantId: tenant.id
        }
      });

      console.log(`✅ Created ${userData.role} user: ${userData.email} (password: password123)`);

      // Create membership for customer users
      if (userData.role === 'CUSTOMER') {
        // Get a random membership plan
        const plans = await prisma.membershipPlan.findMany({
          where: { tenantId: tenant.id, active: true }
        });

        if (plans.length > 0) {
          const plan = plans[Math.floor(Math.random() * plans.length)];

          const startDate = new Date();
          const nextBillingDate = new Date(startDate);
          if (plan.interval === 'MONTHLY') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          const membership = await prisma.membership.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              planId: plan.id,
              status: 'ACTIVE',
              startDate,
              nextBillingDate,
              autoRenew: true
            }
          });

          console.log(`  ✅ Created ${plan.name} membership for ${userData.email}`);

          // Create initial payment
          await prisma.membershipPayment.create({
            data: {
              tenantId: tenant.id,
              membershipId: membership.id,
              amount: plan.price,
              currency: plan.currency,
              status: 'PAID',
              dueDate: startDate,
              paidAt: startDate
            }
          });

          console.log(`  ✅ Created initial payment`);
        }
      }
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('  kunde1@test.no / password123');
    console.log('  kunde2@test.no / password123');
    console.log('  admin1@test.no / password123');
    console.log('  admin2@test.no / password123');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
