import { ValidateEntityExists } from '@api/shared/decorators/validate-entity-exists.decorator';
import { SetMetadata } from '@nestjs/common';

// Mock SetMetadata to capture calls
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockImplementation((key, value) => ({ key, value })),
}));

describe('ValidateEntityExists Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ValidateEntityExists).toBeDefined();
  });

  it('should call SetMetadata with the correct key and value', () => {
    // Arrange
    const entityType = 'User';

    // Act
    ValidateEntityExists(entityType);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('validate-entity-exists', entityType);
  });

  it('should handle different entity types', () => {
    // Test various entity types
    const entityTypes = ['Contact', 'Deal', 'Lead', 'Pipeline', 'Role', 'Permission'];

    entityTypes.forEach((entityType) => {
      ValidateEntityExists(entityType);
      expect(SetMetadata).toHaveBeenCalledWith('validate-entity-exists', entityType);
    });
  });

  it('should handle entity types with spaces', () => {
    // Arrange
    const entityType = 'Payment Method';

    // Act
    ValidateEntityExists(entityType);

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('validate-entity-exists', entityType);
  });

  it('should handle empty string entity type', () => {
    // Act
    ValidateEntityExists('');

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith('validate-entity-exists', '');
  });

  it('should return the result of SetMetadata', () => {
    // Arrange
    const expectedResult = { key: 'validate-entity-exists', value: 'User' };
    (SetMetadata as jest.Mock).mockReturnValue(expectedResult);

    // Act
    const result = ValidateEntityExists('User');

    // Assert
    expect(result).toBe(expectedResult);
  });

  it('should work with common entity types', () => {
    // Just verify that calling with common types doesn't throw
    expect(() => {
      ValidateEntityExists('User');
      ValidateEntityExists('Contact');
      ValidateEntityExists('Deal');
      ValidateEntityExists('Lead');
      ValidateEntityExists('Pipeline');
    }).not.toThrow();
  });
});
