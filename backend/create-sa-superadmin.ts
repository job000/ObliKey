import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('Creating SUPER_ADMIN user: sa@otico.no');

    // Get first tenant
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'sa@otico.no' }
    });

    if (existingUser) {
      console.log('✅ User sa@otico.no already exists');
      console.log('ID:', existingUser.id);
      console.log('Role:', existingUser.role);

      // Update to SUPER_ADMIN if not already
      if (existingUser.role !== 'SUPER_ADMIN') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'SUPER_ADMIN' }
        });
        console.log('✅ Updated role to SUPER_ADMIN');
      }

      return;
    }

    // Hash password
    const password = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'sa@otico.no',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        username: 'superadmin',
        role: 'SUPER_ADMIN',
        active: true,
        emailVerified: true
      }
    });

    console.log('✅ SUPER_ADMIN user created successfully!');
    console.log('');
    console.log('=================================');
    console.log('Login Credentials:');
    console.log('=================================');
    console.log('Email:    sa@otico.no');
    console.log('Password: SuperAdmin123!');
    console.log('Role:     SUPER_ADMIN');
    console.log('=================================');
    console.log('');
    console.log('User ID:', user.id);

  } catch (error) {
    console.error('❌ Error creating SUPER_ADMIN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
