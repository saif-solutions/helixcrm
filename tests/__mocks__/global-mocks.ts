// import { mockDeep } from 'jest-mock-extended';

// ==================== PRISMA MOCK ====================

// Define Prisma mock type
export type PrismaMockType = {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  organization: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  deal: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  lead: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  contact: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  pipeline: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  pipelineStage: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  auditLog: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

// Create Prisma mock with all methods your app uses
export const prismaMock: PrismaMockType = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  deal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  lead: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  pipeline: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  pipelineStage: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// ==================== JWT MOCK ====================

export const jwtMock = {
  verifyAsync: jest.fn(),
  signAsync: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn(),
  verify: jest.fn(),
};

// ==================== CONFIG MOCK ====================

export const configMock = {
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_AUDIENCE: 'helix-crm',
      JWT_ISSUER: 'helix-crm',
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/helix_test',
      REDIS_URL: 'redis://localhost:6379',
    };
    return config[key];
  }),
  getOrThrow: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_AUDIENCE: 'helix-crm',
      JWT_ISSUER: 'helix-crm',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/helix_test',
    };
    if (!config[key]) throw new Error(`Config key ${key} not found`);
    return config[key];
  }),
};

// ==================== REFLECTOR MOCK ====================

export const reflectorMock = {
  getAllAndOverride: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
};

// ==================== LOGGER MOCK ====================

export const loggerMock = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

// ==================== QUEUE MOCK (BullMQ) ====================

export const queueMock = {
  add: jest.fn(),
  addBulk: jest.fn(),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  remove: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  count: jest.fn(),
  empty: jest.fn(),
  isPaused: jest.fn(),
  on: jest.fn(),
  process: jest.fn(),
};

// ==================== REDIS MOCK ====================

export const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  pipeline: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
  }),
};

// ==================== EMAIL SERVICE MOCK ====================

export const emailServiceMock = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  sendTemplate: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  verifyConnection: jest.fn().mockResolvedValue(true),
};

// ==================== FILE STORAGE MOCK ====================

export const fileStorageMock = {
  upload: jest.fn().mockResolvedValue({ url: 'https://test.com/file.pdf' }),
  download: jest.fn().mockResolvedValue(Buffer.from('test')),
  delete: jest.fn().mockResolvedValue(true),
  getSignedUrl: jest.fn().mockResolvedValue('https://test.com/signed-url'),
};

// ==================== CACHE MANAGER MOCK ====================

export const cacheManagerMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
  wrap: jest.fn(),
};

// ==================== HELPER FUNCTIONS ====================

// Reset all mocks to default state
export function resetAllMocks() {
  jest.clearAllMocks();
  
  // Reset reflector to default behavior
  reflectorMock.getAllAndOverride.mockReturnValue(false);
  
  // Reset config to default values
  configMock.get.mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_AUDIENCE: 'helix-crm',
      JWT_ISSUER: 'helix-crm',
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/helix_test',
      REDIS_URL: 'redis://localhost:6379',
    };
    return config[key];
  });
}

// Reset only auth-related mocks
export function resetAuthMocks() {
  jest.clearAllMocks();
  jwtMock.verifyAsync.mockReset();
  jwtMock.signAsync.mockReset();
  jwtMock.sign.mockReset();
  jwtMock.decode.mockReset();
  jwtMock.verify.mockReset();
  reflectorMock.getAllAndOverride.mockReturnValue(false);
}

// Reset only database mocks
export function resetDatabaseMocks() {
  jest.clearAllMocks();
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
}