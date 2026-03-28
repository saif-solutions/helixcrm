// apps/api/src/shared/guards/jwt-auth.guard.ts

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/require-permission.decorator';
import type { Request } from 'express';

// ==================== INTERFACES ====================

/**
 * Extended request with user and correlation ID
 */
interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  id?: string;
  method: string;
  url: string;
}

/**
 * Authentication error info from Passport
 */
interface AuthErrorInfo {
  message?: string;
  name?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for request with user
 */
function hasUser(req: AuthenticatedRequest): req is AuthenticatedRequest & {
  user: NonNullable<AuthenticatedRequest['user']>;
} {
  return req.user !== undefined && req.user !== null;
}

/**
 * Type guard for error with message
 */
function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Get user ID safely from request
 */
function getUserId(user: AuthenticatedRequest['user']): string | undefined {
  if (!user) return undefined;
  return user.sub || user.id;
}

/**
 * Mask user ID for logging
 */
function maskUserId(userId: string | undefined): string {
  if (!userId) return 'unknown';
  if (userId.length <= 8) return '****';
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

// ==================== JWT AUTH GUARD ====================

/**
 * JWT Authentication Guard
 *
 * Extends the Passport JWT authentication guard to provide:
 * - Consistent JWT validation
 * - Public route support
 * - Enhanced error handling
 * - Request tracing
 *
 * This guard automatically extracts and validates JWT tokens from:
 * 1. Authorization header (Bearer token)
 * 2. Cookies (access_token)
 *
 * @example
 * ```typescript
 * // Apply to a controller or route
 * @UseGuards(JwtAuthGuard)
 * @Controller('users')
 * export class UsersController {
 *   @Get('profile')
 *   getProfile(@Request() req) {
 *     return req.user;
 *   }
 * }
 *
 * // Make a route public
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determine if the route can be activated
   * Checks if the route is public before attempting authentication
   *
   * @param context - Execution context containing request information
   * @returns Promise resolving to boolean indicating if route is accessible
   * @throws UnauthorizedException if authentication fails and route is not public
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startTime = this.isProduction ? undefined : performance.now();

    // Get request with proper typing
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Log request in development
    if (!this.isProduction) {
      const executionTime = performance.now() - (startTime ?? 0);
      this.logger.debug(
        `Request: ${request.method} ${request.url} - Public: ${isPublic}`,
        {
          correlationId: request.id,
          executionTime: `${executionTime.toFixed(2)}ms`,
        },
      );
    }

    // Allow public routes without authentication
    if (isPublic) {
      return true;
    }

    try {
      // Attempt authentication
      const canActivate = await super.canActivate(context);

      // Log successful authentication in development
      if (!this.isProduction && hasUser(request)) {
        const executionTime = performance.now() - (startTime ?? 0);
        const userId = getUserId(request.user);
        this.logger.debug(
          `Authentication successful for ${userId || 'unknown user'}`,
          {
            correlationId: request.id,
            executionTime: `${executionTime.toFixed(2)}ms`,
            userId: maskUserId(userId),
          },
        );
      }

      return canActivate;
    } catch (error) {
      // Enhanced error handling with context
      const correlationId = request.id || 'unknown';
      const errorMessage = hasErrorMessage(error)
        ? error.message
        : 'Unknown error';

      // Log authentication failure
      this.logger.warn(
        `Authentication failed for ${request.method} ${request.url}`,
        {
          correlationId,
          error: errorMessage,
          path: request.url,
          method: request.method,
        },
      );

      // Re-throw with a user-friendly message
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        'Authentication failed. Please provide a valid JWT token.',
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Handle request and extract user information
   * Called after successful authentication
   *
   * @param err - Error if authentication failed
   * @param user - Authenticated user object
   * @param info - Additional authentication info
   * @returns The authenticated user
   * @throws UnauthorizedException if authentication fails
   */
  handleRequest(err: Error | null, user: unknown, info: unknown): unknown {
    // Handle errors from Passport strategy
    if (err) {
      this.logger.error(`Authentication error: ${err.message}`, err.stack);
      throw new UnauthorizedException('Authentication failed', { cause: err });
    }

    // Handle missing user
    if (!user) {
      const infoObj = info as AuthErrorInfo | null;
      const message =
        infoObj?.message || 'No user found. Token may be invalid or expired.';
      this.logger.warn(`Authentication failed: ${message}`);
      throw new UnauthorizedException(message);
    }

    // Return user for request
    return user;
  }

  /**
   * Get the JWT strategy name
   * Useful for debugging and testing
   *
   * @returns Strategy name
   */
  getStrategyName(): string {
    return 'jwt';
  }
}

// ==================== EXTENDED JWT AUTH GUARD ====================

/**
 * Extended JWT Auth Guard with optional authentication support
 *
 * @example
 * ```typescript
 * // Use with optional authentication
 * @UseGuards(new JwtAuthGuardExtended(reflector, { optional: true }))
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user || { message: 'Not authenticated' };
 * }
 * ```
 */
export class JwtAuthGuardExtended extends JwtAuthGuard {
  constructor(
    reflector: Reflector,
    private readonly options: { optional?: boolean } = {},
  ) {
    super(reflector);
  }

  /**
   * Handle request with optional authentication support
   */
  handleRequest(err: Error | null, user: unknown, info: unknown): unknown {
    // If authentication is optional, return null instead of throwing
    if (this.options.optional && (!user || err)) {
      return null;
    }

    // Otherwise use parent implementation
    return super.handleRequest(err, user, info);
  }
}
