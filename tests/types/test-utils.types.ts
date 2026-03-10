/// <reference types="jest" />
/// <reference types="node" />

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createMockAuthCoreAdapter } from '../mocks/auth.mock';

// Use actual Prisma Client types instead of manual mocks
type PrismaModels = {
  [K in keyof PrismaClient]: PrismaClient[K] extends (...args: any[]) => any
    ? never
    : K;
}[keyof PrismaClient];

type ModelOperations = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

export type MockPrismaClient = {
  [key in PrismaModels]: ModelOperations;
} & {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $on: jest.Mock;
  $use: jest.Mock;
};

export interface TestApp extends INestApplication {
  mockPrisma: MockPrismaClient;
  mockAuth: ReturnType<typeof createMockAuthCoreAdapter>;
  cleanup: () => Promise<void>;
}

// Export factory function types
export type MockAuthCoreAdapter = {
  authCore: {
    issueAccessToken: jest.Mock<Promise<string>, []>;
  };
  tokenManager: {
    issueRefreshToken: jest.Mock<Promise<string>, []>;
    validateRefreshToken: jest.Mock<Promise<{ sub: string; jti: string }>, []>;
  };
  password: {
    verify: jest.Mock<Promise<boolean>, []>;
    hash: jest.Mock<Promise<string>, []>;
    compare: jest.Mock<Promise<boolean>, []>;
  };
  withTransaction: jest.Mock;
  tokenRepository: {
    invalidateRefreshToken: jest.Mock<Promise<void>, []>;
    saveRefreshToken: jest.Mock<Promise<void>, []>;
  };
  userRepository: {
    findById: jest.Mock<Promise<{ id: string; email: string; tokenVersion: number }>, [string]>;
  };
};