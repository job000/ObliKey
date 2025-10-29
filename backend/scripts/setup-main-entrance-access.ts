import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sets up automatic access to main entrance for all active members
 *
 * This script:
 * 1. Finds doors marked as main entrance (via metadata.isMainEntrance)
 * 2. Creates MEMBERSHIP access rules for active members
 * 3. Ensures existing rules aren't duplicated
 */
async function setupMainEntranceAccess(tenantId?: string) {
  try {
    console.log('🚪 Setting up main entrance access...\n');

    // Get all tenants or specific tenant
    const tenants = tenantId
      ? await prisma.tenant.findMany({ where: { id: tenantId } })
      : await prisma.tenant.findMany({ where: { active: true } });

    if (tenants.length === 0) {
      console.log('❌ No tenants found');
      return;
    }

    for (const tenant of tenants) {
      console.log(`📍 Processing tenant: ${tenant.name} (${tenant.id})`);

      // Find main entrance doors (check metadata.isMainEntrance)
      const doors = await prisma.door.findMany({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
        },
        include: {
          accessRules: {
            where: {
              type: 'MEMBERSHIP',
              active: true,
            },
          },
        },
      });

      // Filter for main entrance doors
      const mainEntranceDoors = doors.filter((door) => {
        const metadata = door.metadata as any;
        return metadata?.isMainEntrance === true;
      });

      console.log(`   Found ${mainEntranceDoors.length} main entrance door(s)`);

      for (const door of mainEntranceDoors) {
        console.log(`   🚪 Processing door: ${door.name}`);

        // Check if membership rule already exists
        const existingMembershipRule = door.accessRules.find((rule) => {
          return (
            rule.type === 'MEMBERSHIP' &&
            rule.allowedMembershipStatuses.includes('ACTIVE') &&
            rule.active
          );
        });

        if (existingMembershipRule) {
          console.log(`      ✓ Membership rule already exists: ${existingMembershipRule.name}`);
          continue;
        }

        // Create membership access rule
        const rule = await prisma.doorAccessRule.create({
          data: {
            tenantId: tenant.id,
            doorId: door.id,
            name: `Automatic Access - Active Members`,
            description: `Automatically grants access to all active members. Created by setup script.`,
            type: 'MEMBERSHIP',
            priority: 10, // Lower priority than manual user-specific rules
            active: true,
            allowedMembershipStatuses: ['ACTIVE'],
            allowedRoles: [],
            allowedUserIds: [],
          },
        });

        console.log(`      ✅ Created membership rule: ${rule.name} (ID: ${rule.id})`);
      }

      // Also check doors without isMainEntrance flag
      const regularDoors = doors.filter((door) => {
        const metadata = door.metadata as any;
        return !metadata?.isMainEntrance;
      });

      if (regularDoors.length > 0) {
        console.log(`\n   ℹ️  ${regularDoors.length} door(s) not marked as main entrance:`);
        regularDoors.forEach((door) => {
          console.log(`      - ${door.name} (ID: ${door.id})`);
        });
        console.log(
          '\n   To mark a door as main entrance, update its metadata:'
        );
        console.log(
          `   UPDATE "Door" SET metadata = '{"isMainEntrance": true}' WHERE id = '<door-id>';`
        );
      }

      console.log('');
    }

    console.log('✅ Main entrance access setup complete!\n');
  } catch (error) {
    console.error('❌ Error setting up main entrance access:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const tenantId = process.argv[2]; // Optional: pass tenant ID as argument
setupMainEntranceAccess(tenantId);
