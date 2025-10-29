import { PrismaClient, UserRole, ProductType, ProductStatus, MembershipStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Norwegian names for realistic test data
const norwegianFirstNames = [
  'Ole', 'Kari', 'Per', 'Ingrid', 'Lars', 'Marit', 'Jan', 'Anne', 'Bjørn', 'Liv',
  'Erik', 'Solveig', 'Magnus', 'Hilde', 'Andreas', 'Silje', 'Thomas', 'Nina', 'Henrik', 'Emma'
];

const norwegianLastNames = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen',
  'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen',
  'Johannessen', 'Andreassen', 'Jacobsen', 'Dahl'
];

// PT specialties
const ptSpecialties = [
  'Styrketrening og bodybuilding',
  'Funksjonell trening og CrossFit',
  'Yoga og fleksibilitet',
  'Vektreduksjon og kosthold',
  'Rehabilitering og skadeforebygging'
];

const ptBios = [
  'Erfaren personlig trener med fokus på styrketrening og muskelvekst. Jeg hjelper deg med å nå dine mål!',
  'CrossFit Level 2 sertifisert. Spesialist på funksjonell trening og kondisjon. La oss bli sterkere sammen!',
  'Yogainstruktør og bevegelsestrener. Jeg fokuserer på mobilitet, fleksibilitet og balanse.',
  'Ernæringsveileder og PT. Jeg hjelper deg med både trening og kosthold for optimal vektreduksjon.',
  'Fysioterapeut og personlig trener. Spesialisert på rehabilitering og trygg treningsprogresjon.'
];

