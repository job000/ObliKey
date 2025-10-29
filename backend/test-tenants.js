const axios = require('axios');

async function testTenants() {
  try {
    // Step 1: Login as SUPER_ADMIN
    console.log('\n=== Step 1: Logging in as SUPER_ADMIN ===\n');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'superadmin@oblikey.no',
      password: 'SuperAdmin123',
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!');
    console.log('Token:', token.substring(0, 50) + '...\n');

    // Step 2: Get all tenants
    console.log('=== Step 2: Getting all tenants ===\n');
    const tenantsResponse = await axios.get('http://localhost:3000/api/super-admin/tenants', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ GET /api/super-admin/tenants successful!');
    console.log('Status:', tenantsResponse.status);
    console.log('Total tenants:', tenantsResponse.data.data.length);
    console.log('\nTenants:');
    tenantsResponse.data.data.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.subdomain}) - Active: ${tenant.active}`);
    });

    // Step 3: Create a new tenant
    console.log('\n=== Step 3: Creating a new tenant ===\n');
    const newTenantData = {
      name: 'Test Gym',
      subdomain: 'test-gym-' + Date.now(),
      email: 'test@testgym.no',
      phone: '+47 123 45 678',
      address: 'Test Street 123\n0123 Oslo',
      active: true,
    };

    console.log('Creating tenant with data:', JSON.stringify(newTenantData, null, 2));

    const createResponse = await axios.post(
      'http://localhost:3000/api/super-admin/tenants',
      newTenantData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ CREATE tenant successful!');
    console.log('Status:', createResponse.status);
    console.log('Created tenant:', createResponse.data.data.name);
    console.log('Tenant ID:', createResponse.data.data.id);
    console.log('Active:', createResponse.data.data.active);

    // Step 4: Get all tenants again to verify
    console.log('\n=== Step 4: Getting all tenants again ===\n');
    const tenantsResponse2 = await axios.get('http://localhost:3000/api/super-admin/tenants', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Total tenants now:', tenantsResponse2.data.data.length);
    console.log('\nAll tenants:');
    tenantsResponse2.data.data.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.subdomain}) - Active: ${tenant.active}`);
    });

    console.log('\n=== ✅ ALL TESTS PASSED! ===\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED!\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testTenants();
