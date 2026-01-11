// Debug CSRF token validation
const fetch = require('node-fetch');

async function debugCsrf() {
  console.log('Ì¥ç Debugging CSRF token validation...\n');
  
  // 1. Get CSRF token
  console.log('1. Fetching CSRF token...');
  const csrfRes = await fetch('http://localhost:3001/api/v1/auth/csrf-token', {
    credentials: 'include'
  });
  const csrfData = await csrfRes.json();
  console.log('   Token:', csrfData.csrfToken?.substring(0, 20) + '...');
  console.log('   Cookies from response:', csrfRes.headers.get('set-cookie'));
  
  // 2. Try to use it
  console.log('\n2. Testing CSRF token with POST...');
  const postRes = await fetch('http://localhost:3001/api/v1/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfData.csrfToken,
    },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User', 
      email: 'test@test.com'
    }),
    credentials: 'include'
  });
  
  console.log('   Status:', postRes.status);
  const postData = await postRes.text();
  console.log('   Response:', postData.substring(0, 200));
  
  // 3. Check what cookies are being sent
  console.log('\n3. Checking cookie requirements...');
  console.log('   Note: The CSRF middleware might require:');
  console.log('   - _csrf cookie from initial request');
  console.log('   - X-CSRF-Token header to match cookie value');
  console.log('   - Both must be present and match');
}

debugCsrf().catch(console.error);
