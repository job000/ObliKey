const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDummyTrainer() {
  try {
    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();
    
    if (!tenant) {
      console.log('No tenant found. Please create a tenant first.');
      await prisma.$disconnect();
      return;
    }

    console.log('Using tenant:', tenant.name, '(', tenant.id, ')');

    // Check if trainer already exists
    const existingTrainer = await prisma.user.findFirst({
      where: {
        email: 'trainer@test.com',
        tenantId: tenant.id
      }
    });

    if (existingTrainer) {
      console.log('Trainer already exists:', existingTrainer.email);
      await prisma.$disconnect();
      return;
    }

    // Create dummy PT/trainer
    const hashedPassword = await bcrypt.hash('trainer123', 10);
    
    const trainer = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'trainer@test.com',
        password: hashedPassword,
        firstName: 'Lars',
        lastName: 'Olsen',
        phone: '+47 987 65 432',
        role: 'TRAINER'
      }
    });

    console.log('✅ Dummy trainer created successfully!');
    console.log('Email:', trainer.email);
    console.log('Password: trainer123');
    console.log('Name:', trainer.firstName, trainer.lastName);
    console.log('Role:', trainer.role);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating dummy trainer:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createDummyTrainer();
