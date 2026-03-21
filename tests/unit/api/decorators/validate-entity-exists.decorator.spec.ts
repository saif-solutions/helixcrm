// tests/unit/api/decorators/validate-entity-exists.decorator.spec.ts

import { ValidateEntityExists } from '@api/shared/decorators/validate-entity-exists.decorator';
import { Reflector } from '@nestjs/core';

describe('ValidateEntityExists Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(ValidateEntityExists).toBeDefined();
  });

  it('should set metadata with the correct entity type', () => {
    // Arrange
    const entityType = 'User';

    // Act
    class TestClass {
      @ValidateEntityExists(entityType)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('validate-entity-exists', TestClass.prototype.testMethod);
    expect(metadata).toBe(entityType);
  });

  it('should handle different entity types', () => {
    // Test various entity types
    const entityTypes = ['Contact', 'Deal', 'Lead', 'Pipeline', 'Role', 'Permission'];

    entityTypes.forEach((entityType) => {
      class TestClass {
        @ValidateEntityExists(entityType)
        testMethod() {}
      }

      const metadata = reflector.get('validate-entity-exists', TestClass.prototype.testMethod);
      expect(metadata).toBe(entityType);
    });
  });

  it('should handle entity types with spaces', () => {
    // Arrange
    const entityType = 'Payment Method';

    // Act
    class TestClass {
      @ValidateEntityExists(entityType)
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('validate-entity-exists', TestClass.prototype.testMethod);
    expect(metadata).toBe(entityType);
  });

  it('should handle empty string entity type', () => {
    // Act
    class TestClass {
      @ValidateEntityExists('')
      testMethod() {}
    }

    // Assert
    const metadata = reflector.get('validate-entity-exists', TestClass.prototype.testMethod);
    expect(metadata).toBe('');
  });

  it('should work with multiple methods having different entity types', () => {
    // Act
    class TestClass {
      @ValidateEntityExists('User')
      getUser() {}

      @ValidateEntityExists('Contact')
      getContact() {}

      @ValidateEntityExists('Deal')
      getDeal() {}
    }

    // Assert
    const userMetadata = reflector.get('validate-entity-exists', TestClass.prototype.getUser);
    const contactMetadata = reflector.get('validate-entity-exists', TestClass.prototype.getContact);
    const dealMetadata = reflector.get('validate-entity-exists', TestClass.prototype.getDeal);
    
    expect(userMetadata).toBe('User');
    expect(contactMetadata).toBe('Contact');
    expect(dealMetadata).toBe('Deal');
  });

  it('should work with class-level entity validation', () => {
    // Arrange
    const entityType = 'User';

    // Act
    @ValidateEntityExists(entityType)
    class TestClass {
      method1() {}
      method2() {}
    }

    // Assert
    const classMetadata = reflector.get('validate-entity-exists', TestClass);
    expect(classMetadata).toBe(entityType);
  });

  it('should combine class-level and method-level validation', () => {
    // Arrange
    const classEntity = 'User';
    const methodEntity = 'UserProfile';

    // Act
    @ValidateEntityExists(classEntity)
    class TestClass {
      @ValidateEntityExists(methodEntity)
      getUserProfile() {}
    }

    // Assert
    const classMetadata = reflector.get('validate-entity-exists', TestClass);
    const methodMetadata = reflector.get('validate-entity-exists', TestClass.prototype.getUserProfile);
    
    expect(classMetadata).toBe(classEntity);
    expect(methodMetadata).toBe(methodEntity);
  });

  it('should work with common entity types without throwing', () => {
    // Just verify that calling with common types doesn't throw
    expect(() => {
      class TestClass {
        @ValidateEntityExists('User')
        test1() {}

        @ValidateEntityExists('Contact')
        test2() {}

        @ValidateEntityExists('Deal')
        test3() {}

        @ValidateEntityExists('Lead')
        test4() {}

        @ValidateEntityExists('Pipeline')
        test5() {}
      }
      // Use the class to avoid unused variable warning
      const _testClass = TestClass;
    }).not.toThrow();
  });
});