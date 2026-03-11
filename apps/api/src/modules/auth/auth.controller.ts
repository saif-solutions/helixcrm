// apps/api/src/modules/auth/auth.controller.ts

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
  Query,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { Public } from '../../shared/decorators/require-permission.decorator';
import SecurityConfig from '../../config/security.config';
import {
  AuditLogService,
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '../../shared/audit-log/audit-log.service';
import {
  AuthenticatedRequest,
  RegisterResult,
  InvalidateSessionsResult,
  DebugCookieResponse,
  LoginResponse,
  UserSessionResponse,
} from './types/request.types';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private auditLogService: AuditLogService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() loginDto: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      req,
    );

    if (!user) {
      // Log failed login attempt
      await this.auditLogService.logWithRequest(
        req,
        AuditAction.LOGIN_FAILURE,
        AuditEntityType.AUTH,
        loginDto.email,
        undefined,
        undefined,
        { reason: 'Invalid credentials' },
        AuditSeverity.MEDIUM,
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Log successful login
    await this.auditLogService.logWithRequest(
      req,
      AuditAction.LOGIN_SUCCESS,
      AuditEntityType.AUTH,
      user.email,
      user.id,
      undefined,
      { method: 'password' },
      AuditSeverity.MEDIUM,
    );

    const loginResult = await this.authService.login(user, res, req);
    return loginResult as LoginResponse;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;

    // Log logout event
    await this.auditLogService.logWithRequest(
      req,
      AuditAction.LOGOUT,
      AuditEntityType.AUTH,
      req.user.email,
      userId,
      undefined,
      { method: 'manual' },
      AuditSeverity.MEDIUM,
    );

    return this.authService.logout(userId, res, req);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const refreshToken: string | undefined =
      typeof req.cookies?.refresh_token === 'string'
        ? req.cookies.refresh_token
        : undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const refreshResult = await this.authService.refreshToken(
      refreshToken,
      res,
      req,
    );
    return refreshResult as LoginResponse;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getCurrentUser(@Req() req: AuthenticatedRequest): {
    user: { id: string; email: string; organizationId: string };
  } {
    return {
      user: {
        id: req.user.sub,
        email: req.user.email,
        organizationId: req.user.organizationId,
      },
    };
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    },
    @Req() req: Request,
  ): Promise<RegisterResult> {
    // Now this returns the proper type with user and userId fields
    const result = await this.authService.register(registerDto, req);

    // Log user registration
    const userEmail = registerDto.email;
    const userId = result.userId || result.id;

    await this.auditLogService.logWithRequest(
      req,
      AuditAction.USER_CREATED,
      AuditEntityType.USER,
      userEmail,
      userId,
      userId,
      {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        organizationName: registerDto.organizationName,
      },
      AuditSeverity.LOW,
    );

    return result;
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSessions(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserSessionResponse> {
    const userId = req.user.sub;
    const sessionsResult = await this.authService.getUserSessions(userId);
    return sessionsResult as UserSessionResponse;
  }

  @Post('logout/all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;

    // Clear cookies
    res.clearCookie('access_token', SecurityConfig.cookies.accessToken());
    res.clearCookie('refresh_token', SecurityConfig.cookies.refreshToken());

    // Invalidate all tokens
    await this.authService.invalidateAllTokens(userId, req);

    // Log logout from all devices
    await this.auditLogService.logWithRequest(
      req,
      AuditAction.LOGOUT,
      AuditEntityType.AUTH,
      req.user.email,
      userId,
      undefined,
      { scope: 'all_devices' },
      AuditSeverity.MEDIUM,
    );

    return { message: 'Logged out from all devices' };
  }

  @Post('sessions/invalidate-others')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async invalidateOtherSessions(
    @Req() req: AuthenticatedRequest,
    @Query('keepCurrent') keepCurrent: string = 'true',
  ): Promise<InvalidateSessionsResult> {
    const userId = req.user.sub;
    const shouldKeepCurrent = keepCurrent.toLowerCase() === 'true';

    const result = await this.authService.invalidateOtherSessions(
      userId,
      shouldKeepCurrent,
      req,
    );

    // Log session invalidation
    const invalidatedCount = result.invalidatedCount || result.count || 0;

    await this.auditLogService.logWithRequest(
      req,
      AuditAction.LOGOUT,
      AuditEntityType.AUTH,
      req.user.email,
      userId,
      undefined,
      {
        scope: 'other_sessions',
        keepCurrent: shouldKeepCurrent,
        invalidatedCount,
      },
      AuditSeverity.MEDIUM,
    );

    return result;
  }

  @Get('debug-cookie')
  @Public()
  debugCookie(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): DebugCookieResponse {
    this.logger.log('🔍 Debug cookie endpoint called');

    // Set a test cookie
    res.cookie('test_cookie', 'hello123', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    // Return info about existing cookies
    const response: DebugCookieResponse = {
      message: 'Test cookie set',
      cookies: req.cookies,
      hasTestCookie: !!req.cookies?.test_cookie,
      timestamp: new Date().toISOString(),
    };
    return response;
  }
}
