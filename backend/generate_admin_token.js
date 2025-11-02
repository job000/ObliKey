const jwt = require('jsonwebtoken');

// Use the actual JWT_SECRET from .env
const JWT_SECRET = 'i9s4mfXmrJqydlJpducVcLfCWL0pe7JL';
const JWT_EXPIRES_IN = '7d';

// Generate token for the admin user
const payload = {
  userId: '1cbbbc6a-1ea1-43df-a7dd-1eb1cc1dec4f',
  tenantId: 'otico-demo',
  email: 'nybruker1@test.no',
  role: 'ADMIN'  // Changed from CUSTOMER to ADMIN
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

console.log('🔑 Generated Admin Token:');
console.log(token);
console.log('\n📋 Token Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n✅ Use this token in your tests!');
