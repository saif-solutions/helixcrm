// test/auth-test.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { jest } from '@jest/globals';

import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { AuthCoreAdapter } from '../src/modules/auth/adapters/AuthCoreAdapter';
import { AccountLockoutService } from '../src/modules/auth/services/account-lockout.service';

// Simple mock with mockImplementation for all async methods
const mockQueueService = {
  add: jest.fn().mockImplementation(() => Promise.resolve({ id: 'mock-job-id' })),
  addBulk: jest.fn().mockImplementation(() => Promise.resolve([])),
  getJob: jest.fn().mockImplementation(() => Promise.resolve(null)),
  getJobs: jest.fn().mockImplementation(() => Promise.resolve([])),
  getJobCounts: jest.fn().mockImplementation(() =>
    Promise.resolve({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
  ),
  pause: jest.fn().mockImplementation(() => Promise.resolve()),
  resume: jest.fn().mockImplementation(() => Promise.resolve()),
  isPaused: jest.fn().mockImplementation(() => Promise.resolve(false)),
  clean: jest.fn().mockImplementation(() => Promise.resolve([])),
  empty: jest.fn().mockImplementation(() => Promise.resolve()),
  close: jest.fn().mockImplementation(() => Promise.resolve()),
  on: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
  process: jest.fn(),
};

// Mock AuthCoreAdapter with mockImplementation
const mockAuthCoreAdapter = {
  authCore: {
    issueAccessToken: jest.fn().mockImplementation(() => Promise.resolve('mock-access-token')),
  },
  tokenManager: {
    issueRefreshToken: jest.fn().mockImplementation(() => Promise.resolve('mock-refresh-token')),
    validateRefreshToken: jest.fn().mockImplementation(() => ({ sub: 'user-id', jti: 'mock-jti' })),
  },
  password: {
    verify: jest.fn().mockImplementation(() => Promise.resolve(true)),
    hash: jest.fn().mockImplementation(() => Promise.resolve('hashed-password')),
    compare: jest.fn().mockImplementation(() => Promise.resolve(true)),
  },
  withTransaction: jest.fn().mockImplementation((callback: any) => callback()),
  tokenRepository: {
    invalidateRefreshToken: jest.fn().mockImplementation(() => Promise.resolve()),
    saveRefreshToken: jest.fn().mockImplementation(() => Promise.resolve()),
  },
  userRepository: {
    findById: jest
      .fn()
      .mockImplementation(() => Promise.resolve({ id: 'user-id', email: 'test@example.com' })),
  },
};

// Mock all possible queue tokens
const queueTokens = [
  'audit-queue',
  'export-queue',
  'webhook-queue',
  'email-queue',
  'compliance-queue',
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          JWT_SECRET: 'test-secret-key-min-32-chars-long-here-123',
          JWT_REFRESH_SECRET: 'test-refresh-secret-key-min-32-chars-long-here-123',
          JWT_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
          NODE_ENV: 'test',
          BCRYPT_SALT_ROUNDS: 10,
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
        }),
      ],
    }),
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Mock AuthCoreAdapter
    {
      provide: AuthCoreAdapter,
      useValue: mockAuthCoreAdapter,
    },
    // Mock all queue providers
    ...queueTokens.map((token) => ({
      provide: token,
      useValue: mockQueueService,
    })),
    // Mock BullMQ specific tokens
    {
      provide: 'BullQueue_audit',
      useValue: mockQueueService,
    },
    {
      provide: 'BullQueue_export',
      useValue: mockQueueService,
    },
    {
      provide: 'BullQueue_webhook',
      useValue: mockQueueService,
    },
    // Mock AccountLockoutService - using mockImplementation to avoid type issues
    {
      provide: AccountLockoutService,
      useValue: {
        isAccountLocked: jest.fn().mockImplementation(() =>
          Promise.resolve({
            isLocked: false,
            lockedUntil: null,
          }),
        ),
        recordFailedAttempt: jest.fn().mockImplementation(() => Promise.resolve()),
        resetFailedAttempts: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    },
  ],
})
export class AuthTestModule {}
