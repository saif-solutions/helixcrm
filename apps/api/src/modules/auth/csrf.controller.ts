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
import { Request, Response, CookieOptions } from 'express';
import { Public } from '../../shared/decorators/require-permission.decorator';
import SecurityConfig from '../../../config/security.config';

interface CsrfRequest extends Request {
  csrfToken?: () => string;
}

interface ErrorResponse {
  message: string;
  details?: string;
  code?: string;
  timestamp?: string;
  path?: string;
  error?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

@Controller('auth')
export class CsrfController {
  private readonly logger = new Logger(CsrfController.name);

  @Get('csrf-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      this.logger.log('Generating CSRF token');

      const csrfReq = req as CsrfRequest;

      if (typeof csrfReq.csrfToken !== 'function') {
        throw new BadRequestException({
          message: 'CSRF middleware not properly configured',
          details: 'The CSRF middleware did not run for this endpoint',
          code: 'CSRF_MIDDLEWARE_MISSING',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        } as ErrorResponse);
      }

      const csrfToken = csrfReq.csrfToken();

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
        } as ErrorResponse);
      }

      if (csrfToken === 'development-mode') {
        throw new BadRequestException({
          message: 'CSRF configuration error',
          details:
            'CSRF is still in development mode. Check middleware configuration.',
          code: 'CSRF_DEVELOPMENT_MODE_ERROR',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        } as ErrorResponse);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const cookieOptions = SecurityConfig.cookies.csrfToken() as CookieOptions;
      res.cookie('XSRF-TOKEN', csrfToken, cookieOptions);

      return {
        csrfToken,
        timestamp: new Date().toISOString(),
        expiresIn: 'Session',
        note: 'Include this token in X-XSRF-TOKEN header for state-changing requests (POST, PUT, DELETE, PATCH)',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`CSRF token generation failed: ${errorMessage}`);

      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException({
        message: 'CSRF token generation failed',
        error: errorMessage,
        details: 'An unexpected error occurred while generating CSRF token',
        code: 'CSRF_GENERATION_ERROR',
        timestamp: new Date().toISOString(),
        path: '/api/v1/auth/csrf-token',
      } as ErrorResponse);
    }
  }
}
