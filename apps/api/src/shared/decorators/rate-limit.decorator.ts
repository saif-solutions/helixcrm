import { SetMetadata } from '@nestjs/common';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the duration window
   * @example 100
   */
  points: number;

  /**
   * Time window in seconds for rate limiting
   * @example 60
   */
  duration: number;

  /**
   * Optional custom key for rate limiting (e.g., user ID, IP)
   * If not provided, defaults to IP address
   * @example 'user:id'
   */
  keyPrefix?: string;

  /**
   * Optional custom error message
   * @example 'Too many requests, please try again later.'
   */
  errorMessage?: string;

  /**
   * Whether to skip rate limiting for this route
   * Useful for health checks or internal endpoints
   * @default false
   */
  skip?: boolean;
}

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rate-limit';

/**
 * Decorator to configure rate limiting for a route
 *
 * @param options - Rate limit configuration options
 * @returns Custom decorator with rate limit metadata
 *
 * @example
 * ```typescript
 * // Basic rate limit: 100 requests per minute
 * @RateLimit({ points: 100, duration: 60 })
 * @Post('login')
 * login() { ... }
 *
 * // Advanced: Custom key and error message
 * @RateLimit({
 *   points: 10,
 *   duration: 300,
 *   keyPrefix: 'auth:login',
 *   errorMessage: 'Too many login attempts, please wait 5 minutes'
 * })
 * @Post('login')
 * login() { ... }
 *
 * // Skip rate limiting for health checks
 * @RateLimit({ points: 100, duration: 60, skip: true })
 * @Get('health')
 * health() { ... }
 * ```
 */
export const RateLimit = (
  options: RateLimitOptions,
): MethodDecorator & ClassDecorator => {
  // Validate options in development
  if (process.env.NODE_ENV !== 'production') {
    if (options.points <= 0) {
      throw new Error(
        `RateLimit: points must be greater than 0, got ${options.points}`,
      );
    }

    if (options.duration <= 0) {
      throw new Error(
        `RateLimit: duration must be greater than 0, got ${options.duration}`,
      );
    }

    if (options.keyPrefix && typeof options.keyPrefix !== 'string') {
      throw new Error(
        `RateLimit: keyPrefix must be a string, got ${typeof options.keyPrefix}`,
      );
    }

    if (options.errorMessage && typeof options.errorMessage !== 'string') {
      throw new Error(
        `RateLimit: errorMessage must be a string, got ${typeof options.errorMessage}`,
      );
    }
  }

  // Normalize options with defaults
  const normalizedOptions: RateLimitOptions = {
    points: options.points,
    duration: options.duration,
    keyPrefix: options.keyPrefix,
    errorMessage: options.errorMessage,
    skip: options.skip ?? false,
  };

  return SetMetadata(RATE_LIMIT_KEY, normalizedOptions);
};

/**
 * Helper decorator for common rate limit scenarios
 */

/**
 * Strict rate limit: 10 requests per minute
 * Suitable for authentication endpoints
 */
export const StrictRateLimit = (): MethodDecorator & ClassDecorator => {
  return RateLimit({
    points: 10,
    duration: 60,
    errorMessage: 'Too many requests. Please try again after a minute.',
  });
};

/**
 * Moderate rate limit: 100 requests per minute
 * Suitable for standard API endpoints
 */
export const ModerateRateLimit = (): MethodDecorator & ClassDecorator => {
  return RateLimit({
    points: 100,
    duration: 60,
    errorMessage: 'Rate limit exceeded. Please slow down your requests.',
  });
};

/**
 * Relaxed rate limit: 1000 requests per minute
 * Suitable for read-only or internal endpoints
 */
export const RelaxedRateLimit = (): MethodDecorator & ClassDecorator => {
  return RateLimit({
    points: 1000,
    duration: 60,
    errorMessage: 'Rate limit exceeded. Please reduce request frequency.',
  });
};

/**
 * No rate limit (skip)
 * Suitable for health checks or critical internal endpoints
 */
export const NoRateLimit = (): MethodDecorator & ClassDecorator => {
  return RateLimit({
    points: 0,
    duration: 0,
    skip: true,
  });
};
