import { PrismaClient, ProductType, ProductStatus, PTSessionStatus, ClassType, BookingStatus, TransactionType, VATRate, Account } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDummyData() {
  console.log('Starting dummy data seed for Premium Gym...\n');

  try {
    // Get Premium Gym tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: 'premium-gym' },
      include: {
        users: true
      }
    });

    if (!tenant) {
      console.error('Premium Gym tenant not found. Run seedTenantAndUsers first.');
      return;
    }

    console.log(`Found tenant: ${tenant.name}\n`);

    // Get all users
    const admins = tenant.users.filter(u => u.role === 'ADMIN');
    const trainers = tenant.users.filter(u => u.role === 'TRAINER');
    const customers = tenant.users.filter(u => u.role === 'CUSTOMER');

    console.log(`Found ${admins.length} admins, ${trainers.length} trainers, ${customers.length} customers\n`);

    // ========================================
    // 1. PRODUCTS (Nettbutikk)
    // ========================================
    console.log('Creating products...');

    const productsData = [
      // Physical Products - Fitness Equipment
      {
        name: 'Kettlebell 16kg',
        description: 'Profesjonell kettlebell i støpejern. Perfekt for funksjonell trening og styrkeøvelser.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 599,
        compareAtPrice: 799,
        currency: 'NOK',
        sku: 'KB-16KG',
        stock: 25,
        trackInventory: true,
        slug: 'kettlebell-16kg',
        featured: true,
        sortOrder: 1,
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
      },
      {
        name: 'Yogamatte Premium',
        description: 'Høykvalitets yogamatte med anti-skli overflate. 6mm tykk for optimal komfort. Inkluderer bæreveske.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        currency: 'NOK',
        sku: 'YOGA-MAT-01',
        stock: 40,
        trackInventory: true,
        slug: 'yogamatte-premium',
        featured: true,
        sortOrder: 2
      },
      {
        name: 'Treningselastikk Sett',
        description: 'Komplett sett med 5 elastikker i ulike motstandsnivåer. Perfekt for hjemmetrening.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 299,
        compareAtPrice: 399,
        currency: 'NOK',
        sku: 'BAND-SET-01',
        stock: 60,
        trackInventory: true,
        slug: 'treningselastikk-sett',
        sortOrder: 3
      },
      {
        name: 'Skippetau Pro',
        description: 'Profesjonelt skippetau med justerbar lengde og kulelager for myk rotasjon.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 199,
        currency: 'NOK',
        sku: 'SKIP-01',
        stock: 35,
        trackInventory: true,
        slug: 'skippetau-pro',
        sortOrder: 4
      },
      {
        name: 'Gymhansker Læ Premium',
        description: 'Komfortable gymhansker i ekte lær med god pust­e­evne. Perfekt grep.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 349,
        currency: 'NOK',
        sku: 'GLOVE-01',
        stock: 20,
        trackInventory: true,
        slug: 'gymhansker-laer-premium',
        sortOrder: 5
      },
      {
        name: 'Foam Roller',
        description: 'Massasjerulle for optimal restitusjon. 33cm lang. Perfekt etter hard trening.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 249,
        currency: 'NOK',
        sku: 'FOAM-01',
        stock: 30,
        trackInventory: true,
        slug: 'foam-roller',
        sortOrder: 6
      },
      // Supplements
      {
        name: 'Proteinpulver Vanilje 1kg',
        description: 'Premium whey proteinpulver med vaniljesmak. 25g protein per porsjon.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        currency: 'NOK',
        sku: 'PROT-VAN-1KG',
        stock: 50,
        trackInventory: true,
        slug: 'proteinpulver-vanilje-1kg',
        featured: true,
        sortOrder: 7
      },
      {
        name: 'Proteinpulver Sjokolade 1kg',
        description: 'Premium whey proteinpulver med sjokoladesmak. 25g protein per porsjon.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 449,
        currency: 'NOK',
        sku: 'PROT-CHOC-1KG',
        stock: 45,
        trackInventory: true,
        slug: 'proteinpulver-sjokolade-1kg',
        featured: true,
        sortOrder: 8
      },
      {
        name: 'BCAA Energi',
        description: 'BCAA-tilskudd med elektrolytter for optimal restitusjon under og etter trening.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 299,
        currency: 'NOK',
        sku: 'BCAA-01',
        stock: 40,
        trackInventory: true,
        slug: 'bcaa-energi',
        sortOrder: 9
      },
      {
        name: 'Creatine Monohydrate 500g',
        description: 'Ren kreatin monohydrat for økt styrke og muskelvekst.',
        type: ProductType.PHYSICAL_PRODUCT,
        status: ProductStatus.PUBLISHED,
        price: 249,
        currency: 'NOK',
        sku: 'CREAT-500G',
        stock: 35,
        trackInventory: true,
        slug: 'creatine-monohydrate-500g',
        sortOrder: 10
      },
      // Digital Products
      {
        name: '12-ukers Styrkeprogram',
        description: 'Komplett styrketreningsprogram med progressjon over 12 uker. Inkluderer videodemonstrasjon av alle øvelser.',
        type: ProductType.DIGITAL,
        status: ProductStatus.PUBLISHED,
        price: 799,
        compareAtPrice: 999,
        currency: 'NOK',
        sku: 'PROG-STR-12W',
        trackInventory: false,
        slug: '12-ukers-styrkeprogram',
        featured: true,
        sortOrder: 11
      },
      {
        name: 'Kostholdsplan Vektreduksjon',
        description: 'Personlig tilpasset kostholdsplan for vektreduksjon. 4 ukers meny med handlesliste.',
        type: ProductType.DIGITAL,
        status: ProductStatus.PUBLISHED,
        price: 499,
        currency: 'NOK',
        sku: 'DIET-LOSS',
        trackInventory: false,
        slug: 'kostholdsplan-vektreduksjon',
        sortOrder: 12
      },
      {
        name: 'Hjemmetreningsprogram',
        description: '8-ukers treningsprogram som kan gjøres hjemme uten utstyr.',
        type: ProductType.DIGITAL,
        status: ProductStatus.PUBLISHED,
        price: 599,
        currency: 'NOK',
        sku: 'PROG-HOME-8W',
        trackInventory: false,
        slug: 'hjemmetreningsprogram',
        sortOrder: 13
      },
      // PT Services
      {
        name: 'PT-pakke 5 timer',
        description: '5 personlige treningstimer med erfaren personlig trener. Fleksible tidspunkt.',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 2995,
        compareAtPrice: 3500,
        currency: 'NOK',
        sku: 'PT-5H',
        sessionCount: 5,
        validityDays: 90,
        trackInventory: false,
        slug: 'pt-pakke-5-timer',
        featured: true,
        sortOrder: 14
      },
      {
        name: 'PT-pakke 10 timer',
        description: '10 personlige treningstimer med erfaren personlig trener. Spar 500 kr!',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 5495,
        compareAtPrice: 7000,
        currency: 'NOK',
        sku: 'PT-10H',
        sessionCount: 10,
        validityDays: 120,
        trackInventory: false,
        slug: 'pt-pakke-10-timer',
        featured: true,
        sortOrder: 15
      },
      {
        name: 'PT-pakke Intro',
        description: 'Introduksjonstime med personlig trener. Perfekt for å komme i gang!',
        type: ProductType.PT_SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 499,
        currency: 'NOK',
        sku: 'PT-INTRO',
        sessionCount: 1,
        validityDays: 30,
        trackInventory: false,
        slug: 'pt-pakke-intro',
        sortOrder: 16
      },
      // Memberships
      {
        name: 'Medlemskap Måned',
        description: 'Fullt medlemskap med tilgang til alle treninger og fasiliteter i 1 måned.',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 599,
        currency: 'NOK',
        sku: 'MEM-1M',
        validityDays: 30,
        trackInventory: false,
        slug: 'medlemskap-maaned',
        sortOrder: 17
      },
      {
        name: 'Medlemskap 3 Måneder',
        description: 'Fullt medlemskap med tilgang til alle treninger og fasiliteter i 3 måneder. Spar 10%!',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 1599,
        compareAtPrice: 1797,
        currency: 'NOK',
        sku: 'MEM-3M',
        validityDays: 90,
        trackInventory: false,
        slug: 'medlemskap-3-maaneder',
        featured: true,
        sortOrder: 18
      },
      {
        name: 'Medlemskap Årskort',
        description: 'Årlig medlemskap med tilgang til alle treninger og fasiliteter. Spar 25%!',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 5395,
        compareAtPrice: 7188,
        currency: 'NOK',
        sku: 'MEM-12M',
        validityDays: 365,
        trackInventory: false,
        slug: 'medlemskap-aarskort',
        featured: true,
        sortOrder: 19
      },
      {
        name: 'Dagskort',
        description: 'Enkeltdagspass med tilgang til alle fasiliteter.',
        type: ProductType.MEMBERSHIP,
        status: ProductStatus.PUBLISHED,
        price: 150,
        currency: 'NOK',
        sku: 'DAY-PASS',
        validityDays: 1,
        trackInventory: false,
        slug: 'dagskort',
        sortOrder: 20
      }
    ];

    const createdProducts = [];
    for (const productData of productsData) {
      const existing = await prisma.product.findFirst({
        where: {
          tenantId: tenant.id,
          slug: productData.slug
        }
      });

      if (!existing) {
        const product = await prisma.product.create({
          data: {
            ...productData,
            tenantId: tenant.id
          }
        });
        createdProducts.push(product);
        console.log(`  ✓ Created: ${product.name}`);
      }
    }

    console.log(`\n✓ Products created: ${createdProducts.length}\n`);

    // ========================================
    // 2. CLASSES (Klasser)
    // ========================================
    console.log('Creating classes...');

    const now = new Date();
    const classesData = [
      {
        name: 'Morgen Yoga',
        description: 'Start dagen med rolig yoga. Perfekt for alle nivåer.',
        type: ClassType.GROUP_CLASS,
        capacity: 20,
        duration: 60,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 7, 0),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'HIIT Workout',
        description: 'Intensiv høyintensitets intervalltrening. Brenner maks kalorier!',
        type: ClassType.GROUP_CLASS,
        capacity: 15,
        duration: 45,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 30),
        trainerId: trainers[1].id,
        published: true
      },
      {
        name: 'Spinning',
        description: 'Energisk spinningøkt med motiverende musikk.',
        type: ClassType.GROUP_CLASS,
        capacity: 25,
        duration: 50,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 18, 0),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'Styrketrening Grunnkurs',
        description: 'Lær grunnleggende styrkeøvelser med riktig teknikk.',
        type: ClassType.GROUP_CLASS,
        capacity: 12,
        duration: 60,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 19, 0),
        trainerId: trainers[1].id,
        published: true
      },
      {
        name: 'Kveldsyoga',
        description: 'Avslappende yoga for god søvn. Rolig tempo.',
        type: ClassType.GROUP_CLASS,
        capacity: 20,
        duration: 60,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 19, 30),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'CrossFit WOD',
        description: 'Dagens CrossFit Workout of the Day. Variert og utfordrende!',
        type: ClassType.GROUP_CLASS,
        capacity: 15,
        duration: 60,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 17, 0),
        trainerId: trainers[1].id,
        published: true
      },
      {
        name: 'Pilates Core',
        description: 'Styrk kjernemuskulaturen med Pilates-øvelser.',
        type: ClassType.GROUP_CLASS,
        capacity: 18,
        duration: 50,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 18, 0),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'Løpegruppe Intervall',
        description: 'Intervalltrening utendørs. Alle tempo velkommen!',
        type: ClassType.GROUP_CLASS,
        capacity: 20,
        duration: 45,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 17, 0),
        trainerId: trainers[1].id,
        published: true
      },
      {
        name: 'Helgeyoga',
        description: 'Rolig yogaøkt for en perfekt start på helgen.',
        type: ClassType.GROUP_CLASS,
        capacity: 25,
        duration: 75,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 10, 0),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'Bootcamp',
        description: 'Militærinspirert utendørstrening. Maks innsats!',
        type: ClassType.GROUP_CLASS,
        capacity: 20,
        duration: 60,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 9, 0),
        trainerId: trainers[1].id,
        published: true
      },
      {
        name: 'Mobility & Stretching',
        description: 'Forbedre bevegelighet og fleksibilitet.',
        type: ClassType.GROUP_CLASS,
        capacity: 15,
        duration: 45,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 11, 0),
        trainerId: trainers[0].id,
        published: true
      },
      {
        name: 'Boxing Cardio',
        description: 'Bokseinspirert kardiotrening. Slå deg i form!',
        type: ClassType.GROUP_CLASS,
        capacity: 16,
        duration: 50,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 18, 30),
        trainerId: trainers[1].id,
        published: true
      }
    ];

    const createdClasses = [];
    for (const classData of classesData) {
      const cls = await prisma.class.create({
        data: {
          ...classData,
          tenantId: tenant.id,
          endTime: new Date(classData.startTime.getTime() + classData.duration * 60000)
        }
      });
      createdClasses.push(cls);
      console.log(`  ✓ Created: ${cls.name}`);
    }

    console.log(`\n✓ Classes created: ${createdClasses.length}\n`);

    // Create some bookings for classes
    console.log('Creating class bookings...');
    let bookingCount = 0;
    for (const cls of createdClasses.slice(0, 6)) { // Book first 6 classes
      for (const customer of customers) {
        await prisma.booking.create({
          data: {
            tenantId: tenant.id,
            classId: cls.id,
            userId: customer.id,
            status: BookingStatus.CONFIRMED
          }
        });
        bookingCount++;
      }
    }
    console.log(`✓ Bookings created: ${bookingCount}\n`);

    // ========================================
    // 3. PT SESSIONS (PT-økter)
    // ========================================
    console.log('Creating PT sessions...');

    const ptSessionsData = [
      // Scheduled future sessions
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Styrketrening Oppstart',
        description: 'Introduksjon til styrketrening med fokus på grunnøvelser.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
        duration: 60,
        status: PTSessionStatus.CONFIRMED,
        price: 599,
        location: 'Treningssalen'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Teknikk Markløft',
        description: 'Fokusere på korrekt teknikk for markløft.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 0),
        duration: 60,
        status: PTSessionStatus.CONFIRMED,
        price: 599,
        location: 'Frivektsone'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'HIIT og Kondisjon',
        description: 'Høyintensiv intervalltrening for bedre kondisjon.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 16, 0),
        duration: 45,
        status: PTSessionStatus.SCHEDULED,
        price: 499,
        location: 'Funksjonssone'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Mobilitet og Fleksibilitet',
        description: 'Øvelser for bedre bevegelighet.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 15, 0),
        duration: 45,
        status: PTSessionStatus.PENDING_APPROVAL,
        price: 499,
        location: 'Strekksone'
      },
      // Completed sessions (past dates)
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Introduksjonstime',
        description: 'Første time med gjennomgang av mål og kartlegging.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 10, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen',
        notes: 'Bra start! Kunde er motivert og har klare mål.'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Beinstyrke',
        description: 'Fokus på knebøy og beinøvelser.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12, 11, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Frivektsone',
        notes: 'Flott progresjon på knebøy! Øk vekten neste gang.'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Overkropp Push',
        description: 'Bryst, skuldre og triceps.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10, 10, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen',
        notes: 'God form på alle øvelser. Fortsett slik!'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Introduksjonstime',
        description: 'Første time med gjennomgang av treningserfaring.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 9, 14, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen',
        notes: 'Kunde har god erfaring fra før. Klar for tyngre vekter.'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Overkropp Pull',
        description: 'Rygg, biceps og bakre skuldre.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8, 11, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Frivektsone',
        notes: 'Fortsatt god progresjon. Øk volumet på ryggtrekning.'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Styrketest',
        description: 'Test av 1RM i de tre store løftene.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 13, 0),
        duration: 90,
        status: PTSessionStatus.COMPLETED,
        price: 799,
        location: 'Frivektsone',
        notes: 'Knebøy 80kg, Benkpress 60kg, Markløft 100kg. Bra utgangspunkt!'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Funksjonell Trening',
        description: 'Variasjon med kettlebells og kroppsovelser.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 10, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Funksjonssone'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Beintrening Intensiv',
        description: 'Tung beintrening med fokus på volum.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 15, 0),
        duration: 75,
        status: PTSessionStatus.COMPLETED,
        price: 699,
        location: 'Frivektsone',
        notes: '4x8 knebøy, 3x12 bencurl, 3x15 legpress. Flott innsats!'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Kjernetrening',
        description: 'Fokus på core stability og styrke.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4, 11, 0),
        duration: 45,
        status: PTSessionStatus.COMPLETED,
        price: 499,
        location: 'Funksjonssone'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Ryggtrening',
        description: 'Fullstendig ryggøkt med ulike vinkler.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 14, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[1].id,
        title: 'PT Evaluering',
        description: 'Progresjonsevaluering og justering av program.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 16, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen',
        customerNotes: 'Veldig fornøyd med fremgangen så langt!'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[0].id,
        title: 'Skulderfokus',
        description: 'Dedikert skulderøkt med mobilitet og styrke.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0),
        duration: 60,
        status: PTSessionStatus.COMPLETED,
        price: 599,
        location: 'Treningssalen'
      },
      // More future sessions
      {
        trainerId: trainers[0].id,
        customerId: customers[1].id,
        title: 'Bodyweight Training',
        description: 'Effektiv trening kun med kroppsvekt.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 12, 0),
        duration: 45,
        status: PTSessionStatus.SCHEDULED,
        price: 499,
        location: 'Funksjonssone'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[0].id,
        title: 'Olympic Lifts',
        description: 'Introduksjon til olympisk vektløfting.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 13, 0),
        duration: 60,
        status: PTSessionStatus.PENDING_APPROVAL,
        price: 599,
        location: 'Frivektsone'
      },
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Cardio & Conditioning',
        description: 'Forbedre kardiovaskulær utholdenhet.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0),
        duration: 45,
        status: PTSessionStatus.SCHEDULED,
        price: 499,
        location: 'Cardiosone'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Periodisering og Planlegging',
        description: 'Legge plan for neste 12-ukersperiode.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8, 15, 0),
        duration: 60,
        status: PTSessionStatus.SCHEDULED,
        price: 599,
        location: 'Møterom'
      },
      // Cancelled sessions
      {
        trainerId: trainers[0].id,
        customerId: customers[0].id,
        title: 'Morgentrening',
        description: 'Tidlig morgenøkt for best start på dagen.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 7, 0),
        duration: 60,
        status: PTSessionStatus.CANCELLED,
        price: 599,
        location: 'Treningssalen',
        cancellationReason: 'Kunde ble syk'
      },
      {
        trainerId: trainers[1].id,
        customerId: customers[1].id,
        title: 'Kveldstrening',
        description: 'Styrketrening på kvelden.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 19, 0),
        duration: 60,
        status: PTSessionStatus.CANCELLED,
        price: 599,
        location: 'Frivektsone',
        cancellationReason: 'PT måtte avlyse pga sykdom'
      },
      // One no-show
      {
        trainerId: trainers[0].id,
        customerId: customers[1].id,
        title: 'Lunsjtrening',
        description: 'Rask og effektiv lunsjtime.',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12, 0),
        duration: 45,
        status: PTSessionStatus.NO_SHOW,
        price: 499,
        location: 'Funksjonssone',
        notes: 'Kunde møtte ikke opp, ikke varslet.'
      }
    ];

    const createdPTSessions = [];
    for (const sessionData of ptSessionsData) {
      const { duration, ...sessionDataWithoutDuration } = sessionData;
      const session = await prisma.pTSession.create({
        data: {
          ...sessionDataWithoutDuration,
          tenantId: tenant.id,
          endTime: new Date(sessionData.startTime.getTime() + duration * 60000)
        }
      });
      createdPTSessions.push(session);
      console.log(`  ✓ Created: ${session.title} (${session.status})`);
    }

    console.log(`\n✓ PT Sessions created: ${createdPTSessions.length}\n`);

    // ========================================
    // 4. ACCOUNTING (Regnskap)
    // ========================================
    console.log('Creating accounting data...');

    // Chart of Accounts
    const accountsData = [
      // INCOME ACCOUNTS (3000-3999)
      { accountNumber: '3000', name: 'Salgsinntekt - Medlemskap', type: 'INCOME', vatCode: VATRate.RATE_25 },
      { accountNumber: '3010', name: 'Salgsinntekt - PT-timer', type: 'INCOME', vatCode: VATRate.RATE_25 },
      { accountNumber: '3020', name: 'Salgsinntekt - Produktsalg', type: 'INCOME', vatCode: VATRate.RATE_25 },
      { accountNumber: '3030', name: 'Salgsinntekt - Klasser', type: 'INCOME', vatCode: VATRate.RATE_25 },

      // EXPENSE ACCOUNTS (4000-7999)
      { accountNumber: '4000', name: 'Varekjøp', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '5000', name: 'Lønn og sosiale kostnader', type: 'EXPENSE', vatCode: VATRate.EXEMPT },
      { accountNumber: '6000', name: 'Husleie', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6100', name: 'Strøm og oppvarming', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6200', name: 'Renhold', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6300', name: 'Vedlikehold utstyr', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6400', name: 'Forsikring', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6800', name: 'Kontorrekvisita', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '6900', name: 'Markedsføring', type: 'EXPENSE', vatCode: VATRate.RATE_25 },
      { accountNumber: '7000', name: 'Telefon og internett', type: 'EXPENSE', vatCode: VATRate.RATE_25 },

      // ASSET ACCOUNTS (1000-1999)
      { accountNumber: '1920', name: 'Bank', type: 'ASSET', vatCode: null },

      // LIABILITY ACCOUNTS (2000-2999)
      { accountNumber: '2700', name: 'Utgående MVA', type: 'LIABILITY', vatCode: null },
      { accountNumber: '2710', name: 'Inngående MVA', type: 'LIABILITY', vatCode: null }
    ];

    const createdAccounts: Account[] = [];
    for (const accountData of accountsData) {
      const existing = await prisma.account.findFirst({
        where: {
          tenantId: tenant.id,
          accountNumber: accountData.accountNumber
        }
      });

      if (!existing) {
        const account = await prisma.account.create({
          data: {
            ...accountData,
            tenantId: tenant.id
          }
        });
        createdAccounts.push(account);
        console.log(`  ✓ Created account: ${account.accountNumber} - ${account.name}`);
      }
    }

    console.log(`\n✓ Accounts created: ${createdAccounts.length}\n`);

    // Transactions
    console.log('Creating transactions...');

    const getAccount = (accountNumber: string) => {
      return createdAccounts.find(a => a.accountNumber === accountNumber);
    };

    const transactionsData = [
      // Income transactions (last 3 months)
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3000')?.id,
        description: 'Medlemsinntekt Januar',
        amount: 45000,
        vatAmount: 9000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3010')?.id,
        description: 'PT-timer Januar',
        amount: 18000,
        vatAmount: 3600,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 20),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3020')?.id,
        description: 'Produktsalg Januar - Proteinpulver',
        amount: 12500,
        vatAmount: 2500,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 25),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3030')?.id,
        description: 'Klasseinntekter Januar',
        amount: 8500,
        vatAmount: 1700,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 28),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3000')?.id,
        description: 'Medlemsinntekt Februar',
        amount: 52000,
        vatAmount: 10400,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3010')?.id,
        description: 'PT-timer Februar',
        amount: 22000,
        vatAmount: 4400,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3020')?.id,
        description: 'Produktsalg Februar - Diverse utstyr',
        amount: 15000,
        vatAmount: 3000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 25),
        createdBy: admins[0].id
      },
      // Expense transactions
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6000')?.id,
        description: 'Husleie Januar',
        amount: 25000,
        vatAmount: 5000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('5000')?.id,
        description: 'Lønn Januar',
        amount: 85000,
        vatAmount: 0,
        vatRate: VATRate.EXEMPT,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 25),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6100')?.id,
        description: 'Strøm og oppvarming Januar',
        amount: 4500,
        vatAmount: 900,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 10),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6200')?.id,
        description: 'Renhold Januar',
        amount: 3500,
        vatAmount: 700,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('4000')?.id,
        description: 'Varekjøp - Treningsutstyr',
        amount: 12000,
        vatAmount: 2400,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 8),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6900')?.id,
        description: 'Facebook Ads Januar',
        amount: 2500,
        vatAmount: 500,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 12),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('7000')?.id,
        description: 'Telefon og internett Januar',
        amount: 1200,
        vatAmount: 240,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 5),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6000')?.id,
        description: 'Husleie Februar',
        amount: 25000,
        vatAmount: 5000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('5000')?.id,
        description: 'Lønn Februar',
        amount: 85000,
        vatAmount: 0,
        vatRate: VATRate.EXEMPT,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 25),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6100')?.id,
        description: 'Strøm og oppvarming Februar',
        amount: 3800,
        vatAmount: 760,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6200')?.id,
        description: 'Renhold Februar',
        amount: 3500,
        vatAmount: 700,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6300')?.id,
        description: 'Vedlikehold treningsmaskin',
        amount: 4500,
        vatAmount: 900,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 18),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6800')?.id,
        description: 'Kontorrekvisita',
        amount: 800,
        vatAmount: 160,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6900')?.id,
        description: 'Instagram Ads Februar',
        amount: 3000,
        vatAmount: 600,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 12),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('7000')?.id,
        description: 'Telefon og internett Februar',
        amount: 1200,
        vatAmount: 240,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
        createdBy: admins[0].id
      },
      // Current month
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3000')?.id,
        description: 'Medlemsinntekt denne måneden',
        amount: 58000,
        vatAmount: 11600,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth(), 15),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.INCOME,
        accountId: getAccount('3010')?.id,
        description: 'PT-timer denne måneden',
        amount: 25000,
        vatAmount: 5000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth(), 20),
        createdBy: admins[0].id
      },
      {
        type: TransactionType.EXPENSE,
        accountId: getAccount('6000')?.id,
        description: 'Husleie denne måneden',
        amount: 25000,
        vatAmount: 5000,
        vatRate: VATRate.RATE_25,
        transactionDate: new Date(now.getFullYear(), now.getMonth(), 1),
        createdBy: admins[0].id
      }
    ];

    const createdTransactions = [];
    for (const transData of transactionsData) {
      if (transData.accountId &&  typeof transData.accountId === 'string') {
        const transaction = await prisma.transaction.create({
          data: {
            tenantId: tenant.id,
            type: transData.type,
            accountId: transData.accountId,
            description: transData.description,
            amount: transData.amount,
            vatAmount: transData.vatAmount,
            vatRate: transData.vatRate,
            transactionDate: transData.transactionDate,
            createdBy: transData.createdBy
          }
        });
        createdTransactions.push(transaction);
        console.log(`  ✓ Created: ${transaction.description} (${transaction.amount} NOK)`);
      }
    }

    console.log(`\n✓ Transactions created: ${createdTransactions.length}\n`);

    // ========================================
    // 5. CHAT MESSAGES (Meldinger)
    // ========================================
    console.log('Creating chat conversations and messages...');

    // Conversation 1: Customer 1 and Trainer 1
    const conv1 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        isGroup: false,
        participants: {
          create: [
            { userId: customers[0].id },
            { userId: trainers[0].id }
          ]
        }
      }
    });

    const conv1Messages = [
      { senderId: customers[0].id, content: 'Hei! Jeg lurte på om du har ledig tid til en PT-time denne uken?', createdAt: new Date(now.getTime() - 86400000 * 3) },
      { senderId: trainers[0].id, content: 'Hei! Ja, jeg har ledig tid på tirsdag kl 10 eller onsdag kl 15. Passer noe av det?', createdAt: new Date(now.getTime() - 86400000 * 3 + 600000) },
      { senderId: customers[0].id, content: 'Perfekt! Tirsdag kl 10 passer veldig bra.', createdAt: new Date(now.getTime() - 86400000 * 3 + 1200000) },
      { senderId: trainers[0].id, content: 'Flott! Har booket deg inn. Vi fokuserer på styrketrening som planlagt. Husk å spise godt 2 timer før!', createdAt: new Date(now.getTime() - 86400000 * 3 + 1800000) },
      { senderId: customers[0].id, content: 'Takk! Gleder meg! 💪', createdAt: new Date(now.getTime() - 86400000 * 3 + 2400000) },
      { senderId: trainers[0].id, content: 'Hvordan gikk treningen i går? Merker du noe ømhet i dag?', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { senderId: customers[0].id, content: 'Ja, litt øm i bena, men på en god måte! 😄', createdAt: new Date(now.getTime() - 86400000 * 1 + 3600000) },
      { senderId: trainers[0].id, content: 'Det er helt normalt! Tøy litt og drikk mye vann. Vi tar ny økt på fredag?', createdAt: new Date(now.getTime() - 86400000 * 1 + 7200000) },
      { senderId: customers[0].id, content: 'Ja, det passer bra! Samme tid?', createdAt: new Date(now.getTime() - 3600000) },
      { senderId: trainers[0].id, content: 'Perfekt! Ser deg kl 10 på fredag 👍', createdAt: new Date(now.getTime() - 1800000) }
    ];

    for (const msgData of conv1Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv1.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Customer 1 <-> Trainer 1 (${conv1Messages.length} messages)`);

    // Conversation 2: Customer 2 and Trainer 2
    const conv2 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        isGroup: false,
        participants: {
          create: [
            { userId: customers[1].id },
            { userId: trainers[1].id }
          ]
        }
      }
    });

    const conv2Messages = [
      { senderId: customers[1].id, content: 'Hei! Jeg har bestilt PT-pakke med 10 timer. Når kan vi starte?', createdAt: new Date(now.getTime() - 86400000 * 5) },
      { senderId: trainers[1].id, content: 'Hei! Gratulerer med kjøpet! Vi kan starte allerede i neste uke. Hva er dine hovedmål?', createdAt: new Date(now.getTime() - 86400000 * 5 + 1800000) },
      { senderId: customers[1].id, content: 'Jeg vil bli sterkere og bygge mer muskelmasse. Har trent litt før, men vil gjerne lære riktig teknikk.', createdAt: new Date(now.getTime() - 86400000 * 5 + 3600000) },
      { senderId: trainers[1].id, content: 'Perfekt! Vi starter med en grunnleggende styrketest, så lager jeg et personlig program til deg. Mandag kl 14?', createdAt: new Date(now.getTime() - 86400000 * 5 + 5400000) },
      { senderId: customers[1].id, content: 'Høres bra ut! Sees på mandag 👍', createdAt: new Date(now.getTime() - 86400000 * 5 + 7200000) },
      { senderId: trainers[1].id, content: 'Flott økkt i dag! Du har et godt utgangspunkt. Jeg sender deg programmet i kveld.', createdAt: new Date(now.getTime() - 86400000 * 2) },
      { senderId: customers[1].id, content: 'Takk! Følte meg litt usikker på markløft, kan vi øve mer på det?', createdAt: new Date(now.getTime() - 86400000 * 2 + 3600000) },
      { senderId: trainers[1].id, content: 'Absolutt! Markløft er en kompleks øvelse. Vi bruker god tid på det neste gang. Her er programmet: [fil]', createdAt: new Date(now.getTime() - 86400000 * 2 + 5400000) },
      { senderId: customers[1].id, content: 'Supert! Ser frem til neste økt!', createdAt: new Date(now.getTime() - 86400000 * 2 + 7200000) }
    ];

    for (const msgData of conv2Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv2.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Customer 2 <-> Trainer 2 (${conv2Messages.length} messages)`);

    // Conversation 3: Customer 1 and Admin (Support)
    const conv3 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        name: 'Support',
        isGroup: false,
        participants: {
          create: [
            { userId: customers[0].id },
            { userId: admins[0].id }
          ]
        }
      }
    });

    const conv3Messages = [
      { senderId: customers[0].id, content: 'Hei! Jeg har problemer med å bestille produkt fra nettbutikken.', createdAt: new Date(now.getTime() - 86400000 * 4) },
      { senderId: admins[0].id, content: 'Hei! Beklager at du opplever problemer. Hva slags feilmelding får du?', createdAt: new Date(now.getTime() - 86400000 * 4 + 1800000) },
      { senderId: customers[0].id, content: 'Det står at produktet er utsolgt, men jeg så det var 25 på lager?', createdAt: new Date(now.getTime() - 86400000 * 4 + 3600000) },
      { senderId: admins[0].id, content: 'Ah, jeg ser problemet! Det var en teknisk feil. Fikset nå. Prøv igjen! 👍', createdAt: new Date(now.getTime() - 86400000 * 4 + 5400000) },
      { senderId: customers[0].id, content: 'Fungerer perfekt nå! Takk for rask hjelp!', createdAt: new Date(now.getTime() - 86400000 * 4 + 7200000) },
      { senderId: admins[0].id, content: 'Bare hyggelig! Er det noe annet jeg kan hjelpe med?', createdAt: new Date(now.getTime() - 86400000 * 4 + 9000000) },
      { senderId: customers[0].id, content: 'Nei, det var alt! Ha en fin dag!', createdAt: new Date(now.getTime() - 86400000 * 4 + 10800000) }
    ];

    for (const msgData of conv3Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv3.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Customer 1 <-> Admin/Support (${conv3Messages.length} messages)`);

    // Conversation 4: Customer 2 and Admin
    const conv4 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        name: 'Support',
        isGroup: false,
        participants: {
          create: [
            { userId: customers[1].id },
            { userId: admins[1].id }
          ]
        }
      }
    });

    const conv4Messages = [
      { senderId: customers[1].id, content: 'Hei! Jeg vil gjerne vite mer om medlemskapene deres.', createdAt: new Date(now.getTime() - 86400000 * 6) },
      { senderId: admins[1].id, content: 'Hei! Selvfølgelig! Vi har dagskort for 150 kr, månedskort for 599 kr, 3-måneder for 1599 kr og årskort for 5395 kr.', createdAt: new Date(now.getTime() - 86400000 * 6 + 1800000) },
      { senderId: customers[1].id, content: 'Hva får man med medlemskapet?', createdAt: new Date(now.getTime() - 86400000 * 6 + 3600000) },
      { senderId: admins[1].id, content: 'Tilgang til alle treningsområder, gratis gruppetimer (yoga, spinning, HIIT osv), garderobe med dusj og treningsplan ved oppstart!', createdAt: new Date(now.getTime() - 86400000 * 6 + 5400000) },
      { senderId: customers[1].id, content: 'Høres bra ut! Kan jeg kombinere med PT-timer?', createdAt: new Date(now.getTime() - 86400000 * 6 + 7200000) },
      { senderId: admins[1].id, content: 'Ja! Vi har PT-pakker fra 499 kr (1 time) til 5495 kr (10 timer). Som medlem får du 10% rabatt!', createdAt: new Date(now.getTime() - 86400000 * 6 + 9000000) },
      { senderId: customers[1].id, content: 'Perfekt! Jeg tar 3-måneders medlemskap og 10 PT-timer!', createdAt: new Date(now.getTime() - 86400000 * 6 + 10800000) },
      { senderId: admins[1].id, content: 'Fantastisk valg! Jeg ser at du allerede har bestilt. Velkommen til Premium Gym! 🎉', createdAt: new Date(now.getTime() - 86400000 * 6 + 12600000) }
    ];

    for (const msgData of conv4Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv4.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Customer 2 <-> Admin/Support (${conv4Messages.length} messages)`);

    // Conversation 5: Trainers discussing schedule
    const conv5 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        name: 'Trenere',
        isGroup: true,
        participants: {
          create: [
            { userId: trainers[0].id },
            { userId: trainers[1].id }
          ]
        }
      }
    });

    const conv5Messages = [
      { senderId: trainers[0].id, content: 'Hei! Kan du ta yogaklassen min på fredag? Jeg må til tannlegen.', createdAt: new Date(now.getTime() - 86400000 * 2) },
      { senderId: trainers[1].id, content: 'Hvilken tid?', createdAt: new Date(now.getTime() - 86400000 * 2 + 1800000) },
      { senderId: trainers[0].id, content: 'Kl 19:30. Har bare 8 påmeldte så langt.', createdAt: new Date(now.getTime() - 86400000 * 2 + 3600000) },
      { senderId: trainers[1].id, content: 'Greit! Jeg bytter med deg. Kan du ta HIIT-en min på torsdag kl 17:30?', createdAt: new Date(now.getTime() - 86400000 * 2 + 5400000) },
      { senderId: trainers[0].id, content: 'Deal! Takk! 🙏', createdAt: new Date(now.getTime() - 86400000 * 2 + 7200000) },
      { senderId: trainers[1].id, content: 'Hvordan gikk yogaklassen i går?', createdAt: new Date(now.getTime() - 86400000 * 1) },
      { senderId: trainers[0].id, content: 'Veldig bra! Fikk to nye medlemmer også. God stemning!', createdAt: new Date(now.getTime() - 86400000 * 1 + 1800000) },
      { senderId: trainers[1].id, content: 'Bra! Vi må få flere til å prøve klassene. De er veldig populære nå.', createdAt: new Date(now.getTime() - 86400000 * 1 + 3600000) }
    ];

    for (const msgData of conv5Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv5.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Trainers group chat (${conv5Messages.length} messages)`);

    // Conversation 6: Customer support - Product question
    const conv6 = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        name: 'Support',
        isGroup: false,
        participants: {
          create: [
            { userId: customers[0].id },
            { userId: admins[1].id }
          ]
        }
      }
    });

    const conv6Messages = [
      { senderId: customers[0].id, content: 'Hei! Jeg lurte på om proteinpulveret deres er laktosefritt?', createdAt: new Date(now.getTime() - 3600000 * 5) },
      { senderId: admins[1].id, content: 'Hei! Whey-proteinet vårt inneholder laktose, men vi har også et vegansk alternativ som er laktosefritt. Skal jeg legge det ut i butikken?', createdAt: new Date(now.getTime() - 3600000 * 4) },
      { senderId: customers[0].id, content: 'Ja gjerne! Hva slags smak har det veganske?', createdAt: new Date(now.getTime() - 3600000 * 3) },
      { senderId: admins[1].id, content: 'Vi har sjokolade og vanilje. Begge er veldig gode!', createdAt: new Date(now.getTime() - 3600000 * 2) },
      { senderId: customers[0].id, content: 'Perfekt! Jeg venter på at det legges ut 😊', createdAt: new Date(now.getTime() - 3600000) }
    ];

    for (const msgData of conv6Messages) {
      await prisma.message.create({
        data: {
          conversationId: conv6.id,
          senderId: msgData.senderId,
          content: msgData.content,
          createdAt: msgData.createdAt
        }
      });
    }
    console.log(`  ✓ Created conversation: Customer 1 <-> Admin (product inquiry) (${conv6Messages.length} messages)`);

    const totalMessages = conv1Messages.length + conv2Messages.length + conv3Messages.length + conv4Messages.length + conv5Messages.length + conv6Messages.length;
    console.log(`\n✓ Chat conversations created: 6`);
    console.log(`✓ Total messages created: ${totalMessages}\n`);

    console.log('=================================================================');
    console.log('DUMMY DATA SEED COMPLETED SUCCESSFULLY!');
    console.log('=================================================================');
    console.log(`\n📊 Summary:`);
    console.log(`   Products: ${createdProducts.length}`);
    console.log(`   Classes: ${createdClasses.length}`);
    console.log(`   Class Bookings: ${bookingCount}`);
    console.log(`   PT Sessions: ${createdPTSessions.length}`);
    console.log(`   Accounts: ${createdAccounts.length}`);
    console.log(`   Transactions: ${createdTransactions.length}`);
    console.log(`   Conversations: 6`);
    console.log(`   Messages: ${totalMessages}`);
    console.log('\n=================================================================\n');

  } catch (error) {
    console.error('Error seeding dummy data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDummyData()
    .then(() => {
      console.log('Dummy data seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Dummy data seed process failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
