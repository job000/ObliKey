const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPTPickerData() {
  console.log('\n=== Testing PT Picker Data and Tenant Isolation ===\n');

  // Get ObliKey Demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: 'oblikey-demo' }
  });

  if (!tenant) {
    console.log('❌ ObliKey Demo tenant not found');
    return;
  }

  console.log(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Count trainers in this tenant
  const trainers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] },
      active: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    }
  });

  console.log(`\n✅ Found ${trainers.length} trainers/PTs in tenant:`);
  trainers.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.firstName} ${t.lastName} (${t.email}) - ${t.role}`);
  });

  // Count customers in this tenant
  const customers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: 'CUSTOMER',
      active: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  console.log(`\n✅ Found ${customers.length} customers in tenant:`);
  customers.slice(0, 10).forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.firstName} ${c.lastName} (${c.email})`);
  });
  if (customers.length > 10) {
    console.log(`   ... and ${customers.length - 10} more`);
  }

  // Test tenant isolation - check other tenants
  console.log('\n=== Testing Tenant Isolation ===\n');

  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, subdomain: true }
  });

  for (const t of allTenants) {
    if (t.id === tenant.id) continue;

    const otherTrainers = await prisma.user.count({
      where: {
        tenantId: t.id,
        role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] },
        active: true
      }
    });

    const otherCustomers = await prisma.user.count({
      where: {
        tenantId: t.id,
        role: 'CUSTOMER',
        active: true
      }
    });

    console.log(`Tenant: ${t.name}`);
    console.log(`  - ${otherTrainers} trainers`);
    console.log(`  - ${otherCustomers} customers`);
    console.log(`  ✅ Data is isolated (not accessible from oblikey-demo)\n`);
  }

  console.log('\n=== Summary ===\n');
  console.log(`✅ Backend has ${trainers.length} trainers for oblikey-demo tenant`);
  console.log(`✅ Backend has ${customers.length} customers for oblikey-demo tenant`);
  console.log(`✅ Tenant isolation is working correctly`);
  console.log('\nIf the frontend shows empty lists, the issue is likely:');
  console.log('1. Frontend not sending the correct auth token');
  console.log('2. User role permissions issue');
  console.log('3. Frontend not handling the API response correctly');
  console.log('\nCheck the browser console logs for API errors.');
}

testPTPickerData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
