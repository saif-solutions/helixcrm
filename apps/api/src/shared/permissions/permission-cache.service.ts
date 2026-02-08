// apps/api/src/shared/permissions/permission-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface CachedPermissions {
  permissions: string[];
  expiresAt: number;
}

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private cache = new Map<string, CachedPermissions>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  async get(userId: string): Promise<string[] | null> {
    const cached = this.cache.get(userId);

    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(userId);
      return null;
    }

    return cached.permissions;
  }

  async set(userId: string, permissions: string[]): Promise<void> {
    const cached: CachedPermissions = {
      permissions,
      expiresAt: Date.now() + this.TTL,
    };

    this.cache.set(userId, cached);
    this.logger.debug(
      `Cached permissions for user ${userId} (${permissions.length} permissions)`,
    );
  }

  async invalidate(userId: string): Promise<void> {
    this.cache.delete(userId);
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }

  async invalidateAll(): Promise<void> {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Invalidated all permission caches (${count} users)`);
  }

  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.TTL,
    };
  }
}
