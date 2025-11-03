require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin user for testing
const adminToken = jwt.sign(
  {
    userId: 'c902309a-a771-423e-8781-8635522a5c91',
    tenantId: 'b79f1c2a-7b12-4ded-a6f8-df327d4bf10c',
    email: 'admin2@test.no',
    role: 'ADMIN'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// Customer user for testing
const customerToken = jwt.sign(
  {
    userId: 'd53ee317-0c8c-43e5-a4c2-409ab5880aff',
    tenantId: 'b79f1c2a-7b12-4ded-a6f8-df327d4bf10c',
    email: 'testkunde@oblikey.no',
    role: 'CUSTOMER'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('=== Test Tokens ===\n');
console.log('ADMIN Token (admin2@test.no):');
console.log(adminToken);
console.log('\nCUSTOMER Token (testkunde@oblikey.no):');
console.log(customerToken);
