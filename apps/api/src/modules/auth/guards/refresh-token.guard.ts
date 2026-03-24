// File: apps/api/src/modules/auth/guards/refresh-token.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtRefreshStrategy } from '../strategies/jwt-refresh.strategy';

// Define the user type that the refresh token strategy returns
interface RefreshTokenUser {
  id: string;
  email: string;
  organizationId: string;
  tokenVersion: number;
  refreshTokenVersion?: string;
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private jwtRefreshStrategy: JwtRefreshStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Validate the refresh token using our strategy
      const user = (await this.jwtRefreshStrategy.validate(
        request,
      )) as RefreshTokenUser;

      // Attach user to request
      request.user = user;

      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof UnauthorizedException
          ? error.message
          : 'Invalid refresh token';

      throw new UnauthorizedException(errorMessage);
    }
  }
}
