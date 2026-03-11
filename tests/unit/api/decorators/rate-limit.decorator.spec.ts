import { RateLimit } from '@api/shared/decorators/rate-limit.decorator';
import { SetMetadata } from '@nestjs/common';

// Mock SetMetadata to capture calls
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockImplementation((key, value) => ({ key, value })),
}));

describe('RateLimit Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(RateLimit).toBeDefined();
  });

  it('should set metadata with rate limit options', () => {
    // Arrange
    const options = {
      points: 10,
      duration: 60,
    };
    
    // Act
    const result = RateLimit(options);
    
    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('rate-limit', options);
    expect(result).toEqual({ key: 'rate-limit', value: options });
  });

  it('should handle different points values', () => {
    // Arrange
    const options = {
      points: 100,
      duration: 3600,
    };
    
    // Act
    const result = RateLimit(options);
    
    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('rate-limit', options);
    expect(result).toEqual({ key: 'rate-limit', value: options });
  });

  it('should handle zero points', () => {
    // Arrange
    const options = {
      points: 0,
      duration: 60,
    };
    
    // Act
    const result = RateLimit(options);
    
    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('rate-limit', options);
    expect(result).toEqual({ key: 'rate-limit', value: options });
  });

  it('should handle zero duration', () => {
    // Arrange
    const options = {
      points: 10,
      duration: 0,
    };
    
    // Act
    const result = RateLimit(options);
    
    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('rate-limit', options);
    expect(result).toEqual({ key: 'rate-limit', value: options });
  });

  it('should handle large numbers', () => {
    // Arrange
    const options = {
      points: 10000,
      duration: 86400, // 24 hours in seconds
    };
    
    // Act
    const result = RateLimit(options);
    
    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('rate-limit', options);
    expect(result).toEqual({ key: 'rate-limit', value: options });
  });
});