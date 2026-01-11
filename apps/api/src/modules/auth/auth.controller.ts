import { 
  Controller, 
  Post, 
  Body, 
  UnauthorizedException, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Res,
  Req,
  Get,
  BadRequestException
} from "@nestjs/common";
import type { Response, Request } from 'express';
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthGuard } from "../../shared/guards/auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get("csrf-token")
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() req: Request) {
    try {
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
      if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 10) {
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
          details: 'CSRF is still in development mode. Check middleware configuration.',
          code: 'CSRF_DEVELOPMENT_MODE_ERROR',
          timestamp: new Date().toISOString(),
          path: '/api/v1/auth/csrf-token',
        });
      }
      
      return {
        csrfToken,
        timestamp: new Date().toISOString(),
        expiresIn: 'Session',
        note: 'Include this token in X-CSRF-Token header for state-changing requests (POST, PUT, DELETE, PATCH)'
      };
    } catch (error) {
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

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body() loginDto: { email: string; password: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.authService.login(user, res);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user.sub;
    return this.authService.logout(userId, res);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    return this.authService.refreshToken(refreshToken, res);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: any) {
    // User is attached to request by AuthGuard
    return {
      user: {
        id: req.user.sub,
        email: req.user.email,
        organizationId: req.user.organizationId,
      }
    };
  }

  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  async register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    },
  ) {
    // For MVP: Create user with a new organization
    // This is simplified - in production you'd want more validation
    return this.authService.register(registerDto);
  }
}