async function seedTestData() {
  try {
    console.log('🌱 Starting comprehensive test data seeding for oblikey-demo...\n');

    // ========================================
    // 1. GET OR CREATE TENANT
    // ========================================
    let tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'oblikey-demo' }
    });

    if (!tenant) {
      console.log('Creating oblikey-demo tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'ObliKey Demo Gym',
          subdomain: 'oblikey-demo',
          email: 'post@oblikey-demo.no',
          phone: '+47 123 45 678',
          address: 'Demogate 1, 0001 Oslo',
          active: true
        }
      });
      console.log('✅ Tenant created\n');
    } else {
      console.log('✅ Tenant already exists\n');
    }

    // Enable all modules
    await prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        accountingEnabled: true,
        ecommerceEnabled: true,
        classesEnabled: true,
        chatEnabled: true,
        landingPageEnabled: true,
        membershipEnabled: true,
        doorAccessEnabled: true,
        currency: 'NOK',
        timezone: 'Europe/Oslo'
      },
      create: {
        tenantId: tenant.id,
        accountingEnabled: true,
        ecommerceEnabled: true,
        classesEnabled: true,
        chatEnabled: true,
        landingPageEnabled: true,
        membershipEnabled: true,
        doorAccessEnabled: true,
        currency: 'NOK',
        timezone: 'Europe/Oslo'
      }
    });

    console.log('✅ All modules enabled for oblikey-demo\n');

    // ========================================
    // 2. CREATE TEST PERSONAL TRAINERS
    // ========================================
    console.log('Creating Personal Trainers...');

    const hashedPassword = await bcrypt.hash('password123', 10);
    const trainers = [];
    const trainerCredentials = [];

    for (let i = 0; i < 5; i++) {
      const firstName = norwegianFirstNames[i];
      const lastName = norwegianLastNames[i];
      const username = `trainer${i + 1}`;
      const email = `${username}@oblikey-demo.no`;

      const existingTrainer = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: email
        }
      });

      if (!existingTrainer) {
        const trainer = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: email,
            username: username,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            phone: `+47 9${Math.floor(10000000 + Math.random() * 90000000)}`,
            role: UserRole.TRAINER,
            active: true,
            emailVerified: true,
            dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          }
        });
        trainers.push(trainer);
        trainerCredentials.push({
          name: `${firstName} ${lastName}`,
          email: email,
          username: username,
          password: 'password123',
          role: 'TRAINER',
          specialty: ptSpecialties[i],
          bio: ptBios[i]
        });
        console.log(`  ✅ Created: ${firstName} ${lastName} (${username})`);
      } else {
        trainers.push(existingTrainer);
        trainerCredentials.push({
          name: `${firstName} ${lastName}`,
          email: email,
          username: username,
          password: 'password123',
          role: 'TRAINER',
          specialty: ptSpecialties[i],
          bio: ptBios[i]
        });
        console.log(`  ℹ️  Already exists: ${firstName} ${lastName} (${username})`);
      }
    }

    console.log(`\n✅ Trainers ready: ${trainers.length}\n`);

    // ========================================
    // 3. CREATE TEST MEMBERS/CUSTOMERS
    // ========================================
    console.log('Creating Test Members...');

    const customers = [];
    const customerCredentials = [];
    const membershipStatuses: MembershipStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRED', 'EXPIRED', 'CANCELLED', 'FROZEN'];

    for (let i = 0; i < 15; i++) {
      const firstName = norwegianFirstNames[i % norwegianFirstNames.length];
      const lastName = norwegianLastNames[Math.floor(Math.random() * norwegianLastNames.length)];
      const username = `kunde${i + 1}`;
      const email = `${username}@oblikey-demo.no`;

      const existingCustomer = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: email
        }
      });

      if (!existingCustomer) {
        const customer = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: email,
            username: username,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            phone: `+47 4${Math.floor(10000000 + Math.random() * 90000000)}`,
            role: UserRole.CUSTOMER,
            active: true,
            emailVerified: true,
            dateOfBirth: new Date(1975 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          }
        });
        customers.push(customer);
        customerCredentials.push({
          name: `${firstName} ${lastName}`,
          email: email,
          username: username,
          password: 'password123',
          role: 'CUSTOMER',
          membershipStatus: membershipStatuses[i % membershipStatuses.length]
        });
        console.log(`  ✅ Created: ${firstName} ${lastName} (${username}) - ${membershipStatuses[i % membershipStatuses.length]}`);
      } else {
        customers.push(existingCustomer);
        customerCredentials.push({
          name: `${firstName} ${lastName}`,
          email: email,
          username: username,
          password: 'password123',
          role: 'CUSTOMER',
          membershipStatus: membershipStatuses[i % membershipStatuses.length]
        });
        console.log(`  ℹ️  Already exists: ${firstName} ${lastName} (${username})`);
      }
    }

    console.log(`\n✅ Customers ready: ${customers.length}\n`);

    // ========================================
    // 4. CREATE PRODUCTS
    // ========================================
    console.log('Creating Products...');

    const productsData = [
      // MEMBERSHIP PACKAGES
      {
        name: 'Basis Medlemskap',
        description: 'Perfekt for å komme i gang med trening. Tilgang til alle treningsområder og garderobe.',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 399,
        currency: 'NOK',
        sku: 'MEM-BASIC',
        slug: 'basis-medlemskap',
        featured: true,
        sortOrder: 1,
        validityDays: 30,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
      },
      {
        name: 'Premium Medlemskap',
        description: 'Alt i Basis + tilgang til alle gruppetimer, sauna og PT-konsultasjon.',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 599,
        compareAtPrice: 699,
        currency: 'NOK',
        sku: 'MEM-PREMIUM',
        slug: 'premium-medlemskap',
        featured: true,
        sortOrder: 2,
        validityDays: 30,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80'
      },
      {
        name: 'VIP Medlemskap',
        description: 'Eksklusivt medlemskap med prioritert booking, personlig treningsprogram og gjestepass.',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 899,
        compareAtPrice: 1099,
        currency: 'NOK',
        sku: 'MEM-VIP',
        slug: 'vip-medlemskap',
        featured: true,
        sortOrder: 3,
        validityDays: 30,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
      },
      {
        name: 'Årskort Premium',
        description: 'Spar penger med årlig binding. Premium-tilgang hele året!',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 5990,
        compareAtPrice: 7188,
        currency: 'NOK',
        sku: 'MEM-YEAR',
        slug: 'aarskort-premium',
        featured: true,
        sortOrder: 4,
        validityDays: 365,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80'
      },

      // PERSONAL TRAINING SESSIONS
      {
        name: 'PT Intro - 1 time',
        description: 'Prøv personlig trening! En time med erfaren PT for å komme i gang.',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 499,
        currency: 'NOK',
        sku: 'PT-INTRO',
        slug: 'pt-intro-1-time',
        sessionCount: 1,
        validityDays: 30,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
      },
      {
        name: 'PT Pakke - 5 timer',
        description: '5 personlige treningstimer med din valgte PT. Fleksible tidspunkt.',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 2495,
        compareAtPrice: 2995,
        currency: 'NOK',
        sku: 'PT-5',
        slug: 'pt-pakke-5-timer',
        featured: true,
        sessionCount: 5,
        validityDays: 90,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
      },
      {
        name: 'PT Pakke - 10 timer',
        description: '10 personlige treningstimer. Best value! Spar over 1000 kr.',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 4495,
        compareAtPrice: 5990,
        currency: 'NOK',
        sku: 'PT-10',
        slug: 'pt-pakke-10-timer',
        featured: true,
        sessionCount: 10,
        validityDays: 120,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'
      },

      // GROUP CLASSES
      {
        name: 'Gruppetime Klippekort - 10 stk',
        description: 'Klippekort for 10 gruppetimer. Gyldig i 6 måneder.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 899,
        compareAtPrice: 1200,
        currency: 'NOK',
        sku: 'CLASS-10',
        slug: 'gruppetime-klippekort-10',
        stock: 100,
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80'
      },

      // PHYSICAL PRODUCTS - Equipment
      {
        name: 'Treningshansker Premium',
        description: 'Komfortable treningshansker i ekte lær. Perfekt grep og pustende materiale.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 349,
        currency: 'NOK',
        sku: 'GLOVE-PREMIUM',
        stock: 45,
        trackInventory: true,
        slug: 'treningshansker-premium',
        imageUrl: 'https://images.unsplash.com/photo-1607627000458-210e8d2bdb1d?w=800&q=80'
      },
      {
        name: 'Yoga Matte Pro',
        description: '6mm yogamatte med anti-skli overflate. Inkluderer bæreveske.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        compareAtPrice: 599,
        currency: 'NOK',
        sku: 'YOGA-PRO',
        stock: 30,
        trackInventory: true,
        slug: 'yoga-matte-pro',
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80'
      },
      {
        name: 'Treningselastikk Sett',
        description: '5 elastikker i ulike motstandsnivåer. Perfekt for hjemmetrening og rehab.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 299,
        currency: 'NOK',
        sku: 'BAND-SET',
        stock: 60,
        trackInventory: true,
        slug: 'treningselastikk-sett',
        imageUrl: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80'
      },
      {
        name: 'Kettlebell 16kg',
        description: 'Profesjonell kettlebell i støpejern. Ergonomisk håndtak.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 599,
        compareAtPrice: 799,
        currency: 'NOK',
        sku: 'KB-16',
        stock: 20,
        trackInventory: true,
        slug: 'kettlebell-16kg',
        imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80'
      },
      {
        name: 'Skippetau Speed',
        description: 'Justerbart skippetau med kulelager. Perfekt for cardio og HIIT.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 199,
        currency: 'NOK',
        sku: 'ROPE-SPEED',
        stock: 50,
        trackInventory: true,
        slug: 'skippetau-speed',
        imageUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&q=80'
      },
      {
        name: 'Foam Roller',
        description: 'Massasjerulle 33cm for optimal restitusjon. Medium hardhet.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 249,
        currency: 'NOK',
        sku: 'FOAM-33',
        stock: 35,
        trackInventory: true,
        slug: 'foam-roller-33cm',
        imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80'
      },

      // SUPPLEMENTS
      {
        name: 'Proteinpulver Vanilje 1kg',
        description: 'Premium whey protein. 80% protein, 25g per porsjon. Laktosefri.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        currency: 'NOK',
        sku: 'PROT-VAN',
        stock: 75,
        trackInventory: true,
        slug: 'proteinpulver-vanilje-1kg',
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1579722820308-d746b37c292b?w=800&q=80'
      },
      {
        name: 'Proteinpulver Sjokolade 1kg',
        description: 'Premium whey protein med sjokoladesmak. 80% protein.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        currency: 'NOK',
        sku: 'PROT-CHOC',
        stock: 80,
        trackInventory: true,
        slug: 'proteinpulver-sjokolade-1kg',
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1622484211331-c45935a1cfb5?w=800&q=80'
      },
      {
        name: 'BCAA Energi 400g',
        description: 'BCAA med elektrolytter. Perfekt under og etter trening.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 299,
        currency: 'NOK',
        sku: 'BCAA-400',
        stock: 55,
        trackInventory: true,
        slug: 'bcaa-energi-400g',
        imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80'
      },
      {
        name: 'Creatine Monohydrate 500g',
        description: 'Ren kreatin monohydrat. 5g per porsjon.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 249,
        currency: 'NOK',
        sku: 'CREAT-500',
        stock: 40,
        trackInventory: true,
        slug: 'creatine-monohydrate-500g',
        imageUrl: 'https://images.unsplash.com/photo-1579722820308-d746b37c292b?w=800&q=80'
      },
      {
        name: 'Pre-Workout Boost',
        description: 'Energigivende pre-workout med koffein og beta-alanin.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 349,
        currency: 'NOK',
        sku: 'PRE-BOOST',
        stock: 45,
        trackInventory: true,
        slug: 'pre-workout-boost',
        imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80'
      },

      // DIGITAL PRODUCTS
      {
        name: '12-ukers Styrkeprogram',
        description: 'Komplett styrkeprogram med progressjon. Inkluderer videoer og øvelsesguide.',
        type: ProductType.DIGITAL,
        status: ProductStatus.PUBLISHED,
        price: 799,
        compareAtPrice: 999,
        currency: 'NOK',
        sku: 'PROG-STR-12',
        slug: '12-ukers-styrkeprogram',
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
      },
      {
        name: 'Kostholdsplan Vektreduksjon',
        description: '8-ukers kostholdsplan med oppskrifter og handleslister.',
        type: ProductType.DIGITAL,
        status: ProductStatus.PUBLISHED,
        price: 499,
        currency: 'NOK',
        sku: 'DIET-LOSS',
        slug: 'kostholdsplan-vektreduksjon',
        trackInventory: false,
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80'
      }
    ];

    const createdProducts = [];
    for (const productData of productsData) {
      const existing = await prisma.product.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { slug: productData.slug },
            { sku: productData.sku }
          ]
        }
      });

      if (!existing) {
        try {
          const { imageUrl, ...productDataWithoutImage } = productData;
          const product = await prisma.product.create({
            data: {
              ...productDataWithoutImage,
              tenantId: tenant.id
            }
          });

          // Add product image
          if (imageUrl) {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                url: imageUrl,
                altText: product.name,
                sortOrder: 0,
                isPrimary: true
              }
            });
          }

          createdProducts.push(product);
          console.log(`  ✅ Created: ${product.name} (${product.price} NOK)`);
        } catch (error: any) {
          // SKU might be taken by another tenant, skip it
          if (error.code === 'P2002') {
            console.log(`  ⚠️  SKU already exists globally: ${productData.name} (${productData.sku})`);
          } else {
            throw error;
          }
        }
      } else {
        createdProducts.push(existing);
        console.log(`  ℹ️  Already exists: ${productData.name}`);
      }
    }

    console.log(`\n✅ Products ready: ${createdProducts.length}\n`);

    // ========================================
    // 5. PRINT CREDENTIALS SUMMARY
    // ========================================
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 TEST DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📊 SUMMARY:');
    console.log(`   Tenant: ${tenant.name} (${tenant.subdomain})`);
    console.log(`   Personal Trainers: ${trainers.length}`);
    console.log(`   Members/Customers: ${customers.length}`);
    console.log(`   Products: ${createdProducts.length}`);
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔑 TEST CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n💪 PERSONAL TRAINERS:');
    console.log('─────────────────────────────────────────────────────────────');

    trainerCredentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. ${cred.name}`);
      console.log(`   Email:    ${cred.email}`);
      console.log(`   Username: ${cred.username}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   Specialty: ${cred.specialty}`);
    });

    console.log('\n\n👥 MEMBERS/CUSTOMERS:');
    console.log('─────────────────────────────────────────────────────────────');

    customerCredentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. ${cred.name}`);
      console.log(`   Email:    ${cred.email}`);
      console.log(`   Username: ${cred.username}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   Status:   ${cred.membershipStatus}`);
    });

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📝 PRODUCT CATEGORIES:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n🏋️  Membership Packages (4 products)');
    console.log('   - Basis Medlemskap (399 NOK/month)');
    console.log('   - Premium Medlemskap (599 NOK/month)');
    console.log('   - VIP Medlemskap (899 NOK/month)');
    console.log('   - Årskort Premium (5990 NOK/year)');

    console.log('\n💪 Personal Training (3 packages)');
    console.log('   - PT Intro - 1 time (499 NOK)');
    console.log('   - PT Pakke - 5 timer (2495 NOK)');
    console.log('   - PT Pakke - 10 timer (4495 NOK)');

    console.log('\n🏃 Group Classes');
    console.log('   - Gruppetime Klippekort - 10 stk (899 NOK)');

    console.log('\n🎽 Training Equipment (6 products)');
    console.log('   - Treningshansker, Yoga Matte, Elastikk Sett');
    console.log('   - Kettlebell, Skippetau, Foam Roller');

    console.log('\n💊 Supplements (5 products)');
    console.log('   - Protein (Vanilje & Sjokolade)');
    console.log('   - BCAA, Creatine, Pre-Workout');

    console.log('\n📱 Digital Products (2 products)');
    console.log('   - 12-ukers Styrkeprogram (799 NOK)');
    console.log('   - Kostholdsplan Vektreduksjon (499 NOK)');

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('🚀 QUICK START INSTRUCTIONS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n1. Login as a trainer to create PT sessions');
    console.log('2. Login as a member to book sessions and purchase products');
    console.log('3. All passwords are: password123');
    console.log('4. Tenant subdomain: oblikey-demo');
    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('✅ Seed process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed process failed:', error);
      process.exit(1);
    });
}

export { seedTestData };
