const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateSuperAdminPassword() {
  try {
    // Find the superadmin user
    const superAdmin = await prisma.user.findFirst({
      where: {
        email: 'superadmin@otico.no',
        role: 'SUPER_ADMIN',
      },
    });

    if (!superAdmin) {
      console.error('❌ SUPER_ADMIN user not found');
      process.exit(1);
    }

    // Simple password without special characters
    const newPassword = 'SuperAdmin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: hashedPassword },
    });

    console.log('\n✅ SUPER_ADMIN password updated successfully:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log('\n🚀 You can now login with the new password.\n');
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuperAdminPassword();
