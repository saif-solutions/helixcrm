// Mock for BullMQ
export const Queue = jest.fn().mockImplementation(() => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
}));

export const Worker = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
}));

export const Job = jest.fn().mockImplementation(() => ({
  id: 'mock-job-id',
  data: {},
  progress: jest.fn(),
  log: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn(),
}));

export const QueueEvents = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
}));

export default {
  Queue,
  Worker,
  Job,
  QueueEvents,
};
