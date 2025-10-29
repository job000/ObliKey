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

    // Create sample doors with Bluetooth proximity metadata
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
        metadata: {
          bluetooth: {
            enabled: true,
            beaconId: 'MAIN-ENTRANCE-BEACON-001',
            minimumRssi: -70, // ~5 meters
          },
        },
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
        metadata: {
          bluetooth: {
            enabled: true,
            beaconId: 'GYM-FLOOR-BEACON-002',
            minimumRssi: -65, // ~3 meters - closer range
          },
        },
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
        metadata: {
          bluetooth: {
            enabled: true,
            beaconId: 'LOCKER-ROOM-BEACON-003',
            minimumRssi: -60, // ~2 meters - very close range
          },
        },
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
        metadata: {
          bluetooth: {
            enabled: true,
            beaconId: 'VIP-AREA-BEACON-004',
            minimumRssi: -55, // ~1 meter - must be very close
          },
        },
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
        metadata: {
          bluetooth: {
            enabled: false, // Emergency exit - no proximity required
          },
        },
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

    // Delete existing access rules for this tenant to avoid duplicates
    await prisma.doorAccessRule.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Create access rules
    console.log('🔐 Creating access rules...');

    // Rule 1: Admin and Super Admin get access to all doors
    for (const door of createdDoors) {
      await prisma.doorAccessRule.create({
        data: {
          tenantId: tenant.id,
          doorId: door.id,
          name: `Admin/SuperAdmin tilgang - ${door.name}`,
          description: 'Admins og super admins har full tilgang',
          type: AccessRuleType.ROLE,
          priority: 100,
          allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
          allowedUserIds: [],
          allowedMembershipStatuses: [],
          active: true,
        },
      });
    }
    console.log(`  ✅ Created admin access rules for all ${createdDoors.length} doors`);

    // Rule 2: Customers and Trainers can access main entrance, gym, and locker room
    const publicDoors = createdDoors.slice(0, 3); // First 3 doors
    for (const door of publicDoors) {
      await prisma.doorAccessRule.create({
        data: {
          tenantId: tenant.id,
          doorId: door.id,
          name: `Medlemstilgang - ${door.name}`,
          description: 'Alle medlemmer med aktivt medlemskap får tilgang',
          type: AccessRuleType.MEMBERSHIP,
          priority: 50,
          allowedRoles: ['CUSTOMER', 'TRAINER'],
          allowedUserIds: [],
          allowedMembershipStatuses: ['ACTIVE'],
          active: true,
        },
      });
    }
    console.log(`  ✅ Created membership access rules for ${publicDoors.length} doors`);

    // Rule 3: VIP area - only specific users
    const vipDoor = createdDoors[3]; // VIP training area
    await prisma.doorAccessRule.create({
      data: {
        tenantId: tenant.id,
        doorId: vipDoor.id,
        name: 'VIP Område - Premium medlemmer',
        description: 'Kun utvalgte premium medlemmer har tilgang',
        type: AccessRuleType.USER_SPECIFIC,
        priority: 75,
        allowedRoles: [],
        allowedUserIds: users.slice(0, 2).map(u => u.id), // Only first 2 users
        allowedMembershipStatuses: ['ACTIVE'],
        active: true,
      },
    });
    console.log(`  ✅ Created VIP access rule for 2 users`);

    // Delete existing access logs for this tenant
    await prisma.doorAccessLog.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Create some sample access logs
    console.log('📋 Creating sample access logs...');
    const sampleLogs = [
      {
        tenantId: tenant.id,
        doorId: createdDoors[0].id,
        userId: users[0].id,
        result: AccessResult.GRANTED,
        accessMethod: 'API',
        denialReason: null,
        ipAddress: '192.168.1.100',
        metadata: {
          ruleName: 'Medlemstilgang - Hovedinngangsdør',
          accessType: 'membership',
        },
      },
      {
        tenantId: tenant.id,
        doorId: createdDoors[1].id,
        userId: users[1].id,
        result: AccessResult.GRANTED,
        accessMethod: 'API',
        denialReason: null,
        ipAddress: '192.168.1.101',
        metadata: {
          ruleName: 'Medlemstilgang - Treningssalen',
          accessType: 'membership',
        },
      },
      {
        tenantId: tenant.id,
        doorId: createdDoors[3].id,
        userId: users[2].id,
        result: AccessResult.DENIED_NO_PERMISSION,
        accessMethod: 'API',
        denialReason: 'User does not match any access rules',
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
    console.log(`  - Access rules created: ${createdDoors.length + publicDoors.length + 1}`);
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
