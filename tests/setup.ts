// test/setup.ts
import { jest, beforeEach, expect } from '@jest/globals';
import './mocks/bullmq.mock';
import './mocks/csrf.mock';

import './mocks/compliance.mock'; // Add this line

// Increase timeout for all tests
jest.setTimeout(60000);

// Global beforeEach - clear all mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
