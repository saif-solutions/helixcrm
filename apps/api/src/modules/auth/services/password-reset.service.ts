// apps/api/src/modules/auth/services/password-reset.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  ValidateResetTokenDto,
} from '../dto/password-reset.dto';
import { PASSWORD_RESET_CONFIG } from '../entities/password-reset-token.entity';
import { PasswordResetToken as PrismaPasswordResetToken } from '@prisma/client';

// Password reset configuration
const RESET_CONFIG = {
  /** Number of bcrypt rounds for token hashing */
  BCRYPT_ROUNDS: 10,
  /** Maximum token length for logging */
  MAX_TOKEN_LOG_LENGTH: 20,
  /** Maximum email length for logging */
  MAX_EMAIL_LOG_LENGTH: 50,
} as const;

// Rate limiting constants
const RATE_LIMIT = {
  /** Maximum attempts per day */
  MAX_ATTEMPTS_PER_DAY: 5,
  /** Reset window in hours */
  WINDOW_HOURS: 24,
} as const;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Request a password reset for a user
   * @param dto - Request password reset DTO
   * @param ipAddress - Client IP address for audit
   * @param userAgent - Client user agent for audit
   * @returns Success message (always returns success for security)
   */
  async requestPasswordReset(
    dto: RequestPasswordResetDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const { email } = dto;
    const normalizedEmail = this.normalizeEmail(email);

    try {
      // Check if user exists
      const user = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          deletedAt: null,
        },
        select: {
          id: true,
          organizationId: true,
          email: true,
        },
      });

      // For security, always return success even if user doesn't exist
      if (!user) {
        this.logger.warn(
          `Password reset requested for non-existent email: ${this.maskEmail(normalizedEmail)} from IP: ${ipAddress}`,
        );
        return this.getSuccessResponse();
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(normalizedEmail);
      if (!rateLimitCheck.allowed) {
        this.logger.warn(
          `Rate limit exceeded for password reset: ${this.maskEmail(normalizedEmail)} (${rateLimitCheck.attempts} attempts)`,
        );
        throw new ConflictException(rateLimitCheck.message);
      }

      // Generate reset token
      const { rawToken, tokenHash } = await this.generateResetToken();

      // Calculate expiry
      const expiresAt = this.calculateExpiryDate();

      // Create reset token record
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          email: normalizedEmail,
          tokenHash,
          ipAddress,
          userAgent,
          expiresAt,
        },
      });

      // Log successful request
      this.logger.log(
        `Password reset requested for user: ${user.id} (${this.maskEmail(normalizedEmail)})`,
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress,
          userAgent,
          event: 'password_reset_requested',
        },
      );

      // In production, send email with reset link
      // For MVP, log the token (remove in production!)
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `Password reset token for ${this.maskEmail(normalizedEmail)}: ${rawToken.substring(0, RESET_CONFIG.MAX_TOKEN_LOG_LENGTH)}...`,
        );
      }

      return this.getSuccessResponse();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Password reset request failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          email: this.maskEmail(normalizedEmail),
          ipAddress,
          userAgent,
        },
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      // Return success even on error to prevent email enumeration
      return this.getSuccessResponse();
    }
  }

  /**
   * Validate a password reset token
   * @param dto - Validate token DTO
   * @returns Validation result with email if valid
   */
  async validateResetToken(
    dto: ValidateResetTokenDto,
  ): Promise<{ valid: boolean; email?: string }> {
    const { token } = dto;

    try {
      // Find all valid tokens
      const resetTokens = await this.findValidTokens();

      // Check each token
      for (const resetToken of resetTokens) {
        const isValid = await bcrypt.compare(token, resetToken.tokenHash);
        if (isValid) {
          // Get user email for response
          const user = await this.prisma.user.findUnique({
            where: { id: resetToken.userId },
            select: { email: true },
          });

          this.logger.debug(
            `Reset token validated for user: ${resetToken.userId}`,
            {
              userId: resetToken.userId,
              tokenId: resetToken.id,
            },
          );

          return {
            valid: true,
            email: user?.email || resetToken.email,
          };
        }
      }

      this.logger.debug('Invalid reset token validation attempt');
      return { valid: false };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token validation failed: ${errorMessage}`);
      return { valid: false };
    }
  }

  /**
   * Reset password using a valid token
   * @param dto - Reset password DTO
   * @returns Success message
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword, confirmPassword } = dto;

    try {
      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        throw new BadRequestException('Passwords do not match.');
      }

      // Find valid tokens
      const resetTokens = await this.findValidTokens();

      // Find the valid token
      const validToken = await this.findValidResetToken(token, resetTokens);
      if (!validToken) {
        throw new NotFoundException('Invalid or expired reset token.');
      }

      // Verify user still exists and is active
      const user = await this.verifyUserExists(validToken.userId);
      if (!user) {
        throw new NotFoundException('User account no longer exists.');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(
        newPassword,
        RESET_CONFIG.BCRYPT_ROUNDS,
      );

      // Update user password and invalidate all sessions
      await this.updateUserPassword(validToken.userId, passwordHash);

      // Mark token as used
      await this.markTokenAsUsed(validToken.id);

      // Log successful password reset
      this.logger.log(
        `Password reset successful for user: ${validToken.userId}`,
        {
          userId: validToken.userId,
          organizationId: user.organizationId,
          event: 'password_reset_completed',
        },
      );

      return {
        message:
          'Password has been reset successfully. You can now login with your new password.',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password reset failed: ${errorMessage}`);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to reset password. Please try again.',
      );
    }
  }

  /**
   * Clean up expired reset tokens (cron job)
   * @returns Number of deleted tokens
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { createdAt: { lt: oneDayAgo } },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} expired password reset tokens`,
        );
      }

      return { deleted: result.count };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cleanup expired tokens: ${errorMessage}`);
      return { deleted: 0 };
    }
  }

  /**
   * Check if user account is locked
   * @param email - User email
   * @returns Lock status
   */
  async isAccountLocked(
    email: string,
  ): Promise<{ locked: boolean; until?: Date }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const user = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          deletedAt: null,
        },
        select: { lockedUntil: true },
      });

      if (!user) {
        return { locked: false };
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return { locked: true, until: user.lockedUntil };
      }

      return { locked: false };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check account lock status: ${errorMessage}`);
      return { locked: false };
    }
  }

  /**
   * Reset failed login attempts (call this on successful login)
   * @param userId - User ID
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to reset failed login attempts: ${errorMessage}`,
      );
      // Don't throw - this is non-critical
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Normalize email (lowercase and trim)
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Mask email for logging (show only first 3 chars and domain)
   */
  private maskEmail(email: string): string {
    if (email.length <= 5) return '***';
    const [localPart, domain] = email.split('@');
    const maskedLocal =
      localPart.substring(0, Math.min(3, localPart.length)) + '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Get standard success response
   */
  private getSuccessResponse(): { message: string } {
    return {
      message:
        'If an account exists with this email, you will receive a reset link shortly.',
    };
  }

  /**
   * Check rate limit for password reset attempts
   */
  private async checkRateLimit(email: string): Promise<{
    allowed: boolean;
    attempts: number;
    message?: string;
  }> {
    const twentyFourHoursAgo = new Date(
      Date.now() - RATE_LIMIT.WINDOW_HOURS * 60 * 60 * 1000,
    );

    const recentAttempts = await this.prisma.passwordResetToken.count({
      where: {
        email,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (recentAttempts >= RATE_LIMIT.MAX_ATTEMPTS_PER_DAY) {
      return {
        allowed: false,
        attempts: recentAttempts,
        message: 'Too many reset attempts. Please try again later.',
      };
    }

    return {
      allowed: true,
      attempts: recentAttempts,
    };
  }

  /**
   * Generate a secure reset token
   */
  private async generateResetToken(): Promise<{
    rawToken: string;
    tokenHash: string;
  }> {
    const rawToken = randomBytes(PASSWORD_RESET_CONFIG.TOKEN_LENGTH).toString(
      'hex',
    );
    const tokenHash = await bcrypt.hash(rawToken, RESET_CONFIG.BCRYPT_ROUNDS);

    return { rawToken, tokenHash };
  }

  /**
   * Calculate token expiry date
   */
  private calculateExpiryDate(): Date {
    return new Date(
      Date.now() + PASSWORD_RESET_CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );
  }

  /**
   * Find all valid (unused, unexpired) reset tokens
   */
  private async findValidTokens(): Promise<PrismaPasswordResetToken[]> {
    return this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Find a valid reset token by comparing with raw token
   */
  private async findValidResetToken(
    rawToken: string,
    tokens: PrismaPasswordResetToken[],
  ): Promise<PrismaPasswordResetToken | null> {
    for (const token of tokens) {
      const isValid = await bcrypt.compare(rawToken, token.tokenHash);
      if (isValid) {
        return token;
      }
    }
    return null;
  }

  /**
   * Verify user exists and is active
   */
  private async verifyUserExists(userId: string): Promise<{
    id: string;
    organizationId: string;
  } | null> {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });
  }

  /**
   * Update user password and invalidate all sessions
   */
  private async updateUserPassword(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          lastPasswordResetAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Mark a reset token as used
   */
  private async markTokenAsUsed(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: {
        usedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
