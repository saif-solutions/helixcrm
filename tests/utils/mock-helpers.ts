// test/utils/mock-helpers.ts
import { jest } from '@jest/globals';

/**
 * Helper to create a mock function that returns a resolved promise with undefined
 * Eliminates 80% of Jest typing pain
 */
export const MockFn = () => jest.fn().mockImplementation(() => Promise.resolve(undefined));

/**
 * Helper to create a mock function that returns a resolved promise with a value
 */
export const MockResolved = <T>(value: T) =>
  jest.fn().mockImplementation(() => Promise.resolve(value));

/**
 * Helper to create a mock function that returns a rejected promise
 */
export const MockRejected = (error: Error) =>
  jest.fn().mockImplementation(() => Promise.reject(error));

/**
 * Helper to create a mock queue service with all required methods
 */
export const createMockQueue = () => ({
  add: MockResolved({ id: 'mock-job-id' }),
  addBulk: MockResolved([]),
  getJob: MockResolved(null),
  getJobs: MockResolved([]),
  getJobCounts: MockResolved({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  }),
  pause: MockFn(),
  resume: MockFn(),
  isPaused: MockResolved(false),
  clean: MockResolved([]),
  empty: MockFn(),
  close: MockFn(),
  on: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
  process: jest.fn(),
});

/**
 * Helper to create a mock audit log service
 */
export const createMockAuditLogService = () => ({
  logWithRequest: MockResolved({ id: 'audit-test' }),
  logEvent: MockResolved({ id: 'audit-test' }),
  logAuthEvent: MockResolved({ id: 'audit-test' }),
  logDirect: MockResolved({ id: 'audit-test' }),
  logWithRequestObject: MockResolved({ id: 'audit-test' }),
});
