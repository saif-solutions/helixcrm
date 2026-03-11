import 'reflect-metadata';
import { config } from 'dotenv';

// Load test environment variables
config({ path: 'apps/api/.env.test' });

// Only run Jest-specific code in test environment
if (typeof jest !== 'undefined') {
  // Set timeout
  jest.setTimeout(30000);

  // Mock console methods
  const originalConsole = { ...console };

  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Mock bullmq
  jest.mock('@nestjs/bullmq', () => ({
    getQueueToken: (name: string) => `QUEUE_${name}`,
    InjectQueue: () => () => {},
  }));
}

// Make sure this is treated as a module
export {};
