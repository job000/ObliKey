const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    // Get the first tenant (or you can specify a specific one)
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.error('No tenants found. Please create a tenant first.');
      process.exit(1);
    }

    console.log(`Using tenant: ${tenant.name} (${tenant.subdomain})`);

    // Check if superadmin already exists
    const existing = await prisma.user.findFirst({
      where: {
        email: 'superadmin@otico.no',
        tenantId: tenant.id,
      },
    });

    if (existing) {
      // Update existing user to SUPER_ADMIN
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'SUPER_ADMIN' },
      });
      console.log('\n✅ Updated existing user to SUPER_ADMIN:');
      console.log(`   Email: ${updated.email}`);
      console.log(`   Role: ${updated.role}`);
      console.log(`   Password: SuperAdmin123!`);
      console.log(`   Tenant: ${tenant.name} (${tenant.subdomain})`);
    } else {
      // Create new SUPER_ADMIN user
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);

      const superAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@otico.no',
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          tenantId: tenant.id,
        },
      });

      console.log('\n✅ SUPER_ADMIN user created successfully:');
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Password: SuperAdmin123!`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   Tenant: ${tenant.name} (${tenant.subdomain})`);
    }

    console.log('\n🚀 You can now login with these credentials to access the Super Admin Portal.\n');
  } catch (error) {
    console.error('Error creating SUPER_ADMIN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
