import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiOperation,
} from '@nestjs/swagger';

/**
 * Metadata key for public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public route options
 */
export interface PublicOptions {
  /**
   * Whether to skip authentication entirely
   * @default true
   */
  skipAuth?: boolean;

  /**
   * Optional description for Swagger documentation
   * @default 'Public endpoint - no authentication required'
   */
  description?: string;

  /**
   * Whether to allow rate limiting on public endpoints
   * @default true
   */
  allowRateLimit?: boolean;

  /**
   * Custom response message for unauthorized access
   * @default 'Public endpoint - no authentication required'
   */
  unauthorizedMessage?: string;

  /**
   * Whether to add Swagger bearer auth (usually false for public routes)
   * @default false
   */
  addBearerAuth?: boolean;
}

/**
 * Decorator to mark a route as public (no authentication required)
 *
 * @param options - Optional configuration options
 * @returns Custom decorator with public metadata and Swagger documentation
 *
 * @example
 * ```typescript
 * // Basic usage
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * // Advanced usage with options
 * @Public({
 *   description: 'Public registration endpoint - open to all users',
 *   allowRateLimit: true,
 *   skipAuth: true
 * })
 * @Post('register')
 * register(@Body() dto: RegisterDto) {
 *   return this.authService.register(dto);
 * }
 *
 * // Health check with rate limiting disabled
 * @Public({
 *   allowRateLimit: false,
 *   description: 'System health check - no rate limiting'
 * })
 * @Get('health')
 * healthCheck() { ... }
 *
 * // Without Swagger bearer auth (most common for public routes)
 * @Public({ addBearerAuth: false })
 * @Get('public-data')
 * getPublicData() { ... }
 * ```
 */
export const Public = (
  options?: PublicOptions,
): ReturnType<typeof applyDecorators> => {
  const {
    skipAuth = true,
    description = 'Public endpoint - no authentication required',
    allowRateLimit = true,
    unauthorizedMessage = 'Public endpoint - no authentication required',
    addBearerAuth = false,
  } = options || {};

  // Validate options in development
  if (process.env.NODE_ENV !== 'production') {
    if (description && typeof description !== 'string') {
      throw new Error(
        `Public: description must be a string, got ${typeof description}`,
      );
    }

    if (unauthorizedMessage && typeof unauthorizedMessage !== 'string') {
      throw new Error(
        `Public: unauthorizedMessage must be a string, got ${typeof unauthorizedMessage}`,
      );
    }

    if (skipAuth !== undefined && typeof skipAuth !== 'boolean') {
      throw new Error(
        `Public: skipAuth must be a boolean, got ${typeof skipAuth}`,
      );
    }

    if (allowRateLimit !== undefined && typeof allowRateLimit !== 'boolean') {
      throw new Error(
        `Public: allowRateLimit must be a boolean, got ${typeof allowRateLimit}`,
      );
    }
  }

  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [SetMetadata(IS_PUBLIC_KEY, { skipAuth, allowRateLimit })];

  // Add Swagger documentation
  if (addBearerAuth) {
    decorators.push(ApiBearerAuth());
  }

  decorators.push(
    ApiUnauthorizedResponse({
      description: unauthorizedMessage,
    }),
    ApiOperation({
      description,
    }),
  );

  return applyDecorators(...decorators);
};

/**
 * Decorator for health check endpoints
 * Public with no rate limiting and optimized for monitoring
 *
 * @returns Custom decorator with public metadata
 *
 * @example
 * ```typescript
 * @HealthCheckPublic()
 * @Get('health')
 * healthCheck() {
 *   return this.healthService.check();
 * }
 * ```
 */
export const HealthCheckPublic = (): ReturnType<typeof applyDecorators> => {
  return Public({
    skipAuth: true,
    allowRateLimit: false,
    description: 'Health check endpoint - no authentication or rate limiting',
    unauthorizedMessage: 'Health check endpoint is public',
    addBearerAuth: false,
  });
};

/**
 * Decorator for public webhook endpoints
 * Public with rate limiting enabled and webhook-specific documentation
 *
 * @param webhookName - Name of the webhook for documentation
 * @returns Custom decorator with public metadata
 *
 * @example
 * ```typescript
 * @WebhookPublic('stripe')
 * @Post('webhooks/stripe')
 * handleStripeWebhook(@Body() payload: any) {
 *   return this.stripeService.handleWebhook(payload);
 * }
 * ```
 */
export const WebhookPublic = (
  webhookName: string,
): ReturnType<typeof applyDecorators> => {
  return Public({
    skipAuth: true,
    allowRateLimit: true,
    description: `Public webhook endpoint for ${webhookName} - no authentication required`,
    unauthorizedMessage: 'Webhook endpoints are public',
    addBearerAuth: false,
  });
};

/**
 * Decorator for public API endpoints with documentation
 * Includes Swagger tags and response examples
 *
 * @param endpointDescription - Description of the endpoint
 * @returns Custom decorator with public metadata
 *
 * @example
 * ```typescript
 * @PublicAPI('Get public company information')
 * @Get('company-info')
 * getCompanyInfo() {
 *   return { name: 'HelixCRM', version: '1.0.0' };
 * }
 * ```
 */
export const PublicAPI = (
  endpointDescription: string,
): ReturnType<typeof applyDecorators> => {
  return Public({
    skipAuth: true,
    allowRateLimit: true,
    description: `Public API endpoint: ${endpointDescription}`,
    unauthorizedMessage: 'Public API endpoint - no authentication required',
    addBearerAuth: false,
  });
};

/**
 * Decorator for temporary public routes (e.g., during maintenance or preview)
 * Includes warning in documentation
 *
 * @param expiresAt - Optional expiration date for the public access
 * @returns Custom decorator with public metadata
 *
 * @example
 * ```typescript
 * @TemporaryPublic(new Date('2026-04-01'))
 * @Get('preview')
 * getPreview() {
 *   return this.previewService.getData();
 * }
 * ```
 */
export const TemporaryPublic = (
  expiresAt?: Date,
): ReturnType<typeof applyDecorators> => {
  const description = expiresAt
    ? `Temporary public endpoint - expires at ${expiresAt.toISOString()}`
    : 'Temporary public endpoint - will be restricted soon';

  return Public({
    skipAuth: true,
    allowRateLimit: true,
    description,
    unauthorizedMessage: 'This endpoint is temporarily public',
    addBearerAuth: false,
  });
};

/**
 * Type guard to check if route is public
 * @param metadata - Metadata from reflector
 * @returns Boolean indicating if route is public
 */
export const isPublicRoute = (metadata: unknown): boolean => {
  if (!metadata) return false;

  if (typeof metadata === 'object' && metadata !== null) {
    const publicMetadata = metadata as { skipAuth?: boolean };
    return publicMetadata.skipAuth === true;
  }

  return metadata === true;
};

/**
 * Get public route configuration
 * @param metadata - Metadata from reflector
 * @returns Public options or null if not public
 */
export const getPublicConfig = (metadata: unknown): PublicOptions | null => {
  if (!metadata) return null;

  if (typeof metadata === 'object' && metadata !== null) {
    return metadata as PublicOptions;
  }

  if (metadata === true) {
    return { skipAuth: true, allowRateLimit: true };
  }

  return null;
};
