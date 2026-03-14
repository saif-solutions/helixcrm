// apps/api/src/shared/guards/auth-throttler.guard.ts

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request } from 'express';

// ==================== INTERFACES ====================

interface RequestWithUser extends Request {
  user?: {
    id?: string;
    sub?: string;
    [key: string]: unknown;
  };
}

// ==================== AUTH THROTTLER GUARD ====================

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: RequestWithUser): Promise<string> {
    // If there's a user, use their ID for tracking
    if (req.user) {
      const userId = req.user.id ?? req.user.sub;
      if (userId) {
        return `user:${userId}`;
      }
    }

    // Otherwise use IP address
    const ip = req.ip ?? req.socket?.remoteAddress;
    return ip ?? 'unknown';
  }
}
