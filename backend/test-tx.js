const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

async function test() {
  try {
    const passwords = ['password123', 'admin123', 'Password123!', 'password'];
    let token = null;
    let headers = null;
    
    console.log('1. Logging in as johndoe@test.no...');
    for (const pwd of passwords) {
      try {
        const loginRes = await axios.post(API_URL + '/auth/login', {
          email: 'johndoe@test.no',
          password: pwd
        });
        token = loginRes.data.token;
        headers = { 'Authorization': 'Bearer ' + token };
        console.log('✓ Logged in successfully');
        break;
      } catch (e) {
        // Try next
      }
    }
    
    if (!token) {
      console.log('✗ Could not log in');
      return;
    }

    console.log('2. Getting accounts...');
    const accountsRes = await axios.get(API_URL + '/accounting/accounts', { headers });
    const accounts = accountsRes.data.data;
    console.log('✓ Found', accounts.length, 'accounts');
    
    if (accounts.length === 0) {
      console.log('✗ No accounts');
      return;
    }
    
    const account = accounts[0];
    console.log('  Using:', account.accountNumber, '-', account.name);

    console.log('3. Creating transaction...');
    const txData = {
      type: 'EXPENSE',
      accountId: account.id,
      description: 'Test expense - office supplies',
      amount: 1500.00,
      vatRate: 'RATE_25',
      transactionDate: new Date().toISOString()
    };
    const txRes = await axios.post(API_URL + '/accounting/transactions', txData, { headers });
    console.log('✓ Transaction created!');
    console.log('  ID:', txRes.data.data.id);
    console.log('  Amount:', txRes.data.data.amount);
    console.log('  VAT:', txRes.data.data.vatAmount);
    console.log('\n✅ Transaction creation test PASSED!');
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}
test();
