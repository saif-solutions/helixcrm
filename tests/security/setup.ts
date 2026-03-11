// Security Test Setup
// Global setup for security invariant tests

// Import jest globals explicitly
import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';

// Global timeout for all tests
jest.setTimeout(30000);

// Global beforeAll hook
beforeAll(async () => {
  console.log('��� Starting security invariant tests...');
});

// Global afterAll hook
afterAll(async () => {
  console.log('✅ Security invariant tests completed.');
});

// Clean up after each test
afterEach(async () => {
  // Add any global cleanup logic here
});
