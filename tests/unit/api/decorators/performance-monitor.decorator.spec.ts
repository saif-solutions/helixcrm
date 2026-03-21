// tests/unit/api/decorators/performance-monitor.decorator.spec.ts

import { PerformanceMonitor } from '@api/shared/decorators/performance-monitor.decorator';
import { Reflector } from '@nestjs/core';

describe('PerformanceMonitor Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(PerformanceMonitor).toBeDefined();
  });

  it('should set metadata with operation name', () => {
    // Arrange
    const operationName = 'getDeals';

    // Act
    class TestClass {
      @PerformanceMonitor(operationName)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('performance-monitor', TestClass.prototype.testMethod);
    expect(metadata).toBe(operationName);
  });

  it('should handle empty string operation name', () => {
    // Act
    class TestClass {
      @PerformanceMonitor('')
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('performance-monitor', TestClass.prototype.testMethod);
    expect(metadata).toBe('');
  });

  it('should handle operation names with spaces', () => {
    // Arrange
    const operationName = 'get user deals';

    // Act
    class TestClass {
      @PerformanceMonitor(operationName)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('performance-monitor', TestClass.prototype.testMethod);
    expect(metadata).toBe(operationName);
  });

  it('should handle operation names with special characters', () => {
    // Arrange
    const operationName = 'get-user@deals#123';

    // Act
    class TestClass {
      @PerformanceMonitor(operationName)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('performance-monitor', TestClass.prototype.testMethod);
    expect(metadata).toBe(operationName);
  });

  it('should work with class-level performance monitoring', () => {
    // Arrange
    const operationName = 'UserController';

    // Act
    @PerformanceMonitor(operationName)
    class TestClass {
      method1() {}
      method2() {}
    }

    // Assert
    const classMetadata = reflector.get('performance-monitor', TestClass);
    expect(classMetadata).toBe(operationName);
  });

  it('should allow different operations for different methods', () => {
    // Act
    class TestClass {
      @PerformanceMonitor('getUsers')
      getUsers() {}

      @PerformanceMonitor('updateUser')
      updateUser() {}
    }

    // Assert
    const getUsersMetadata = reflector.get('performance-monitor', TestClass.prototype.getUsers);
    const updateUserMetadata = reflector.get('performance-monitor', TestClass.prototype.updateUser);
    
    expect(getUsersMetadata).toBe('getUsers');
    expect(updateUserMetadata).toBe('updateUser');
  });

  it('should combine class-level and method-level performance monitoring', () => {
    // Arrange
    const classOperation = 'UserController';
    const methodOperation = 'getUserDetails';

    // Act
    @PerformanceMonitor(classOperation)
    class TestClass {
      @PerformanceMonitor(methodOperation)
      getUserDetails() {}
    }

    // Assert
    const classMetadata = reflector.get('performance-monitor', TestClass);
    const methodMetadata = reflector.get('performance-monitor', TestClass.prototype.getUserDetails);
    
    expect(classMetadata).toBe(classOperation);
    expect(methodMetadata).toBe(methodOperation);
  });
});