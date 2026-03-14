import { reflectorMock } from '../__mocks__/global-mocks';

/**
 * Resets all mocks to default state
 * This should be called in beforeEach() in test files
 */
export function resetAllMocks(): void {
  // Clear all mock calls and implementations
  jest.clearAllMocks();
  
  // Reset reflector to default behavior (not public)
  reflectorMock.getAllAndOverride.mockReturnValue(false);
}

/**
 * Resets only auth-related mocks
 */
export function resetAuthMocks(): void {
  jest.clearAllMocks();
  reflectorMock.getAllAndOverride.mockReturnValue(false);
}

/**
 * Resets only database-related mocks
 */
export function resetDatabaseMocks(): void {
  jest.clearAllMocks();
  // Add database-specific reset if needed
}

/**
 * Resets only queue-related mocks
 */
export function resetQueueMocks(): void {
  jest.clearAllMocks();
  // Add queue-specific reset if needed
}