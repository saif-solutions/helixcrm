/// <reference types="jest" />
// test/utils/create-test-app.ts

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { AuditLogService } from '../../src/shared/audit-log/audit-log.service';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { createMockUser } from '../factories/user.factory';
import { AuthCoreAdapter } from '../../src/modules/auth/adapters/AuthCoreAdapter';

// -----------------------------
// Typed Prisma Mock
// -----------------------------
type ModelOperations<T = any> = {
  findUnique: jest.Mock<Promise<T | null>, [args: any]>;
  findFirst: jest.Mock<Promise<T | null>, [args: any]>;
  findMany: jest.Mock<Promise<T[]>, [args?: any]>;
  create: jest.Mock<Promise<T>, [args: any]>;
  update: jest.Mock<Promise<T>, [args: any]>;
  delete: jest.Mock<Promise<T>, [args: any]>;
  upsert: jest.Mock<Promise<T>, [args: any]>;
  count: jest.Mock<Promise<number>, [args?: any]>;
  aggregate: jest.Mock<Promise<any>, [args?: any]>;
  groupBy: jest.Mock<Promise<any>, [args?: any]>;
};

export type PrismaMock = {
  [modelName: string]: ModelOperations | jest.Mock;
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $on: jest.Mock;
  $use: jest.Mock;
  user: ModelOperations;
  organization: ModelOperations;
  permission: ModelOperations;
  role: ModelOperations;
  userRole: ModelOperations;
  rolePermission: ModelOperations;
};

export const createMockPrisma = (): PrismaMock => {
  const createOps = <T = any>(): ModelOperations<T> => ({
    findUnique: jest.fn<Promise<T | null>, [any]>(),
    findFirst: jest.fn<Promise<T | null>, [any]>(),
    findMany: jest.fn<Promise<T[]>, [any?]>(),
    create: jest.fn<Promise<T>, [any]>(),
    update: jest.fn<Promise<T>, [any]>(),
    delete: jest.fn<Promise<T>, [any]>(),
    upsert: jest.fn<Promise<T>, [any]>(),
    count: jest.fn<Promise<number>, [any?]>(),
    aggregate: jest.fn<Promise<any>, [any?]>(),
    groupBy: jest.fn<Promise<any>, [any?]>(),
  });

  const mock: PrismaMock = {
    $transaction: jest
      .fn()
      .mockImplementation(async (cb: any) =>
        typeof cb === 'function' ? cb(mock) : cb,
      ),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn(),
    user: createOps(),
    organization: createOps(),
    permission: createOps(),
    role: createOps(),
    userRole: createOps(),
    rolePermission: createOps(),
  };

  return new Proxy(mock, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof PrismaMock];
      target[prop] = createOps();
      return target[prop];
    },
  }) as PrismaMock;
};

// -----------------------------
// AuthCoreAdapter Mock
// -----------------------------
export const createMockAuthCoreAdapter = () => ({
  authCore: {
    issueAccessToken: jest
      .fn<Promise<string>, []>()
      .mockResolvedValue('mock-access-token'),
  },
  tokenManager: {
    issueRefreshToken: jest
      .fn<Promise<string>, []>()
      .mockResolvedValue('mock-refresh-token'),
    validateRefreshToken: jest
      .fn<Promise<{ sub: string; jti: string }>, []>()
      .mockResolvedValue({ sub: 'user-id', jti: 'mock-jti' }),
  },
  password: {
    verify: jest
      .fn<Promise<boolean>, [string, string]>()
      .mockImplementation(async (plain, hash) => plain === hash),
    hash: jest
      .fn<Promise<string>, [string]>()
      .mockResolvedValue('hashed-password'),
    compare: jest
      .fn<Promise<boolean>, [string, string]>()
      .mockImplementation(async (plain, hash) => plain === hash),
  },
  withTransaction: jest.fn().mockImplementation((cb: any) => cb()),
  tokenRepository: {
    invalidateRefreshToken: jest
      .fn<Promise<void>, []>()
      .mockResolvedValue(undefined),
    saveRefreshToken: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  },
  userRepository: {
    findById: jest
      .fn<
        Promise<{ id: string; email: string; tokenVersion: number }>,
        [string]
      >()
      .mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        tokenVersion: 1,
      }),
  },
});

// -----------------------------
// Test App Builder
// -----------------------------
interface CreateTestAppOptions {
  imports: any[];
  providers?: any[];
  overrideProviders?: Array<{ provide: any; useValue: any }>;
}

