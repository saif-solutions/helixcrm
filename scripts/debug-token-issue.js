const axios = require('axios');
const https = require('https');

const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function debugTokenRotation() {
  console.log('Ì¥ç Debugging Token Rotation Issue');
  
  // 1. Login
  console.log('\n1. Logging in...');
  const loginRes = await axios.post('https://localhost:3001/api/auth/login', {
    email: 'admin@helixcrm.test',
    password: 'password123'
  }, { httpsAgent: agent });
  
  const firstRefreshToken = loginRes.headers['set-cookie']
    .find(c => c.includes('refresh_token'))
    .split(';')[0]
    .split('=')[1];
  
  console.log('First refresh token obtained');
  
  // 2. First refresh
  console.log('\n2. First refresh...');
  const refreshRes = await axios.post('https://localhost:3001/api/auth/refresh', 
    {},
    {
      httpsAgent: agent,
      headers: {
        Cookie: `refresh_token=${firstRefreshToken}`
      }
    }
  );
  
  const secondRefreshToken = refreshRes.headers['set-cookie']
    .find(c => c.includes('refresh_token'))
    .split(';')[0]
    .split('=')[1];
  
  console.log('Second refresh token obtained');
  
  // 3. Try old token
  console.log('\n3. Trying OLD token...');
  try {
    const oldTokenRes = await axios.post('https://localhost:3001/api/auth/refresh', 
      {},
      {
        httpsAgent: agent,
        headers: {
          Cookie: `refresh_token=${firstRefreshToken}`
        }
      }
    );
    console.log('‚ùå OLD TOKEN STILL WORKS! Response:', oldTokenRes.status);
    console.log('Response data:', JSON.stringify(oldTokenRes.data, null, 2));
  } catch (error) {
    console.log('‚úÖ OLD TOKEN REJECTED! Error:', error.response?.status, error.response?.data?.message);
  }
  
  // 4. Try new token
  console.log('\n4. Trying NEW token...');
  try {
    const newTokenRes = await axios.post('https://localhost:3001/api/auth/refresh', 
      {},
      {
        httpsAgent: agent,
        headers: {
          Cookie: `refresh_token=${secondRefreshToken}`
        }
      }
    );
    console.log('‚úÖ NEW TOKEN WORKS! Response:', newTokenRes.status);
  } catch (error) {
    console.log('‚ùå NEW TOKEN FAILED! Error:', error.response?.status);
  }
}

debugTokenRotation().catch(console.error);
