import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupMainEntrance() {
  try {
    const doorId = '7b817407-b715-4bf6-9948-ca065a8accae'; // Hovedinngangsdør

    // Get door
    const door = await prisma.door.findUnique({
      where: { id: doorId },
      include: { accessRules: true },
    });

    if (!door) {
      console.log('❌ Door not found');
      return;
    }

    console.log(`🚪 Setting up main entrance for: ${door.name}`);

    // Update metadata
    await prisma.door.update({
      where: { id: doorId },
      data: {
        metadata: {
          ...(door.metadata as any),
          isMainEntrance: true,
        },
      },
    });

    console.log('✓ Door metadata updated');

    // Check if auto-access rule exists
    const existingRule = await prisma.doorAccessRule.findFirst({
      where: {
        doorId,
        type: 'MEMBERSHIP',
        name: 'Automatic Access - Active Members',
      },
    });

    if (existingRule) {
      console.log('✓ Access rule already exists:', existingRule.id);
      if (!existingRule.active) {
        await prisma.doorAccessRule.update({
          where: { id: existingRule.id },
          data: { active: true },
        });
        console.log('✓ Access rule reactivated');
      }
    } else {
      const rule = await prisma.doorAccessRule.create({
        data: {
          tenantId: door.tenantId,
          doorId,
          name: 'Automatic Access - Active Members',
          description: 'Automatically grants access to all active members.',
          type: 'MEMBERSHIP',
          priority: 10,
          active: true,
          allowedMembershipStatuses: ['ACTIVE'],
          allowedRoles: [],
          allowedUserIds: [],
        },
      });
      console.log('✓ Access rule created:', rule.id);
    }

    console.log('\n✅ Main entrance setup complete!');
    console.log('All users with active memberships now have access to:', door.name);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupMainEntrance();
