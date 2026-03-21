// Mock @nestjs/swagger using jest.mock with factory and module name
jest.mock('@nestjs/swagger', () => ({
  ApiOkResponse: jest.fn().mockImplementation((options) => ({ type: 'ApiOkResponse', options })),
  getSchemaPath: jest.fn().mockImplementation((model) => `#/components/schemas/${model.name}`),
}), { virtual: true });

// Mock @nestjs/common
jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn().mockImplementation((...decorators) => decorators),
}), { virtual: true });

// Now import the decorator
import { ApiPaginatedResponse } from '@api/shared/decorators/api-paginated-response.decorator';

// Get references to the mocked functions
const { ApiOkResponse, getSchemaPath } = require('@nestjs/swagger');
const { applyDecorators } = require('@nestjs/common');

describe('ApiPaginatedResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ApiPaginatedResponse).toBeDefined();
  });

  it('should call applyDecorators', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

    expect(applyDecorators).toHaveBeenCalled();
  });

  it('should create ApiOkResponse with correct schema', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

    expect(ApiOkResponse).toHaveBeenCalledWith({
      schema: expect.objectContaining({
        title: 'PaginatedResponseOfTestModel',
        allOf: expect.any(Array),
      }),
    });
  });

  it('should create schema with data array property', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

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
    class TestModel {}

    ApiPaginatedResponse(TestModel);

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
    class UserModel {}
    class DealModel {}

    ApiPaginatedResponse(UserModel);
    ApiPaginatedResponse(DealModel);

    const firstCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const secondCall = (ApiOkResponse as jest.Mock).mock.calls[1][0];

    expect(firstCall.schema.title).toBe('PaginatedResponseOfUserModel');
    expect(secondCall.schema.title).toBe('PaginatedResponseOfDealModel');
  });

  it('should use getSchemaPath to generate item reference', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

    expect(getSchemaPath).toHaveBeenCalledWith(TestModel);
  });

  it('should return result of applyDecorators', () => {
    class TestModel {}
    const expectedResult = ['decorator1', 'decorator2'];
    (applyDecorators as jest.Mock).mockReturnValue(expectedResult);

    const result = ApiPaginatedResponse(TestModel);

    expect(result).toBe(expectedResult);
  });

  it('should create schema with correct allOf structure', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

    const apiOkResponseCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const schema = apiOkResponseCall.schema;
    
    expect(schema.allOf).toBeInstanceOf(Array);
    expect(schema.allOf.length).toBe(1);
    expect(schema.allOf[0]).toHaveProperty('properties');
    expect(schema.allOf[0].properties).toHaveProperty('data');
    expect(schema.allOf[0].properties).toHaveProperty('page');
    expect(schema.allOf[0].properties).toHaveProperty('limit');
    expect(schema.allOf[0].properties).toHaveProperty('total');
    expect(schema.allOf[0].properties).toHaveProperty('pages');
  });

  it('should include all pagination fields with correct types', () => {
    class TestModel {}

    ApiPaginatedResponse(TestModel);

    const apiOkResponseCall = (ApiOkResponse as jest.Mock).mock.calls[0][0];
    const properties = apiOkResponseCall.schema.allOf[0].properties;

    expect(properties.page.type).toBe('number');
    expect(properties.limit.type).toBe('number');
    expect(properties.total.type).toBe('number');
    expect(properties.pages.type).toBe('number');
  });
});