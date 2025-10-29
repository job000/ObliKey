const axios = require('axios');

async function testFeatures() {
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

    // Step 2: Get all features
    console.log('=== Step 2: Getting all features ===\n');
    const featuresResponse = await axios.get('http://localhost:3000/api/super-admin/features', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ GET /api/super-admin/features successful!');
    console.log('Status:', featuresResponse.status);
    console.log('Total features:', featuresResponse.data.data.length);
    console.log('\nFeatures:');
    featuresResponse.data.data.forEach((feature, index) => {
      console.log(`  ${index + 1}. ${feature.name} (${feature.key}) - Active: ${feature.active}`);
    });

    // Step 3: Create a new feature
    console.log('\n=== Step 3: Creating a new feature ===\n');
    const newFeatureData = {
      name: 'Test Feature',
      key: 'test-feature-' + Date.now(),
      description: 'This is a test feature created by automation',
      category: 'CUSTOM', // Must be a valid FeatureCategory enum value
      active: true,
    };

    console.log('Creating feature with data:', JSON.stringify(newFeatureData, null, 2));

    const createFeatureResponse = await axios.post(
      'http://localhost:3000/api/super-admin/features',
      newFeatureData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ CREATE feature successful!');
    console.log('Status:', createFeatureResponse.status);
    console.log('Created feature:', createFeatureResponse.data.data.name);
    console.log('Feature ID:', createFeatureResponse.data.data.id);
    console.log('Feature key:', createFeatureResponse.data.data.key);

    const featureId = createFeatureResponse.data.data.id;

    // Step 4: Get all feature packs
    console.log('\n=== Step 4: Getting all feature packs ===\n');
    const packsResponse = await axios.get('http://localhost:3000/api/super-admin/feature-packs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ GET /api/super-admin/feature-packs successful!');
    console.log('Status:', packsResponse.status);
    console.log('Total feature packs:', packsResponse.data.data.length);

    // Step 5: Create a new feature pack
    console.log('\n=== Step 5: Creating a new feature pack ===\n');
    const newPackData = {
      name: 'Test Pack',
      slug: 'test-pack-' + Date.now(),
      description: 'This is a test feature pack',
      price: 199,
      currency: 'NOK',
      interval: 'MONTHLY',
      active: true,
      featureIds: [featureId], // Include the feature we just created
    };

    console.log('Creating feature pack with data:', JSON.stringify(newPackData, null, 2));

    const createPackResponse = await axios.post(
      'http://localhost:3000/api/super-admin/feature-packs',
      newPackData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ CREATE feature pack successful!');
    console.log('Status:', createPackResponse.status);
    console.log('Created pack:', createPackResponse.data.data.name);
    console.log('Pack ID:', createPackResponse.data.data.id);
    console.log('Pack slug:', createPackResponse.data.data.slug);
    console.log('Included features:', createPackResponse.data.data.features?.length || 0);

    // Step 6: Get all features again to verify
    console.log('\n=== Step 6: Getting all features again ===\n');
    const featuresResponse2 = await axios.get('http://localhost:3000/api/super-admin/features', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Total features now:', featuresResponse2.data.data.length);

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

testFeatures();
