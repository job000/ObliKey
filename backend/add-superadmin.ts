import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addSuperAdmin() {
  console.log('🔐 Adding SUPER_ADMIN user to existing database...');

  try {
    // Find the existing otico-demo tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'otico-demo' }
    });

    if (!tenant) {
      console.error('❌ Error: otico-demo tenant not found!');
      console.log('Please run seed-railway.ts first to create the tenant.');
      process.exit(1);
    }

    console.log(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Check if SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'superadmin@otico.com'
        }
      }
    });

    if (existingSuperAdmin) {
      console.log('ℹ️  SUPER_ADMIN user already exists. Skipping...');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
      return;
    }

    // Create SUPER_ADMIN user
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

    console.log('✅ SUPER_ADMIN user created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 SUPER_ADMIN (Global Access):');
    console.log('  Email: superadmin@otico.com');
    console.log('  Password: SuperAdmin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Error adding SUPER_ADMIN:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSuperAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
