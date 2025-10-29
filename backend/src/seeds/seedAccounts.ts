/**
 * Seed script to populate Norwegian chart of accounts for tenants
 */

import { PrismaClient } from '@prisma/client';
import { norwegianChartOfAccounts } from './norwegianChartOfAccounts';

const prisma = new PrismaClient();

export async function seedAccountsForTenant(tenantId: string): Promise<void> {
  console.log(`Seeding accounts for tenant: ${tenantId}`);

  for (const accountTemplate of norwegianChartOfAccounts) {
    // Check if account already exists
    const existing = await prisma.account.findFirst({
      where: {
        tenantId,
        accountNumber: accountTemplate.accountNumber
      }
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          tenantId,
          accountNumber: accountTemplate.accountNumber,
          name: accountTemplate.name,
          type: accountTemplate.type,
          vatCode: accountTemplate.vatCode,
          description: accountTemplate.description,
          active: true
        }
      });
      console.log(`Created account: ${accountTemplate.accountNumber} - ${accountTemplate.name}`);
    } else {
      console.log(`Account ${accountTemplate.accountNumber} already exists, skipping...`);
    }
  }

  console.log(`Successfully seeded ${norwegianChartOfAccounts.length} accounts for tenant ${tenantId}`);
}

/**
 * Seed accounts for all active tenants
 */
export async function seedAccountsForAllTenants(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { active: true }
  });

  console.log(`Found ${tenants.length} active tenants`);

  for (const tenant of tenants) {
    await seedAccountsForTenant(tenant.id);
  }

  console.log('Finished seeding accounts for all tenants');
}

// Run if executed directly
if (require.main === module) {
  seedAccountsForAllTenants()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
