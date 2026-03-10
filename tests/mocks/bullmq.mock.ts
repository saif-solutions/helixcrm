// test/mocks/bullmq.mock.ts
import { jest } from '@jest/globals';

// Simple mock queue object with proper type assertions
export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' } as never),
  addBulk: jest.fn().mockResolvedValue([{ id: 'mock-job-id-1' }, { id: 'mock-job-id-2' }] as never),
  getJob: jest.fn().mockResolvedValue(null as never),
  getJobs: jest.fn().mockResolvedValue([] as never),
  getCompleted: jest.fn().mockResolvedValue([] as never),
  getFailed: jest.fn().mockResolvedValue([] as never),
  getWaiting: jest.fn().mockResolvedValue([] as never),
  getActive: jest.fn().mockResolvedValue([] as never),
  getDelayed: jest.fn().mockResolvedValue([] as never),
  pause: jest.fn().mockResolvedValue(undefined as never),
  resume: jest.fn().mockResolvedValue(undefined as never),
  isPaused: jest.fn().mockResolvedValue(false as never),
  clean: jest.fn().mockResolvedValue([] as never),
  empty: jest.fn().mockResolvedValue(undefined as never),
  close: jest.fn().mockResolvedValue(undefined as never),
  on: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
  process: jest.fn(),
  getJobCounts: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  } as never),
};

export const mockWorker = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined as never),
};

export const mockQueueEvents = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined as never),
};

// Mock the bullmq module
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => mockQueue),
  Worker: jest.fn().mockImplementation(() => mockWorker),
  QueueEvents: jest.fn().mockImplementation(() => mockQueueEvents),
  QueueScheduler: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined as never),
  })),
}));