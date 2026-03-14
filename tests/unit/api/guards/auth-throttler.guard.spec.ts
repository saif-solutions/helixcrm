import { Test, TestingModule } from '@nestjs/testing';
import { AuthThrottlerGuard } from '@api/shared/guards/auth-throttler.guard';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

describe('AuthThrottlerGuard', () => {
  let guard: AuthThrottlerGuard;
  let mockStorageService: jest.Mocked<ThrottlerStorage>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRequest: any;

  // Mock options for throttler
  const mockOptions = {
    throttlers: [
      {
        ttl: 60,
        limit: 10,
      },
    ],
  };

  beforeEach(async () => {
    mockStorageService = {
      getRecord: jest.fn(),
      addRecord: jest.fn(),
    } as any;

    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as any;

    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthThrottlerGuard,
          useFactory: () => {
            return new AuthThrottlerGuard(mockOptions, mockStorageService, mockReflector);
          },
        },
      ],
    }).compile();

    guard = module.get<AuthThrottlerGuard>(AuthThrottlerGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return IP address for tracking', async () => {
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should handle requests without IP', async () => {
      mockRequest.ip = undefined;
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('unknown');
    });

    it('should use user ID when available', async () => {
      mockRequest.user = { id: 'user-123' };
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('user:user-123');
    });

    it('should use user sub when id not available', async () => {
      mockRequest.user = { sub: 'user-123' };
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('user:user-123');
    });

    it('should fall back to IP when user has no ID', async () => {
      mockRequest.user = {};
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should use socket remoteAddress when ip is not available', async () => {
      mockRequest.ip = undefined;
      mockRequest.socket = { remoteAddress: '192.168.1.1' };
      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('192.168.1.1');
    });
  });

  describe('inheritance', () => {
    it('should extend ThrottlerGuard', () => {
      expect(guard).toBeInstanceOf(Object);
      expect(guard.constructor.name).toBe('AuthThrottlerGuard');
    });
  });
});