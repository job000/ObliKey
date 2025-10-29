import { PrismaClient, FeatureCategory, SubscriptionInterval } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFeatures() {
  console.log('Starting feature seeding...');

  // Create core features
  const features = [
    {
      name: 'E-commerce / Butikk',
      key: 'shop',
      description: 'Online butikk for salg av produkter og tjenester',
      category: FeatureCategory.ECOMMERCE,
      active: true,
    },
    {
      name: 'Treningsøkter / PT-økter',
      key: 'classes',
      description: 'Booking og administrasjon av PT-økter og gruppetimer',
      category: FeatureCategory.PERSONAL_TRAINING,
      active: true,
    },
    {
      name: 'Regnskap',
      key: 'accounting',
      description: 'Regnskapsmodul for økonomistyring',
      category: FeatureCategory.ACCOUNTING,
      active: true,
    },
    {
      name: 'Dørsystem',
      key: 'doorAccess',
      description: 'Tilgangskontroll og dørlåsstyring',
      category: FeatureCategory.DOOR_ACCESS,
      active: true,
    },
    {
      name: 'Chat',
      key: 'chat',
      description: 'Intern chat mellom medlemmer og ansatte',
      category: FeatureCategory.CHAT,
      active: true,
    },
    {
      name: 'Landing Page',
      key: 'landingPage',
      description: 'Offentlig landingsside for markedsføring',
      category: FeatureCategory.LANDING_PAGE,
      active: true,
    },
    {
      name: 'Medlemskap',
      key: 'membership',
      description: 'Medlemskapsadministrasjon og -planer',
      category: FeatureCategory.MEMBERSHIP,
      active: true,
    },
  ];

  for (const feature of features) {
    const existing = await prisma.feature.findUnique({
      where: { key: feature.key },
    });

    if (existing) {
      console.log(`Feature ${feature.key} already exists, skipping...`);
      continue;
    }

    const created = await prisma.feature.create({
      data: feature,
    });

    console.log(`✓ Created feature: ${created.name} (${created.key})`);
  }

  // Create a basic feature pack
  const basicPackFeatures = await prisma.feature.findMany({
    where: {
      key: {
        in: ['membership', 'classes', 'chat', 'doorAccess'],
      },
    },
  });

  if (basicPackFeatures.length > 0) {
    const basicPack = await prisma.featurePack.upsert({
      where: { slug: 'basic-plan' },
      update: {},
      create: {
        name: 'Basic Plan',
        slug: 'basic-plan',
        description: 'Grunnleggende funksjoner for treningssentre',
        price: 990,
        currency: 'NOK',
        interval: SubscriptionInterval.MONTHLY,
        active: true,
      },
    });

    console.log(`✓ Created/Updated feature pack: ${basicPack.name}`);

    // Link features to pack
    for (const feature of basicPackFeatures) {
      await prisma.featurePackItem.upsert({
        where: {
          packId_featureId: {
            packId: basicPack.id,
            featureId: feature.id,
          },
        },
        update: {},
        create: {
          packId: basicPack.id,
          featureId: feature.id,
        },
      });
    }

    console.log(`✓ Linked ${basicPackFeatures.length} features to Basic Plan`);
  }

  // Create premium pack
  const premiumPackFeatures = await prisma.feature.findMany({
    where: {
      active: true,
    },
  });

  if (premiumPackFeatures.length > 0) {
    const premiumPack = await prisma.featurePack.upsert({
      where: { slug: 'premium-plan' },
      update: {},
      create: {
        name: 'Premium Plan',
        slug: 'premium-plan',
        description: 'Alle funksjoner inkludert',
        price: 1990,
        currency: 'NOK',
        interval: SubscriptionInterval.MONTHLY,
        active: true,
      },
    });

    console.log(`✓ Created/Updated feature pack: ${premiumPack.name}`);

    // Link all features to premium pack
    for (const feature of premiumPackFeatures) {
      await prisma.featurePackItem.upsert({
        where: {
          packId_featureId: {
            packId: premiumPack.id,
            featureId: feature.id,
          },
        },
        update: {},
        create: {
          packId: premiumPack.id,
          featureId: feature.id,
        },
      });
    }

    console.log(`✓ Linked ${premiumPackFeatures.length} features to Premium Plan`);
  }

  console.log('\n✅ Feature seeding completed!');
}

seedFeatures()
  .catch((e) => {
    console.error('Error seeding features:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
