// apps/api/src/modules/demo/demo.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../../shared/decorators/require-permission.decorator';
import { Throttle } from '@nestjs/throttler';
import getDemoConfig from '../../config/demo.config'; // default import
import type { DemoConfig } from '../../config/demo.config'; // type import
import { AuthService } from '../auth/auth.service';
import { Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';

@Controller('demo')
export class DemoController {
  constructor(private readonly authService: AuthService) {}

  @Get('credentials')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  getDemoCredentials() {
    const config: DemoConfig = getDemoConfig();

    if (!config.enabled) {
      return {
        enabled: false,
        message: 'Demo mode is disabled',
      };
    }

    return {
      enabled: true,
      accounts: [
        {
          role: 'Admin',
          email: config.adminEmail,
        },
        {
          role: 'User',
          email: config.userEmail,
        },
      ],
    };
  }

  @Post('login/:role')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async loginWithDemo(
    @Param('role') role: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const config: DemoConfig = getDemoConfig();

    if (!config.enabled) {
      throw new UnauthorizedException('Demo mode is disabled');
    }

    const credentials =
      role.toLowerCase() === 'admin'
        ? { email: config.adminEmail, password: config.adminPassword }
        : { email: config.userEmail, password: config.userPassword };

    return this.authService.login(credentials, res, req);
  }
}
