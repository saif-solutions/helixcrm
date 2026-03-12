import { ApiPaginatedResponse } from '../../../src/shared/decorators/api-paginated-response.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

// Mock the decorators
jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn().mockImplementation((...decorators) => decorators),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiOkResponse: jest
    .fn()
    .mockImplementation((options) => ({ type: 'ApiOkResponse', options })),
  getSchemaPath: jest.fn().mockReturnValue('#/components/schemas/TestModel'),
}));

describe('ApiPaginatedResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ApiPaginatedResponse).toBeDefined();
  });

  it('should call applyDecorators', () => {
    // Arrange
    class TestModel {}

    // Act
    ApiPaginatedResponse(TestModel);

    // Assert
    expect(applyDecorators).toHaveBeenCalled();
  });

  it('should create ApiOkResponse with correct schema', () => {
    // Arrange
    class TestModel {}

    // Act
    ApiPaginatedResponse(TestModel);

    // Assert
    expect(ApiOkResponse).toHaveBeenCalledWith({
      schema: expect.objectContaining({
        title: 'PaginatedResponseOfTestModel',
        allOf: expect.any(Array),
      }),
    });
  });

  it('should create schema with data array property', () => {
    // Arrange
    class TestModel {}

    // Act
    ApiPaginatedResponse(TestModel);

    // Assert
    const apiOkResponseCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const schema = apiOkResponseCall.schema;
    const properties = schema.allOf[0].properties;

    expect(properties).toHaveProperty('data');
    expect(properties.data).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/TestModel' },
    });
  });

  it('should create schema with pagination metadata properties', () => {
    // Arrange
    class TestModel {}

    // Act
    ApiPaginatedResponse(TestModel);

    // Assert
    const apiOkResponseCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const schema = apiOkResponseCall.schema;
    const properties = schema.allOf[0].properties;

    expect(properties).toHaveProperty('page');
    expect(properties.page).toEqual({
      type: 'number',
      example: 1,
    });

    expect(properties).toHaveProperty('limit');
    expect(properties.limit).toEqual({
      type: 'number',
      example: 20,
    });

    expect(properties).toHaveProperty('total');
    expect(properties.total).toEqual({
      type: 'number',
      example: 100,
    });

    expect(properties).toHaveProperty('pages');
    expect(properties.pages).toEqual({
      type: 'number',
      example: 5,
    });
  });

  it('should handle different model names correctly', () => {
    // Arrange
    class UserModel {}
    class DealModel {}

    // Act
    ApiPaginatedResponse(UserModel);
    ApiPaginatedResponse(DealModel);

    // Assert
    const firstCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const secondCall = (ApiOkResponse as jest.Mock).mock.calls[1][0];

    expect(firstCall.schema.title).toBe('PaginatedResponseOfUserModel');
    expect(secondCall.schema.title).toBe('PaginatedResponseOfDealModel');
  });

  it('should return result of applyDecorators', () => {
    // Arrange
    class TestModel {}
    const expectedResult = ['decorator1', 'decorator2'];
    (applyDecorators as jest.Mock).mockReturnValue(expectedResult);

    // Act
    const result = ApiPaginatedResponse(TestModel);

    // Assert
    expect(result).toBe(expectedResult);
  });
});
