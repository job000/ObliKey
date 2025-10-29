import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Quick setup script for main entrance access
 *
 * This script helps admins:
 * 1. Find their tenant
 * 2. List available doors
 * 3. Mark a door as main entrance with automatic access
 */
async function quickSetup() {
  try {
    console.log('\n🚪 ObliKey - Main Entrance Quick Setup\n');
    console.log('═'.repeat(50));

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
    });

    if (tenants.length === 0) {
      console.log('❌ No active tenants found.');
      return;
    }

    console.log('\n📍 Available Tenants:\n');
    tenants.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.subdomain})`);
    });

    const tenantChoice = await question(
      `\nSelect tenant (1-${tenants.length}): `
    );
    const tenantIndex = parseInt(tenantChoice) - 1;

    if (tenantIndex < 0 || tenantIndex >= tenants.length) {
      console.log('❌ Invalid selection.');
      return;
    }

    const selectedTenant = tenants[tenantIndex];
    console.log(`\n✓ Selected: ${selectedTenant.name}\n`);

    // Get doors for this tenant
    const doors = await prisma.door.findMany({
      where: {
        tenantId: selectedTenant.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        location: true,
        metadata: true,
      },
      orderBy: { name: 'asc' },
    });

    if (doors.length === 0) {
      console.log('❌ No active doors found for this tenant.');
      console.log(
        '\nℹ️  Create doors first via the admin panel or API.'
      );
      return;
    }

    console.log('🚪 Available Doors:\n');
    doors.forEach((door, index) => {
      const metadata = door.metadata as any;
      const isMainEntrance = metadata?.isMainEntrance === true;
      const marker = isMainEntrance ? ' [MAIN ENTRANCE]' : '';
      const location = door.location ? ` - ${door.location}` : '';
      console.log(`  ${index + 1}. ${door.name}${location}${marker}`);
    });

    const doorChoice = await question(`\nSelect door (1-${doors.length}): `);
    const doorIndex = parseInt(doorChoice) - 1;

    if (doorIndex < 0 || doorIndex >= doors.length) {
      console.log('❌ Invalid selection.');
      return;
    }

    const selectedDoor = doors[doorIndex];
    const currentMetadata = selectedDoor.metadata as any;
    const isCurrentlyMainEntrance = currentMetadata?.isMainEntrance === true;

    console.log(`\n✓ Selected: ${selectedDoor.name}`);

    if (isCurrentlyMainEntrance) {
      console.log('⚠️  This door is already marked as main entrance.');
      const confirm = await question(
        '\nDo you want to remove main entrance status? (yes/no): '
      );

      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        await setMainEntrance(
          selectedDoor.id,
          selectedTenant.id,
          selectedDoor.name,
          false
        );
      } else {
        console.log('✓ No changes made.');
      }
    } else {
      console.log('\n📝 This will:');
      console.log(
        '   1. Mark this door as the main entrance'
      );
      console.log(
        '   2. Create an automatic access rule for all active members'
      );
      console.log(
        '   3. Active members will immediately see this door in their app\n'
      );

      const confirm = await question('Continue? (yes/no): ');

      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        await setMainEntrance(
          selectedDoor.id,
          selectedTenant.id,
          selectedDoor.name,
          true
        );
      } else {
        console.log('✓ Setup cancelled.');
      }
    }

    console.log('\n═'.repeat(50));
    console.log('✅ Setup complete!\n');
  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

async function setMainEntrance(
  doorId: string,
  tenantId: string,
  doorName: string,
  isMainEntrance: boolean
) {
  // Update door metadata
  await prisma.door.update({
    where: { id: doorId },
    data: {
      metadata: {
        isMainEntrance,
      },
    },
  });

  if (isMainEntrance) {
    // Check if auto-access rule already exists
    const existingRule = await prisma.doorAccessRule.findFirst({
      where: {
        doorId,
        tenantId,
        type: 'MEMBERSHIP',
        name: 'Automatic Access - Active Members',
      },
    });

    if (!existingRule) {
      // Create membership access rule
      await prisma.doorAccessRule.create({
        data: {
          tenantId,
          doorId,
          name: 'Automatic Access - Active Members',
          description:
            'Automatically grants access to all active members. This is a system-created rule for main entrance access.',
          type: 'MEMBERSHIP',
          priority: 10,
          active: true,
          allowedMembershipStatuses: ['ACTIVE'],
          allowedRoles: [],
          allowedUserIds: [],
        },
      });

      console.log(
        `\n✅ ${doorName} marked as main entrance with automatic access`
      );
      console.log('   ✓ Access rule created for all active members');
    } else {
      // Reactivate if it was disabled
      if (!existingRule.active) {
        await prisma.doorAccessRule.update({
          where: { id: existingRule.id },
          data: { active: true },
        });
        console.log(
          `\n✅ ${doorName} marked as main entrance (access rule reactivated)`
        );
      } else {
        console.log(
          `\n✅ ${doorName} marked as main entrance (access rule already exists)`
        );
      }
    }
  } else {
    // Deactivate auto-access rule
    const existingRule = await prisma.doorAccessRule.findFirst({
      where: {
        doorId,
        tenantId,
        type: 'MEMBERSHIP',
        name: 'Automatic Access - Active Members',
      },
    });

    if (existingRule && existingRule.active) {
      await prisma.doorAccessRule.update({
        where: { id: existingRule.id },
        data: { active: false },
      });
      console.log(`\n✅ ${doorName} unmarked as main entrance`);
      console.log('   ✓ Automatic access rule deactivated');
    } else {
      console.log(`\n✅ ${doorName} unmarked as main entrance`);
    }
  }
}

// Run the script
quickSetup();
