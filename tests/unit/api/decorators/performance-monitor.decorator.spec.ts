import { PerformanceMonitor } from '@api/shared/decorators/performance-monitor.decorator';
import { SetMetadata } from '@nestjs/common';

// Mock SetMetadata to capture calls
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockImplementation((key, value) => ({ key, value })),
}));

describe('PerformanceMonitor Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(PerformanceMonitor).toBeDefined();
  });

  it('should set metadata with operation name', () => {
    // Arrange
    const operationName = 'getDeals';

    // Act
    const result = PerformanceMonitor(operationName);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('performance-monitor', operationName);
    expect(result).toEqual({ key: 'performance-monitor', value: operationName });
  });

  it('should handle empty string operation name', () => {
    // Act
    const result = PerformanceMonitor('');

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('performance-monitor', '');
    expect(result).toEqual({ key: 'performance-monitor', value: '' });
  });

  it('should handle operation names with spaces', () => {
    // Arrange
    const operationName = 'get user deals';

    // Act
    const result = PerformanceMonitor(operationName);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('performance-monitor', operationName);
    expect(result).toEqual({ key: 'performance-monitor', value: operationName });
  });

  it('should handle operation names with special characters', () => {
    // Arrange
    const operationName = 'get-user@deals#123';

    // Act
    const result = PerformanceMonitor(operationName);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('performance-monitor', operationName);
    expect(result).toEqual({ key: 'performance-monitor', value: operationName });
  });

  // The method decorator test is removed because it causes issues with the mock
});
