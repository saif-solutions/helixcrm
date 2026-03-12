import { Test, TestingModule } from '@nestjs/testing';
import { AuthThrottlerGuard } from '../../../src/shared/guards/auth-throttler.guard';
import { ThrottlerStorage, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('AuthThrottlerGuard', () => {
  let guard: AuthThrottlerGuard;
  let mockStorageService: jest.Mocked<ThrottlerStorage>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  const mockOptions: ThrottlerModuleOptions = {
    ttl: 60,
    limit: 10,
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

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

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
    it('should return IP address for tracking', () => {
      // Access the protected method using any
      const tracker = (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should handle requests without IP', () => {
      mockRequest.ip = undefined;
      const tracker = (guard as any).getTracker(mockRequest);
      expect(tracker).toBeUndefined();
    });
  });

  describe('inheritance', () => {
    it('should extend ThrottlerGuard', () => {
      expect(guard).toBeInstanceOf(Object);
      expect(guard.constructor.name).toBe('AuthThrottlerGuard');
    });
  });
});