export async function createTestApp({
  imports,
  providers = [],
  overrideProviders = [],
}: CreateTestAppOptions): Promise<
  INestApplication & { mockPrisma: PrismaMock }
> {
  const mockPrisma = createMockPrisma();
  const mockAuth = createMockAuthCoreAdapter();

  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      ...imports,
    ],
    providers,
  });

  // Override core services
  moduleBuilder.overrideProvider(PrismaService).useValue(mockPrisma);
  moduleBuilder.overrideProvider(AuditLogService).useValue({
    logWithRequest: jest.fn().mockResolvedValue({ id: 'audit-test' }),
    logEvent: jest.fn().mockResolvedValue({ id: 'audit-test' }),
    logAuthEvent: jest.fn().mockResolvedValue({ id: 'audit-test' }),
    logDirect: jest.fn().mockResolvedValue({ id: 'audit-test' }),
    logWithRequestObject: jest.fn().mockResolvedValue({ id: 'audit-test' }),
  });

  // Try both the class and a string token to be safe
  moduleBuilder.overrideProvider(AuthCoreAdapter).useValue(mockAuth);
  // Also override by string if needed
  moduleBuilder.overrideProvider('AuthCoreAdapter').useValue(mockAuth);

  // Apply any additional overrides
  overrideProviders.forEach(({ provide, useValue }) => {
    moduleBuilder.overrideProvider(provide).useValue(useValue);
  });

  const moduleRef = await moduleBuilder.compile();
  const app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  (app as any).mockPrisma = mockPrisma;

  // -----------------------------
  // Dynamic user state for auth tests
  // -----------------------------
  let currentUser = createMockUser({ email: 'test@example.com' });
  let currentOrg = { id: 'org-123', name: 'Test Organization' };

  // User mocks
  mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => {
    if (where?.email === currentUser.email || where?.id === currentUser.id) {
      return currentUser;
    }
    return null;
  });

  mockPrisma.user.findFirst.mockImplementation(async ({ where }: any) => {
    if (where?.email === currentUser.email || where?.id === currentUser.id) {
      return currentUser;
    }
    return null;
  });

  mockPrisma.user.update.mockImplementation(async ({ where, data }: any) => {
    // Handle failed login attempts for lockout tests
    if (data?.failedLoginAttempts !== undefined) {
      if (data.failedLoginAttempts >= 5) {
        data.lockedUntil = new Date(Date.now() + 3600000);
      }
    }

    // Increment tokenVersion if password changed
    if (data?.passwordHash && data.passwordHash !== currentUser.passwordHash) {
      data.tokenVersion = (currentUser.tokenVersion || 1) + 1;
    }

    currentUser = { ...currentUser, ...data };
    return currentUser;
  });

  mockPrisma.user.create.mockImplementation(async ({ data }: any) => {
    currentUser = createMockUser(data);
    return currentUser;
  });

  // Organization mocks
  mockPrisma.organization.create.mockResolvedValue(currentOrg);
  mockPrisma.organization.findUnique.mockResolvedValue(currentOrg);
  mockPrisma.organization.findFirst.mockResolvedValue(currentOrg);

  // Permission mocks
  mockPrisma.permission.findMany.mockResolvedValue([]);
  mockPrisma.permission.upsert.mockImplementation(async ({ create }: any) => ({
    id: 'perm-' + Date.now(),
    ...create,
  }));

  // Role mocks
  mockPrisma.role.upsert.mockImplementation(async ({ create }: any) => ({
    id: 'role-' + Date.now(),
    ...create,
  }));

  mockPrisma.role.findFirst.mockImplementation(async ({ where }: any) => {
    if (where?.name === 'SystemAdmin') {
      return {
        id: 'role-admin',
        name: 'SystemAdmin',
        organizationId: currentOrg.id,
      };
    }
    return null;
  });

  // UserRole mocks
  mockPrisma.userRole.create.mockImplementation(async ({ data }: any) => ({
    id: 'userrole-' + Date.now(),
    ...data,
  }));

  // RolePermission mocks
  mockPrisma.rolePermission.upsert.mockImplementation(
    async ({ create }: any) => ({
      id: 'roleperm-' + Date.now(),
      ...create,
    }),
  );

  return app as INestApplication & { mockPrisma: PrismaMock };
}

// -----------------------------
// Helpers
// -----------------------------
export const testRequest = (app: INestApplication) =>
  request(app.getHttpServer());

export const closeApp = async (app?: INestApplication) => {
  if (app) await app.close();
};
