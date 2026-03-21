// tests/unit/api/decorators/rate-limit.decorator.spec.ts

import { RateLimit } from '@api/shared/decorators/rate-limit.decorator';
import { Reflector } from '@nestjs/core';

describe('RateLimit Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
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
    class TestClass {
      @RateLimit(options)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('rate-limit', TestClass.prototype.testMethod);
    expect(metadata).toEqual(options);
  });

  it('should handle different points values', () => {
    // Arrange
    const options = {
      points: 100,
      duration: 3600,
    };

    // Act
    class TestClass {
      @RateLimit(options)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('rate-limit', TestClass.prototype.testMethod);
    expect(metadata).toEqual(options);
  });

  it('should handle zero points', () => {
    // Arrange
    const options = {
      points: 0,
      duration: 60,
    };

    // Act
    class TestClass {
      @RateLimit(options)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('rate-limit', TestClass.prototype.testMethod);
    expect(metadata).toEqual(options);
  });

  it('should handle zero duration', () => {
    // Arrange
    const options = {
      points: 10,
      duration: 0,
    };

    // Act
    class TestClass {
      @RateLimit(options)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('rate-limit', TestClass.prototype.testMethod);
    expect(metadata).toEqual(options);
  });

  it('should handle large numbers', () => {
    // Arrange
    const options = {
      points: 10000,
      duration: 86400, // 24 hours in seconds
    };

    // Act
    class TestClass {
      @RateLimit(options)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('rate-limit', TestClass.prototype.testMethod);
    expect(metadata).toEqual(options);
  });

  it('should work with multiple methods having different rate limits', () => {
    // Arrange
    const options1 = { points: 10, duration: 60 };
    const options2 = { points: 100, duration: 3600 };

    // Act
    class TestClass {
      @RateLimit(options1)
      method1() {}

      @RateLimit(options2)
      method2() {}
    }

    // Assert
    const metadata1 = reflector.get('rate-limit', TestClass.prototype.method1);
    const metadata2 = reflector.get('rate-limit', TestClass.prototype.method2);
    
    expect(metadata1).toEqual(options1);
    expect(metadata2).toEqual(options2);
  });

  it('should work with class-level rate limit', () => {
    // Arrange
    const options = { points: 50, duration: 300 };

    // Act
    @RateLimit(options)
    class TestClass {
      method1() {}
      method2() {}
    }

    // Assert - Class-level metadata is stored on the class itself, not on methods
    const classMetadata = reflector.get('rate-limit', TestClass);
    
    expect(classMetadata).toEqual(options);
  });
});