// apps/api/src/modules/auth/services/account-lockout.service.ts

import { Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Define lock status result interface
interface LockStatusResult {
  isLocked: boolean;
  lockedUntil?: Date;
}

// Define record attempt result interface
interface RecordAttemptResult {
  isLocked: boolean;
  lockedUntil?: Date;
  attemptsRemaining: number;
}

// Define cache entry interface
interface LockStatusCacheEntry {
  lockedUntil: Date | null;
  timestamp: number;
  attempts: number;
}

// Constants for cache configuration
const CACHE_CONFIG = {
  /** Cache TTL in milliseconds (30 seconds) */
  TTL_MS: 30_000,
  /** Maximum cache size to prevent memory leaks */
  MAX_SIZE: 1000,
} as const;

@Injectable({ scope: Scope.DEFAULT })
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);
  private readonly maxAttempts: number;
  private readonly lockoutMinutes: number;

  // In-memory cache to reduce database hits for frequently locked accounts
  private readonly lockStatusCache = new Map<string, LockStatusCacheEntry>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.maxAttempts = parseInt(
      this.configService.get<string>('ACCOUNT_LOCKOUT_ATTEMPTS', '5'),
      10,
    );
    this.lockoutMinutes = parseInt(
      this.configService.get<string>('ACCOUNT_LOCKOUT_MINUTES', '15'),
      10,
    );
  }

  /**
   * Record a failed login attempt
   * @param userId - User ID to record attempt for
   * @returns Lock status after recording attempt
   */
  async recordFailedAttempt(userId: string): Promise<RecordAttemptResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { failedLoginAttempts: true, lockedUntil: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Check if already locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        // Update cache with current lock status
        this.updateCache(userId, {
          lockedUntil: user.lockedUntil,
          timestamp: Date.now(),
          attempts: user.failedLoginAttempts,
        });

        return {
          isLocked: true,
          lockedUntil: user.lockedUntil,
          attemptsRemaining: 0,
        };
      }

      // Reset if lockout period has passed
      let failedAttempts = user.failedLoginAttempts;
      let lockedUntil: Date | null = user.lockedUntil;

      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        // Lockout period expired, reset
        failedAttempts = 0;
        lockedUntil = null;
      }

      // Increment failed attempts
      failedAttempts += 1;

      // Check if we should lock the account
      if (failedAttempts >= this.maxAttempts) {
        lockedUntil = new Date(Date.now() + this.lockoutMinutes * 60 * 1000);
        this.logger.warn(
          `Account locked for user ${userId} until ${lockedUntil.toISOString()}`,
          {
            userId,
            failedAttempts,
            lockoutMinutes: this.lockoutMinutes,
            event: 'account_locked',
          },
        );
      }

      // Update user record
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
        select: { lockedUntil: true, failedLoginAttempts: true },
      });

      // Update cache with new status
      this.updateCache(userId, {
        lockedUntil: updatedUser.lockedUntil,
        timestamp: Date.now(),
        attempts: updatedUser.failedLoginAttempts,
      });

      const attemptsRemaining = Math.max(0, this.maxAttempts - failedAttempts);

      return {
        isLocked: !!lockedUntil && lockedUntil > new Date(),
        lockedUntil: lockedUntil || undefined,
        attemptsRemaining,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to record failed attempt:', errorMessage);
      throw error;
    }
  }

  /**
   * Reset failed attempts (on successful login)
   * @param userId - User ID to reset attempts for
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Invalidate cache for this user
      this.invalidateCache(userId);

      this.logger.debug(`Reset failed attempts for user ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to reset failed attempts:', errorMessage);
      // Don't throw, as this shouldn't block login
    }
  }

  /**
   * Check if account is locked (with caching)
   * @param userIdOrEmail - User ID or email to check
   * @returns Lock status result
   */
  async isAccountLocked(userIdOrEmail: string): Promise<LockStatusResult> {
    try {
      // Check cache first for performance
      const cached = this.lockStatusCache.get(userIdOrEmail);
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL_MS) {
        const isLocked =
          cached.lockedUntil !== null && cached.lockedUntil > new Date();
        this.logger.debug(`Cache hit for lock status: ${userIdOrEmail}`, {
          isLocked,
          cached: true,
        });
        return {
          isLocked,
          lockedUntil: isLocked ? cached.lockedUntil : undefined,
        };
      }

      // Check if input is email or userId
      const isEmail = userIdOrEmail.includes('@');

      let user: {
        lockedUntil: Date | null;
        failedLoginAttempts: number;
      } | null = null;

      if (isEmail) {
        user = await this.prisma.user.findFirst({
          where: {
            email: userIdOrEmail.toLowerCase().trim(),
            deletedAt: null,
          },
          select: { lockedUntil: true, failedLoginAttempts: true },
        });
      } else {
        user = await this.prisma.user.findUnique({
          where: { id: userIdOrEmail },
          select: { lockedUntil: true, failedLoginAttempts: true },
        });
      }

      if (!user) {
        return { isLocked: false };
      }

      const isLocked = !!user.lockedUntil && user.lockedUntil > new Date();
      const lockedUntil = isLocked ? user.lockedUntil : undefined;

      // Update cache with fresh data
      this.updateCache(userIdOrEmail, {
        lockedUntil: user.lockedUntil,
        timestamp: Date.now(),
        attempts: user.failedLoginAttempts,
      });

      this.logger.debug(`Cache miss for lock status: ${userIdOrEmail}`, {
        isLocked,
        cached: false,
      });

      return {
        isLocked,
        lockedUntil,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to check account lock status:', errorMessage);
      // Return safe default on error
      return { isLocked: false };
    }
  }

  /**
   * Manually lock an account (admin function)
   * @param userId - User ID to lock
   * @param minutes - Duration to lock (optional, uses configured default)
   * @returns Lock expiration date
   */
  async lockAccount(userId: string, minutes?: number): Promise<Date> {
    try {
      const lockoutMinutes = minutes || this.lockoutMinutes;
      const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil,
          failedLoginAttempts: this.maxAttempts,
        },
      });

      // Update cache with new lock status
      this.updateCache(userId, {
        lockedUntil,
        timestamp: Date.now(),
        attempts: this.maxAttempts,
      });

      this.logger.warn(
        `Manually locked account for user ${userId} until ${lockedUntil.toISOString()}`,
        {
          userId,
          lockoutMinutes,
          event: 'manual_account_lock',
        },
      );
      return lockedUntil;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to lock account:', errorMessage);
      throw error;
    }
  }

  /**
   * Manually unlock an account (admin function)
   * @param userId - User ID to unlock
   */
  async unlockAccount(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });

      // Invalidate cache for this user
      this.invalidateCache(userId);

      this.logger.warn(`Manually unlocked account for user ${userId}`, {
        userId,
        event: 'manual_account_unlock',
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to unlock account:', errorMessage);
      throw error;
    }
  }

  /**
   * Get lockout configuration
   * @returns Current lockout configuration
   */
  getConfig(): { maxAttempts: number; lockoutMinutes: number } {
    return {
      maxAttempts: this.maxAttempts,
      lockoutMinutes: this.lockoutMinutes,
    };
  }

  /**
   * Get current lock status for a user (with detailed info)
   * @param userId - User ID to get status for
   * @returns Detailed lock status
   */
  async getDetailedLockStatus(userId: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    failedAttempts: number;
    attemptsRemaining: number;
    maxAttempts: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true, failedLoginAttempts: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const isLocked = !!user.lockedUntil && user.lockedUntil > new Date();
    const attemptsRemaining = Math.max(
      0,
      this.maxAttempts - (user.failedLoginAttempts || 0),
    );

    return {
      isLocked,
      lockedUntil: isLocked ? user.lockedUntil : undefined,
      failedAttempts: user.failedLoginAttempts || 0,
      attemptsRemaining,
      maxAttempts: this.maxAttempts,
    };
  }

  /**
   * Update cache entry for a user
   * @param key - Cache key (userId or email)
   * @param entry - Cache entry data
   */
  private updateCache(key: string, entry: LockStatusCacheEntry): void {
    // Limit cache size to prevent memory leaks
    if (this.lockStatusCache.size >= CACHE_CONFIG.MAX_SIZE) {
      const oldestKey = Array.from(this.lockStatusCache.keys())[0];
      if (oldestKey) {
        this.lockStatusCache.delete(oldestKey);
        this.logger.debug(`Cache evicted oldest entry: ${oldestKey}`);
      }
    }

    this.lockStatusCache.set(key, entry);
  }

  /**
   * Invalidate cache entry for a user
   * @param key - Cache key (userId or email)
   */
  private invalidateCache(key: string): void {
    this.lockStatusCache.delete(key);
    this.logger.debug(`Cache invalidated for: ${key}`);
  }
}
