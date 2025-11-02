const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const password = 'Admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: 'otico-demo' }
  });
  
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }
  
  // Check if test admin exists
  const existing = await prisma.user.findFirst({
    where: { 
      email: 'testadmin@otico.no',
      tenantId: tenant.id
    }
  });
  
  if (existing) {
    // Update password
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashedPassword }
    });
    console.log('Updated testadmin@otico.no password to: Admin123');
  } else {
    // Create new admin
    const admin = await prisma.user.create({
      data: {
        email: 'testadmin@otico.no',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        tenantId: tenant.id,
        active: true
      }
    });
    console.log('Created testadmin@otico.no with password: Admin123');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
