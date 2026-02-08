// File: apps/api/src/modules/auth/services/account-lockout.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AccountLockoutService {
  private readonly logger = new Logger(AccountLockoutService.name);
  private readonly maxAttempts: number;
  private readonly lockoutMinutes: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.maxAttempts = parseInt(
      this.configService.get<string>('ACCOUNT_LOCKOUT_ATTEMPTS', '5'),
    );
    this.lockoutMinutes = parseInt(
      this.configService.get<string>('ACCOUNT_LOCKOUT_MINUTES', '15'),
    );
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(userId: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    attemptsRemaining: number;
  }> {
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
          `Account locked for user ${userId} until ${lockedUntil}`,
        );
      }

      // Update user record
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      const attemptsRemaining = Math.max(0, this.maxAttempts - failedAttempts);

      return {
        isLocked: !!lockedUntil && lockedUntil > new Date(),
        lockedUntil: lockedUntil || undefined,
        attemptsRemaining,
      };
    } catch (error) {
      this.logger.error('Failed to record failed attempt:', error);
      throw error;
    }
  }

  /**
   * Reset failed attempts (on successful login)
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

      this.logger.debug(`Reset failed attempts for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to reset failed attempts:', error);
      // Don't throw, as this shouldn't block login
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(
    userIdOrEmail: string,
  ): Promise<{ isLocked: boolean; lockedUntil?: Date }> {
    try {
      // Check if input is email or userId
      const isEmail = userIdOrEmail.includes('@');

      let user: any;
      if (isEmail) {
        user = await this.prisma.user.findFirst({
          where: {
            email: userIdOrEmail.toLowerCase().trim(),
            deletedAt: null,
          },
          select: { lockedUntil: true },
        });
      } else {
        user = await this.prisma.user.findUnique({
          where: { id: userIdOrEmail },
          select: { lockedUntil: true },
        });
      }

      if (!user) {
        return { isLocked: false };
      }

      const isLocked = !!user.lockedUntil && user.lockedUntil > new Date();

      return {
        isLocked,
        lockedUntil: isLocked ? user.lockedUntil : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to check account lock status:', error);
      return { isLocked: false };
    }
  }

  /**
   * Manually lock an account (admin function)
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

      this.logger.warn(
        `Manually locked account for user ${userId} until ${lockedUntil}`,
      );
      return lockedUntil;
    } catch (error) {
      this.logger.error('Failed to lock account:', error);
      throw error;
    }
  }

  /**
   * Manually unlock an account (admin function)
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

      this.logger.warn(`Manually unlocked account for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to unlock account:', error);
      throw error;
    }
  }

  /**
   * Get lockout configuration
   */
  getConfig(): { maxAttempts: number; lockoutMinutes: number } {
    return {
      maxAttempts: this.maxAttempts,
      lockoutMinutes: this.lockoutMinutes,
    };
  }
}
