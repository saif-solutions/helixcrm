import { prismaMock, jwtMock, configMock, reflectorMock, loggerMock } from './__mocks__/global-mocks';

// Auto-mock PrismaService
jest.mock('@api/shared/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => prismaMock),
}));

// Auto-mock JwtService
jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => jwtMock),
  JwtModule: {
    register: jest.fn().mockReturnValue({
      module: class JwtModule {},
      providers: [],
    }),
  },
}));

// Auto-mock ConfigService
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => configMock),
  ConfigModule: {
    forRoot: jest.fn().mockReturnValue({
      module: class ConfigModule {},
      providers: [],
    }),
  },
}));

// Auto-mock Reflector
jest.mock('@nestjs/core', () => ({
  ...jest.requireActual('@nestjs/core'),
  Reflector: jest.fn().mockImplementation(() => reflectorMock),
}));

// Auto-mock BullMQ if you use it
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: jest.fn(),
  Processor: jest.fn(),
  Process: jest.fn(),
  BullModule: {
    registerQueue: jest.fn().mockReturnValue({
      module: class BullModule {},
      providers: [],
    }),
  },
}));

// Auto-mock Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => loggerMock),
}));

// Global beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  reflectorMock.getAllAndOverride.mockReturnValue(false);
});

// Global afterEach
afterEach(() => {
  // Optional: Add cleanup logic here
});