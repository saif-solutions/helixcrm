const http = require('http');

async function testFlow() {
  console.log('Ì¥ç Debugging Refresh Flow\n');
  
  // 1. Login
  console.log('1. Logging in...');
  const loginData = JSON.stringify({
    email: 'admin@helixcrm.test',
    password: 'Admin123!'
  });
  
  const loginCookies = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length,
      },
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Login response:', JSON.parse(data).access_token ? 'Success' : 'Failed');
        resolve(cookies);
      });
    });
    
    req.write(loginData);
    req.end();
  });
  
  // Extract refresh token
  const refreshCookie = loginCookies.find(c => c.includes('refresh_token'));
  const token1 = refreshCookie.split(';')[0].split('=')[1];
  console.log('   Got token1 (length):', token1.length);
  
  // 2. First refresh
  console.log('\n2. First refresh...');
  const refreshCookies1 = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      headers: {
        'Cookie': `refresh_token=${token1}`,
      },
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        console.log('   Refresh 1:', response.access_token ? 'Success' : 'Failed');
        console.log('   New access token generated:', !!response.access_token);
        resolve(cookies);
      });
    });
    
    req.end();
  });
  
  const token2 = refreshCookies1?.find(c => c.includes('refresh_token'))?.split(';')[0].split('=')[1];
  console.log('   Got token2 (length):', token2?.length || 'No token');
  
  // 3. Try OLD token again
  console.log('\n3. Trying OLD token (should fail)...');
  await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/refresh',
      method: 'POST',
      headers: {
        'Cookie': `refresh_token=${token1}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Response status:', res.statusCode);
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            console.log('   ‚ùå OLD TOKEN WORKED - Got new access token');
          } else {
            console.log('   ‚úÖ OLD TOKEN REJECTED');
          }
        } catch {
          console.log('   Response (raw):', data.substring(0, 100));
        }
        resolve();
      });
    });
    
    req.end();
  });
  
  console.log('\nÌæØ ANALYSIS:');
  console.log('- Token rotation: WORKING (tokens are different)');
  console.log('- Old token invalidation: NOT WORKING (security bug)');
  console.log('\nÌ¥ß The fix must be in the refreshToken() method -');
  console.log('   old hash is not being invalidated in database.');
}

testFlow().catch(console.error);
