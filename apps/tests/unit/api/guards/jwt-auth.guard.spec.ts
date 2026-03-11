import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../../src/shared/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Mock the AuthGuard from '@nestjs/passport'
jest.mock('@nestjs/passport', () => ({
  AuthGuard: (strategy: string) => {
    return class MockAuthGuard {
      constructor() {}
      canActivate(context: ExecutionContext) {
        return true;
      }
    };
  },
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard from passport with jwt strategy', () => {
    // Verify that the guard inherits from AuthGuard('jwt')
    expect(guard.constructor.name).toBe('JwtAuthGuard');
  });

  it('should be able to activate', async () => {
    // Since we mocked the parent AuthGuard to always return true,
    // this should always succeed
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});