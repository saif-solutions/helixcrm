import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';

/**
 * Paginated response metadata
 */
export interface PaginatedResponseMeta {
  /**
   * Current page number
   * @example 1
   */
  page: number;

  /**
   * Number of items per page
   * @example 20
   */
  limit: number;

  /**
   * Total number of items
   * @example 100
   */
  total: number;

  /**
   * Total number of pages
   * @example 5
   */
  pages: number;

  /**
   * Whether there is a next page
   * @example true
   */
  hasNext?: boolean;

  /**
   * Whether there is a previous page
   * @example false
   */
  hasPrev?: boolean;
}

/**
 * Paginated response wrapper interface
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items for current page
   */
  data: T[];

  /**
   * Pagination metadata
   */
  meta: PaginatedResponseMeta;
}

/**
 * Options for paginated response decorator
 */
export interface PaginatedResponseOptions {
  /**
   * Custom title for the Swagger schema
   */
  title?: string;

  /**
   * Description of the paginated response
   */
  description?: string;

  /**
   * Whether to include pagination metadata in the response
   * @default true
   */
  includeMeta?: boolean;

  /**
   * Custom example for the response data
   */
  example?: unknown;

  /**
   * Whether the response is an array of items
   * @default true
   */
  isArray?: boolean;

  /**
   * Custom status code
   * @default 200
   */
  status?: number;
}

/**
 * Decorator to document paginated API responses in Swagger
 * Automatically generates OpenAPI schema for paginated responses
 *
 * @param model - The DTO/model class for the data items
 * @param options - Optional configuration options
 * @returns Custom decorator with Swagger documentation
 *
 * @example
 * ```typescript
 * // Basic usage
 * @ApiPaginatedResponse(DealDto)
 * @Get()
 * async getDeals() {
 *   return this.dealsService.findAll(page, limit);
 * }
 *
 * // Advanced usage with options
 * @ApiPaginatedResponse(DealDto, {
 *   title: 'DealsPaginatedResponse',
 *   description: 'Paginated list of deals with metadata',
 *   includeMeta: true,
 *   status: 200
 * })
 * @Get()
 * async getDeals() {
 *   return this.dealsService.findAll(page, limit);
 * }
 *
 * // With custom example
 * @ApiPaginatedResponse(DealDto, {
 *   example: {
 *     data: [{ id: '1', name: 'Example Deal' }],
 *     meta: { page: 1, limit: 10, total: 1, pages: 1 }
 *   }
 * })
 * @Get()
 * async getDeals() { ... }
 * ```
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options?: PaginatedResponseOptions,
): ReturnType<typeof applyDecorators> => {
  const {
    title = `PaginatedResponseOf${model.name}`,
    description = 'Paginated list of items',
    includeMeta = true,
    isArray = true,
    status = 200,
  } = options || {};

  // Validate in development
  if (process.env.NODE_ENV !== 'production') {
    if (!model) {
      throw new Error('ApiPaginatedResponse: model is required');
    }

    if (title && typeof title !== 'string') {
      throw new Error(
        `ApiPaginatedResponse: title must be a string, got ${typeof title}`,
      );
    }

    if (description && typeof description !== 'string') {
      throw new Error(
        `ApiPaginatedResponse: description must be a string, got ${typeof description}`,
      );
    }
  }

  // Build the schema properties
  const properties: Record<string, unknown> = {};

  // Data property
  if (isArray) {
    properties.data = {
      type: 'array',
      items: { $ref: getSchemaPath(model) },
      description: 'Array of items for the current page',
    };
  } else {
    properties.data = {
      $ref: getSchemaPath(model),
      description: 'Item data',
    };
  }

  // Pagination metadata
  if (includeMeta) {
    properties.meta = {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          example: 1,
          description: 'Current page number',
          minimum: 1,
        },
        limit: {
          type: 'number',
          example: 20,
          description: 'Number of items per page',
          minimum: 1,
          maximum: 100,
        },
        total: {
          type: 'number',
          example: 100,
          description: 'Total number of items',
          minimum: 0,
        },
        pages: {
          type: 'number',
          example: 5,
          description: 'Total number of pages',
          minimum: 0,
        },
        hasNext: {
          type: 'boolean',
          example: true,
          description: 'Whether there is a next page',
        },
        hasPrev: {
          type: 'boolean',
          example: false,
          description: 'Whether there is a previous page',
        },
      },
      required: ['page', 'limit', 'total', 'pages'],
      description: 'Pagination metadata',
    };
  }

  // Create the schema
  const schema = {
    title,
    allOf: [
      {
        type: 'object',
        properties,
        required: includeMeta ? ['data', 'meta'] : ['data'],
      },
    ],
  };

  // Apply decorators
  const decorators = [
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema,
      status,
    }),
  ];

  // Add custom example if provided
  if (options?.example) {
    const existingDecorator = decorators[decorators.length - 1];
    if (existingDecorator && typeof existingDecorator === 'object') {
      // @ts-expect-error - Adding example to existing decorator
      existingDecorator.example = options.example;
    }
  }

  return applyDecorators(...decorators);
};

/**
 * Decorator for cursor-based pagination (infinite scroll)
 * Alternative to offset-based pagination
 *
 * @param model - The DTO/model class for the data items
 * @returns Custom decorator with Swagger documentation
 *
 * @example
 * ```typescript
 * @ApiCursorPaginatedResponse(DealDto)
 * @Get('cursor')
 * async getDealsCursor() {
 *   return this.dealsService.findWithCursor(cursor, limit);
 * }
 * ```
 */
