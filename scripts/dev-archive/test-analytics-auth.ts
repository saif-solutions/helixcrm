import * as request from 'supertest';

const API_URL = 'http://localhost:3001/api/v1';

async function testAnalyticsWithAuth() {
  console.log('🔐 Testing Analytics with Authentication...\n');

  // Step 1: Login to get token
  console.log('1. Logging in...');
  const loginRes = await request(API_URL)
    .post('/auth/login')
    .send({
      email: 'admin@example.com', // Use your test user
      password: 'password123',
    })
    .set('Accept', 'application/json');

  if (loginRes.status !== 201) {
    console.log('❌ Login failed. Please ensure test user exists.');
    console.log('Response:', loginRes.body);
    return;
  }

  const token = loginRes.body.access_token;
  console.log('✅ Login successful\n');

  // Step 2: Test each analytics endpoint
  const endpoints = [
    { name: 'Deals Analytics', path: '/analytics/deals' },
    { name: 'Revenue Analytics', path: '/analytics/revenue' },
    { name: 'Pipeline Analytics', path: '/analytics/pipeline' },
    { name: 'Activity Analytics', path: '/analytics/activity' },
    { name: 'Export Analytics', path: '/analytics/export' },
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}...`);

    try {
      const res = await request(API_URL)
        .get(endpoint.path)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json');

      console.log(`  Status: ${res.status}`);

      if (res.status === 200) {
        console.log(`  ✅ ${endpoint.name} - SUCCESS`);
        console.log(`  Response keys: ${Object.keys(res.body).join(', ')}\n`);
      } else if (res.status === 403) {
        console.log(
          `  ⚠️  ${endpoint.name} - Permission denied (missing analytics.read permission)\n`,
        );
      } else {
        console.log(`  ❌ ${endpoint.name} - Unexpected status: ${res.status}`);
        console.log(`  Response: ${JSON.stringify(res.body, null, 2)}\n`);
      }
    } catch (error) {
      console.log(`  ❌ ${endpoint.name} - Error: ${error.message}\n`);
    }
  }

  console.log('🎯 Analytics Module Test Complete!');
}

// Run the test
testAnalyticsWithAuth().catch(console.error);
