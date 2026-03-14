/// <reference types="jest" />

export const createMockAuthCoreAdapter = () => ({
  authCore: {
    issueAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
  },
  tokenManager: {
    issueRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
    validateRefreshToken: jest
      .fn()
      .mockResolvedValue({ sub: 'user-id', jti: 'mock-jti' }),
  },
  password: {
    verify: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
  },
  withTransaction: jest.fn().mockImplementation((cb) => cb()),
  tokenRepository: {
    invalidateRefreshToken: jest.fn().mockResolvedValue(undefined),
    saveRefreshToken: jest.fn().mockResolvedValue(undefined),
  },
  userRepository: {
    findById: jest.fn().mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      tokenVersion: 1,
    }),
  },
});
