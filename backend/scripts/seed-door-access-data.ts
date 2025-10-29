import { PrismaClient, DoorStatus, AccessRuleType, AccessResult } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDoorAccessData() {
  try {
    console.log('🚪 Starting door access system seed...');

    // Get the oblikey-demo tenant
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain: 'oblikey-demo' },
    });

    if (!tenant) {
      console.error('❌ Could not find oblikey-demo tenant');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.name}`);

    // Get some users to assign access
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      take: 5,
    });

    if (users.length === 0) {
      console.error('❌ No users found for tenant');
      return;
    }

    console.log(`✅ Found ${users.length} users`);

    // Create sample doors
    const doors = [
      {
        tenantId: tenant.id,
        name: 'Hovedinngangsdør',
        description: 'Hoveddør til treningssenteret',
        location: '1. etasje - Inngang',
        status: DoorStatus.ACTIVE,
        isOnline: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: false,
        unlockDuration: 5,
        openTooLongAlert: 30,
      },
      {
        tenantId: tenant.id,
        name: 'Treningssalen',
        description: 'Inngang til hovedtreningssalen',
        location: '2. etasje',
        status: DoorStatus.ACTIVE,
        isOnline: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: false,
        unlockDuration: 5,
        openTooLongAlert: 30,
      },
      {
        tenantId: tenant.id,
        name: 'Omklingsrom',
        description: 'Tilgang til omklingsrommet',
        location: '1. etasje',
        status: DoorStatus.ACTIVE,
        isOnline: true,
        requiresCredential: true,
        allowManualOverride: true,
        alarmEnabled: false,
        unlockDuration: 5,
        openTooLongAlert: 30,
      },
      {
        tenantId: tenant.id,
        name: 'VIP Treningsområde',
        description: 'Eksklusivt område for premium medlemmer',
        location: '3. etasje',
        status: DoorStatus.ACTIVE,
        isOnline: true,
        requiresCredential: true,
        allowManualOverride: false,
        alarmEnabled: true,
        unlockDuration: 5,
        openTooLongAlert: 20,
      },
      {
        tenantId: tenant.id,
        name: 'Nødutgang Bak',
        description: 'Nødutgang baksiden av bygget',
        location: 'Bakside',
        status: DoorStatus.ACTIVE,
        isOnline: true,
        requiresCredential: false,
        allowManualOverride: true,
        alarmEnabled: true,
        unlockDuration: 0,
        openTooLongAlert: 10,
      },
    ];

    console.log('📝 Creating doors...');
    const createdDoors = [];
    for (const doorData of doors) {
      // Check if door exists
      const existingDoor = await prisma.door.findFirst({
        where: {
          tenantId: tenant.id,
          name: doorData.name,
        },
      });

      const door = existingDoor
        ? await prisma.door.update({
            where: { id: existingDoor.id },
            data: doorData,
          })
        : await prisma.door.create({
            data: doorData,
          });

      createdDoors.push(door);
      console.log(`  ✅ Created/Updated door: ${door.name}`);
    }

    // Create access rules
    console.log('🔐 Creating access rules...');

    // Rule 1: All customers have access to main entrance, gym, and locker room (24/7)
    const rule1 = await prisma.doorAccessRule.create({
      data: {
        tenantId: tenant.id,
        name: 'Grunnleggende tilgang for alle medlemmer',
        description: 'Alle medlemmer får tilgang til hovedinngangen, treningssalen og omklingsrom',
        doorId: createdDoors[0].id, // Main entrance
        roleAccess: ['CUSTOMER', 'TRAINER'],
        userIds: [],
        timeSlots: [], // 24/7 access
        active: true,
      },
    });
    console.log(`  ✅ Created access rule: ${rule1.name}`);

    const rule2 = await prisma.doorAccessRule.create({
      data: {
        tenantId: tenant.id,
        name: 'Treningssaltilgang',
        description: 'Alle med medlemskap får tilgang til treningssalen',
        doorId: createdDoors[1].id, // Gym hall
        roleAccess: ['CUSTOMER', 'TRAINER'],
        userIds: [],
        timeSlots: [],
        active: true,
      },
    });
    console.log(`  ✅ Created access rule: ${rule2.name}`);

    const rule3 = await prisma.doorAccessRule.create({
      data: {
        tenantId: tenant.id,
        name: 'Omklingsrom tilgang',
        description: 'Alle med medlemskap får tilgang til omklingsrommet',
        doorId: createdDoors[2].id, // Locker room
        roleAccess: ['CUSTOMER', 'TRAINER'],
        userIds: [],
        timeSlots: [],
        active: true,
      },
    });
    console.log(`  ✅ Created access rule: ${rule3.name}`);

    // Rule 2: VIP access - only specific users (restricted hours)
    const rule4 = await prisma.doorAccessRule.create({
      data: {
        tenantId: tenant.id,
        name: 'VIP Område - Premium medlemmer',
        description: 'Kun utvalgte premium medlemmer har tilgang',
        doorId: createdDoors[3].id, // VIP area
        roleAccess: [],
        userIds: users.slice(0, 2).map(u => u.id), // Only first 2 users
        timeSlots: [
          {
            dayOfWeek: 1, // Monday
            startTime: '06:00',
            endTime: '22:00',
          },
          {
            dayOfWeek: 2, // Tuesday
            startTime: '06:00',
            endTime: '22:00',
          },
          {
            dayOfWeek: 3, // Wednesday
            startTime: '06:00',
            endTime: '22:00',
          },
          {
            dayOfWeek: 4, // Thursday
            startTime: '06:00',
            endTime: '22:00',
          },
          {
            dayOfWeek: 5, // Friday
            startTime: '06:00',
            endTime: '22:00',
          },
        ],
        active: true,
      },
    });
    console.log(`  ✅ Created access rule: ${rule4.name}`);

    // Rule 3: Admin and Trainers have full access to all doors
    for (const door of createdDoors) {
      await prisma.doorAccessRule.create({
        data: {
          tenantId: tenant.id,
          name: `Admin/Trainer full tilgang - ${door.name}`,
          description: 'Admins og trenere har full tilgang',
          doorId: door.id,
          roleAccess: ['ADMIN', 'SUPER_ADMIN', 'TRAINER'],
          userIds: [],
          timeSlots: [],
          active: true,
        },
      });
    }
    console.log(`  ✅ Created admin/trainer access rules for all doors`);

    // Create some sample access logs
    console.log('📋 Creating sample access logs...');
    const sampleLogs = [
      {
        tenantId: tenant.id,
        doorId: createdDoors[0].id,
        userId: users[0].id,
        action: 'ACCESS_GRANTED',
        success: true,
        method: 'API',
        reason: 'Access granted via role-based rule',
        ipAddress: '192.168.1.100',
        metadata: {
          ruleName: 'Grunnleggende tilgang for alle medlemmer',
          accessType: 'role-based',
        },
      },
      {
        tenantId: tenant.id,
        doorId: createdDoors[1].id,
        userId: users[1].id,
        action: 'ACCESS_GRANTED',
        success: true,
        method: 'API',
        reason: 'Access granted via role-based rule',
        ipAddress: '192.168.1.101',
        metadata: {
          ruleName: 'Treningssaltilgang',
          accessType: 'role-based',
        },
      },
      {
        tenantId: tenant.id,
        doorId: createdDoors[3].id,
        userId: users[2].id,
        action: 'ACCESS_DENIED',
        success: false,
        method: 'API',
        reason: 'User does not match any access rules',
        ipAddress: '192.168.1.102',
        metadata: {},
      },
    ];

    for (const logData of sampleLogs) {
      await prisma.doorAccessLog.create({
        data: logData,
      });
    }
    console.log(`  ✅ Created ${sampleLogs.length} sample access logs`);

    console.log('');
    console.log('🎉 Door access system seed completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  - Doors created: ${createdDoors.length}`);
    console.log(`  - Access rules created: ${5 + createdDoors.length}`);
    console.log(`  - Sample access logs: ${sampleLogs.length}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding door access data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDoorAccessData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
