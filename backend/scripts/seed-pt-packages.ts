import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPTPackages() {
  try {
    console.log('🏋️ Seeding PT packages...');

    // Get ObliKey Demo tenant
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain: 'oblikey-demo' }
    });

    if (!tenant) {
      throw new Error('ObliKey Demo tenant not found');
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

    // PT Package products to create
    const ptPackages = [
      {
        name: '5 PT-timer',
        description: 'Perfekt for å komme i gang! Inkluderer 5 personlige treningstimer med erfaren PT.',
        price: 2500,
        sessionCount: 5,
        validityDays: 90, // 3 months
        slug: '5-pt-timer',
        sortOrder: 1,
      },
      {
        name: '10 PT-timer',
        description: 'Mest populært! 10 personlige treningstimer med erfaren PT. Spar 10% sammenlignet med enkelt-timer.',
        price: 4500,
        compareAtPrice: 5000,
        sessionCount: 10,
        validityDays: 180, // 6 months
        slug: '10-pt-timer',
        featured: true,
        sortOrder: 2,
      },
      {
        name: '20 PT-timer',
        description: 'For den seriøse! 20 personlige treningstimer med erfaren PT. Spar 20%!',
        price: 8000,
        compareAtPrice: 10000,
        sessionCount: 20,
        validityDays: 365, // 1 year
        slug: '20-pt-timer',
        sortOrder: 3,
      }
    ];

    for (const pkg of ptPackages) {
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: {
          tenantId: tenant.id,
          slug: pkg.slug
        }
      });

      if (existing) {
        console.log(`⚠️  Product already exists: ${pkg.name}`);
        // Update instead
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...pkg,
            type: 'PT_SERVICE',
            status: 'PUBLISHED',
            currency: 'NOK',
            trackInventory: false,
            updatedAt: new Date(),
          }
        });
        console.log(`✅ Updated: ${pkg.name}`);
      } else {
        // Create new product
        await prisma.product.create({
          data: {
            ...pkg,
            tenantId: tenant.id,
            type: 'PT_SERVICE',
            status: 'PUBLISHED',
            currency: 'NOK',
            trackInventory: false,
          }
        });
        console.log(`✅ Created: ${pkg.name}`);
      }
    }

    console.log('✅ PT packages seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding PT packages:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPTPackages();
