import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerStorage } from "@nestjs/throttler";
import { Reflector } from "@nestjs/core";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address for auth endpoints to prevent brute force
    return req.ip;
  }
}
