// apps/api/src/shared/permissions/permission-cache.service.ts

import { Injectable, Logger } from '@nestjs/common';

/**
 * Cached permissions structure
 */
interface CachedPermissions {
  permissions: string[];
  expiresAt: number;
}

/**
 * Permission Cache Service
 *
 * Provides in-memory caching for user permissions to reduce database load.
 * Features:
 * - TTL-based expiration (5 minutes default)
 * - Synchronous operations (no async needed)
 * - Cache invalidation by user or globally
 * - Cache statistics for monitoring
 *
 * @example
 * ```typescript
 * // In service
 * const cached = this.cache.get(userId);
 * if (cached) {
 *   return cached;
 * }
 * const permissions = await this.fetchFromDB(userId);
 * this.cache.set(userId, permissions);
 * ```
 */
@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly cache = new Map<string, CachedPermissions>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Get cached permissions for a user
   * @returns Permissions array or null if not found or expired
   */
  get(userId: string): string[] | null {
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

  /**
   * Set permissions in cache for a user
   */
  set(userId: string, permissions: string[]): void {
    const cached: CachedPermissions = {
      permissions,
      expiresAt: Date.now() + this.TTL,
    };

    this.cache.set(userId, cached);

    if (!this.isProduction) {
      this.logger.debug(
        `Cached permissions for user ${this.maskUserId(userId)} (${permissions.length} permissions)`,
      );
    }
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);

    if (!this.isProduction) {
      this.logger.debug(
        `Invalidated cache for user ${this.maskUserId(userId)}`,
      );
    }
  }

  /**
   * Invalidate all cached permissions
   */
  invalidateAll(): void {
    const count = this.cache.size;
    this.cache.clear();

    if (!this.isProduction) {
      this.logger.debug(`Invalidated all permission caches (${count} users)`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.TTL,
    };
  }

  /**
   * Mask user ID for logging
   */
  private maskUserId(userId: string): string {
    if (userId.length <= 8) return '****';
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
}
