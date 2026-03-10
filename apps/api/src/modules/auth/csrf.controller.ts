// apps/api/src/modules/auth/csrf.controller.ts

import {
  Controller,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../shared/decorators/require-permission.decorator';
import SecurityConfig from '../../shared/config/security.config';

@Controller('auth')
export class CsrfController {
  private readonly logger = new Logger(CsrfController.name);

  @Get('csrf-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      this.logger.log('Generating CSRF token');

      // Check if CSRF middleware ran and attached the function
      if (typeof (req as any).csrfToken !== 'function') {
        throw new BadRequestException({
          message: 'CSRF middleware not properly configured',
          details: 'The CSRF middleware did not run for this endpoint',
          code: 'CSRF_MIDDLEWARE_MISSING',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        });
      }

      // Generate the CSRF token
      const csrfToken = (req as any).csrfToken();

      // Validate the token
      if (
        !csrfToken ||
        typeof csrfToken !== 'string' ||
        csrfToken.length < 10
      ) {
        throw new BadRequestException({
          message: 'Invalid CSRF token generated',
          details: 'Generated token is invalid or too short',
          code: 'INVALID_CSRF_TOKEN',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        });
      }

      // CRITICAL: Ensure we never return 'development-mode'
      if (csrfToken === 'development-mode') {
        throw new BadRequestException({
          message: 'CSRF configuration error',
          details:
            'CSRF is still in development mode. Check middleware configuration.',
          code: 'CSRF_DEVELOPMENT_MODE_ERROR',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        });
      }

      // Set cookie
      res.cookie('XSRF-TOKEN', csrfToken, SecurityConfig.cookies.csrfToken());

      return {
        csrfToken,
        timestamp: new Date().toISOString(),
        expiresIn: 'Session',
        note: 'Include this token in X-XSRF-TOKEN header for state-changing requests (POST, PUT, DELETE, PATCH)',
      };
    } catch (error) {
      this.logger.error(`CSRF token generation failed: ${error.message}`);

      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Otherwise, wrap in a BadRequestException with proper structure
      throw new BadRequestException({
        message: 'CSRF token generation failed',
        error: error.message,
        details: 'An unexpected error occurred while generating CSRF token',
        code: 'CSRF_GENERATION_ERROR',
        timestamp: new Date().toISOString(),
        path: '/api/v1/auth/csrf-token',
      });
    }
  }
}
