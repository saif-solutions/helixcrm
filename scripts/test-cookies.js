const https = require('https');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/login',
  method: 'POST',
  rejectUnauthorized: false, // Ignore self-signed certificate
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('Testing login endpoint for cookies...\n');

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nResponse body (first 200 chars):', data.substring(0, 200));
    
    // Check for cookies
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      console.log('\n✅ SUCCESS: Found', cookies.length, 'Set-Cookie header(s)');
      cookies.forEach((cookie, i) => {
        console.log(`  ${i + 1}. ${cookie.split(';')[0]}`);
      });
    } else {
      console.log('\n❌ FAILURE: No Set-Cookie headers found');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(JSON.stringify({
  email: 'admin@helixcrm.test',
  password: 'Admin123!'
}));

req.end();