export const ApiCursorPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Cursor-paginated list of items',
      schema: {
        title: `CursorPaginatedResponseOf${model.name}`,
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
            description: 'Array of items',
          },
          cursor: {
            type: 'object',
            properties: {
              next: {
                type: 'string',
                nullable: true,
                description: 'Cursor for the next page',
                example: 'cursor_12345',
              },
              prev: {
                type: 'string',
                nullable: true,
                description: 'Cursor for the previous page',
                example: 'cursor_54321',
              },
              hasMore: {
                type: 'boolean',
                description: 'Whether there are more items',
                example: true,
              },
            },
            description: 'Cursor information for pagination',
          },
        },
        required: ['data', 'cursor'],
      },
    }),
  );
};

/**
 * Decorator for paginated response with custom metadata
 * Includes additional metadata fields beyond standard pagination
 *
 * @param model - The DTO/model class for the data items
 * @param metaFields - Additional metadata fields to include
 * @returns Custom decorator with Swagger documentation
 *
 * @example
 * ```typescript
 * @ApiPaginatedResponseWithMeta(DealDto, {
 *   totalRevenue: { type: 'number', example: 1000000 },
 *   averageValue: { type: 'number', example: 50000 }
 * })
 * @Get()
 * async getDealsWithMetrics() { ... }
 * ```
 */
export const ApiPaginatedResponseWithMeta = <TModel extends Type<unknown>>(
  model: TModel,
  metaFields: Record<
    string,
    { type: string; example?: unknown; description?: string }
  >,
): ReturnType<typeof applyDecorators> => {
  const metaProperties: Record<string, unknown> = {
    page: {
      type: 'number',
      example: 1,
      description: 'Current page number',
    },
    limit: {
      type: 'number',
      example: 20,
      description: 'Number of items per page',
    },
    total: {
      type: 'number',
      example: 100,
      description: 'Total number of items',
    },
    pages: {
      type: 'number',
      example: 5,
      description: 'Total number of pages',
    },
  };

  // Add custom meta fields
  for (const [key, field] of Object.entries(metaFields)) {
    metaProperties[key] = {
      type: field.type,
      example: field.example,
      description: field.description || `Custom metadata field: ${key}`,
    };
  }

  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Paginated list with custom metadata',
      schema: {
        title: `PaginatedResponseWithMetaOf${model.name}`,
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
            description: 'Array of items',
          },
          meta: {
            type: 'object',
            properties: metaProperties,
            required: ['page', 'limit', 'total', 'pages'],
            description: 'Pagination metadata with custom fields',
          },
        },
        required: ['data', 'meta'],
      },
    }),
  );
};

/**
 * Helper function to create paginated response DTOs
 * Use this to create type-safe paginated response classes
 *
 * @param ItemDto - The item DTO class
 * @returns A class representing the paginated response
 *
 * @example
 * ```typescript
 * class DealDto { ... }
 * class PaginatedDealsDto = createPaginatedResponseDto(DealDto);
 *
 * @Get()
 * async getDeals(): Promise<PaginatedDealsDto> { ... }
 * ```
 */
export function createPaginatedResponseDto<TItem>(
  ItemDto: Type<TItem>,
): Type<PaginatedResponse<TItem>> {
  class PaginatedResponseImpl implements PaginatedResponse<TItem> {
    data: TItem[];
    meta: PaginatedResponseMeta;
  }

  Object.defineProperty(PaginatedResponseImpl, 'name', {
    value: `PaginatedResponseOf${ItemDto.name}`,
  });

  return PaginatedResponseImpl as Type<PaginatedResponse<TItem>>;
}
