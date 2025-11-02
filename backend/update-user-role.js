const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserToAdmin() {
  try {
    // Find the most recently created user in otico-demo tenant
    const user = await prisma.user.findFirst({
      where: { tenantId: 'otico-demo' },
      orderBy: { createdAt: 'desc' }
    });

    if (!user) {
      console.log('Ingen bruker funnet i otico-demo tenant');
      return;
    }

    console.log(`Fant bruker: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Nåværende rolle: ${user.role}`);

    // Update to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Oppdatert til rolle: ${updatedUser.role}`);
    console.log('\nDu kan nå gå til http://localhost:5173/admin for å se admin-siden!');
  } catch (error) {
    console.error('Feil:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserToAdmin();
