const axios = require('axios');

async function testLogin() {
  try {
    console.log('\n=== Testing SUPER_ADMIN Login ===\n');

    const loginData = {
      email: 'superadmin@oblikey.no',
      password: 'SuperAdmin123'
    };

    console.log('Sending request with data:', JSON.stringify(loginData, null, 2));
    console.log('URL: http://localhost:3000/api/auth/login\n');

    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ LOGIN SUCCESSFUL!\n');
    console.log('Status:', response.status);
    console.log('User:', response.data.data.user.email);
    console.log('Role:', response.data.data.user.role);
    console.log('Token:', response.data.data.token.substring(0, 50) + '...');

  } catch (error) {
    console.error('\n❌ LOGIN FAILED!\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
