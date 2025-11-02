import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedRailwayDatabase() {
  console.log('🌱 Seeding Railway database...');

  try {
    // 1. Create demo tenant
    console.log('Creating demo tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Otico Demo',
        subdomain: 'otico-demo',
        email: 'demo@otico.com',
        phone: '+47 123 45 678',
        address: 'Demo Street 123, Oslo',
        active: true,
      },
    });
    console.log('✅ Tenant created:', tenant.subdomain);

    // 2. Create tenant settings
    console.log('Creating tenant settings...');
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        businessHoursStart: '06:00',
        businessHoursEnd: '22:00',
        bookingCancellation: 24,
        maxBookingsPerUser: 10,
        requirePayment: false,
        currency: 'NOK',
        timezone: 'Europe/Oslo',
        emailNotifications: true,
        smsNotifications: false,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accountingEnabled: true,
        classesEnabled: true,
        chatEnabled: true,
        landingPageEnabled: false,
        ecommerceEnabled: true,
        membershipEnabled: true,
        doorAccessEnabled: false,
      },
    });
    console.log('✅ Tenant settings created');

    // 3. Create SUPER_ADMIN user (global admin across all tenants)
    console.log('Creating SUPER_ADMIN user...');
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
    const superAdminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'superadmin@otico.com',
        password: superAdminPassword,
        firstName: 'Super',
        lastName: 'Admin',
        username: 'superadmin',
        role: 'SUPER_ADMIN',
        active: true,
        emailVerified: true,
      },
    });
    console.log('✅ SUPER_ADMIN user created:', superAdminUser.email);

    // 4. Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@otico.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        role: 'ADMIN',
        active: true,
        emailVerified: true,
      },
    });
    console.log('✅ Admin user created:', adminUser.email);

    // 5. Create a test customer
    console.log('Creating test customer...');
    const customerPassword = await bcrypt.hash('Customer123!', 10);
    const customerUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'kunde@otico.com',
        password: customerPassword,
        firstName: 'Test',
        lastName: 'Kunde',
        username: 'testkunde',
        role: 'CUSTOMER',
        active: true,
        emailVerified: true,
      },
    });
    console.log('✅ Customer user created:', customerUser.email);

    // 6. Create a trainer
    console.log('Creating trainer...');
    const trainerPassword = await bcrypt.hash('Trainer123!', 10);
    const trainerUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'trainer@otico.com',
        password: trainerPassword,
        firstName: 'Personal',
        lastName: 'Trainer',
        username: 'pttrainer',
        role: 'TRAINER',
        active: true,
        emailVerified: true,
      },
    });
    console.log('✅ Trainer user created:', trainerUser.email);

    console.log('\n🎉 Database seeding completed!');
    console.log('\n📝 Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Tenant: otico-demo');
    console.log('\n🔐 SUPER_ADMIN (Global Access):');
    console.log('  Email: superadmin@otico.com');
    console.log('  Password: SuperAdmin123!');
    console.log('\n👨‍💼 Admin:');
    console.log('  Email: admin@otico.com');
    console.log('  Password: Admin123!');
    console.log('\n👤 Customer:');
    console.log('  Email: kunde@otico.com');
    console.log('  Password: Customer123!');
    console.log('\n🏋️ Trainer:');
    console.log('  Email: trainer@otico.com');
    console.log('  Password: Trainer123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedRailwayDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
