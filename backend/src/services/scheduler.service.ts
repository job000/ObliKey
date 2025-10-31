import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Automatically unfreeze memberships when their freeze end date has passed
 */
async function autoUnfreezeMemberships() {
  try {
    console.log('[Scheduler] Running auto-unfreeze task...');

    const now = new Date();

    // Find all frozen memberships with freeze records that have passed their end date
    const expiredFreezes = await prisma.membershipFreeze.findMany({
      where: {
        endDate: {
          lte: now // End date is less than or equal to now
        },
        membership: {
          status: 'FROZEN'
        }
      },
      include: {
        membership: true
      }
    });

    console.log(`[Scheduler] Found ${expiredFreezes.length} expired freezes to process`);

    for (const freeze of expiredFreezes) {
      try {
        // Unfreeze the membership
        await prisma.membership.update({
          where: { id: freeze.membershipId },
          data: {
            status: 'ACTIVE'
          }
        });

        console.log(`[Scheduler] Auto-unfroze membership ${freeze.membershipId}`);
      } catch (error) {
        console.error(`[Scheduler] Error auto-unfreezing membership ${freeze.membershipId}:`, error);
      }
    }

    console.log('[Scheduler] Auto-unfreeze task completed');
  } catch (error) {
    console.error('[Scheduler] Error in auto-unfreeze task:', error);
  }
}

/**
 * Initialize all scheduled tasks
 */
export function initScheduler() {
  console.log('[Scheduler] Initializing scheduled tasks...');

  // Run auto-unfreeze every hour at minute 0
  // Cron pattern: '0 * * * *' means "at minute 0 of every hour"
  cron.schedule('0 * * * *', async () => {
    await autoUnfreezeMemberships();
  });

  // Also run every 15 minutes for more responsive unfreezing
  // Cron pattern: '*/15 * * * *' means "every 15 minutes"
  cron.schedule('*/15 * * * *', async () => {
    await autoUnfreezeMemberships();
  });

  console.log('[Scheduler] Scheduled tasks initialized:');
  console.log('  - Auto-unfreeze: Every 15 minutes');

  // Run once on startup to catch any that should have been unfrozen while server was down
  setTimeout(async () => {
    console.log('[Scheduler] Running initial auto-unfreeze check...');
    await autoUnfreezeMemberships();
  }, 5000); // Wait 5 seconds after startup
}
