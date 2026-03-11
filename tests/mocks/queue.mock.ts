import { jest } from '@jest/globals';

export type JobCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

export class MockJob {
  id: string;
  data: any;
  progressValue: number = 0; // Renamed from 'progress' to avoid conflict
  returnvalue: any = null;
  failedReason: string | null = null;
  timestamp: number = Date.now();
  processedOn: number = Date.now();
  finishedOn: number | null = null;

  constructor(data?: any, id?: string) {
    this.data = data;
    this.id = id || `mock-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getState = jest.fn(async (): Promise<string | undefined> => 'completed');
  update = jest.fn(async (data: any): Promise<void> => {
    this.data = { ...this.data, ...data };
  });
  remove = jest.fn(async (): Promise<void> => {});
  retry = jest.fn(async (): Promise<void> => {});
  discard = jest.fn(async (): Promise<void> => {});
  promote = jest.fn(async (): Promise<void> => {});

  // Renamed method to avoid conflict with property
  updateProgress = jest.fn(async (value?: number): Promise<number> => {
    if (value !== undefined) this.progressValue = value;
    return this.progressValue;
  });
}

export class QueueMock {
  // Store jobs for retrieval
  private jobs: Map<string, MockJob> = new Map();

  // Job adding
  add = jest.fn(async (data: any, opts?: any): Promise<MockJob> => {
    const job = new MockJob(data);
    this.jobs.set(job.id, job);
    return job;
  });

  addBulk = jest.fn(async (jobs: Array<{ data: any; opts?: any }>): Promise<MockJob[]> => {
    const createdJobs = jobs.map((job) => new MockJob(job.data));
    createdJobs.forEach((job) => this.jobs.set(job.id, job));
    return createdJobs;
  });

  // Job retrieval
  getJob = jest.fn(async (id: string): Promise<MockJob | null> => this.jobs.get(id) || null);

  getJobs = jest.fn(async (): Promise<MockJob[]> => Array.from(this.jobs.values()));
  getCompleted = jest.fn(async (): Promise<MockJob[]> => []);
  getFailed = jest.fn(async (): Promise<MockJob[]> => []);
  getWaiting = jest.fn(async (): Promise<MockJob[]> => []);
  getActive = jest.fn(async (): Promise<MockJob[]> => []);
  getDelayed = jest.fn(async (): Promise<MockJob[]> => []);

  // Queue control
  pause = jest.fn(async (): Promise<void> => {});
  resume = jest.fn(async (): Promise<void> => {});
  isPaused = jest.fn(async (): Promise<boolean> => false);

  clean = jest.fn(async (): Promise<void> => {});
  empty = jest.fn(async (): Promise<void> => {
    this.jobs.clear();
  });
  close = jest.fn(async (): Promise<void> => {});

  // Event handling
  on = jest.fn();
  once = jest.fn();
  emit = jest.fn();

  process = jest.fn();

  // Job counts
  getJobCounts = jest.fn(
    async (): Promise<JobCounts> => ({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
  );
}

// Queue names constants
export const QUEUE_NAMES = {
  EXPORT: 'export',
  WEBHOOK: 'webhook',
  AUDIT: 'audit',
  EMAIL: 'email',
  CLEANUP: 'cleanup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
