// File: apps/api/src/modules/auth/guards/refresh-token.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtRefreshStrategy } from '../strategies/jwt-refresh.strategy';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private jwtRefreshStrategy: JwtRefreshStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // Validate the refresh token using our strategy
      const user = await this.jwtRefreshStrategy.validate(request);
      
      // Attach user to request
      request.user = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof UnauthorizedException 
          ? error.message 
          : 'Invalid refresh token'
      );
    }
  }
}