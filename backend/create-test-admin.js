const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    // First, find a tenant
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.error('No tenant found!');
      process.exit(1);
    }

    console.log(`Using tenant: ${tenant.name} (${tenant.id})`);

    // Check if test admin exists
    const existing = await prisma.user.findFirst({
      where: {
        email: 'testadmin@test.no',
        tenantId: tenant.id
      }
    });

    if (existing) {
      console.log('Test admin already exists');
      console.log('Email: testadmin@test.no');
      console.log('Password: TestAdmin123!');
      process.exit(0);
    }

    // Create test admin
    const hashedPassword = await bcrypt.hash('TestAdmin123!', 10);

    const user = await prisma.user.create({
      data: {
        email: 'testadmin@test.no',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        username: 'testadmin',
        tenantId: tenant.id,
        active: true
      }
    });

    console.log('✅ Test admin created successfully!');
    console.log('Email: testadmin@test.no');
    console.log('Password: TestAdmin123!');
    console.log('User ID:', user.id);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
