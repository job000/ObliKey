// Script to add footer content to existing tenants
// Run with: node add-footer-content.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const footerContent = [
  {
    section: 'FOOTER',
    title: 'Om Oss',
    content: 'Norges ledende plattform for treningssentre og PT-virksomheter.',
    sortOrder: 0,
    active: true
  },
  {
    section: 'FOOTER',
    title: 'Kontakt',
    metadata: {
      phone: '+47 123 45 678',
      email: 'kontakt@oblikey.no',
      address: 'Oslo, Norge'
    },
    sortOrder: 1,
    active: true
  },
  {
    section: 'FOOTER',
    title: 'Lenker',
    subtitle: 'Om Oss',
    buttonUrl: '/about',
    sortOrder: 2,
    active: true
  },
  {
    section: 'FOOTER',
    subtitle: 'Priser',
    buttonUrl: '/pricing',
    sortOrder: 3,
    active: true
  },
  {
    section: 'FOOTER',
    subtitle: 'Kontakt',
    buttonUrl: '/contact',
    sortOrder: 4,
    active: true
  },
  {
    section: 'FOOTER',
    subtitle: 'Personvern',
    buttonUrl: '/privacy',
    sortOrder: 5,
    active: true
  }
];

async function main() {
  console.log('Starting to add footer content to all tenants...');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });

  console.log(`Found ${tenants.length} tenants`);

  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`);

    // Check if this tenant already has footer content
    const existingFooter = await prisma.landingPageContent.count({
      where: {
        tenantId: tenant.id,
        section: 'FOOTER'
      }
    });

    if (existingFooter > 0) {
      console.log(`  ⚠️  Tenant already has ${existingFooter} footer items, skipping...`);
      continue;
    }

    // Add footer content
    await prisma.landingPageContent.createMany({
      data: footerContent.map(item => ({
        tenantId: tenant.id,
        ...item
      }))
    });

    console.log(`  ✅ Added ${footerContent.length} footer items`);
  }

  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
