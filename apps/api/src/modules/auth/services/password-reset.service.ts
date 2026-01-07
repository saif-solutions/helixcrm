import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RequestPasswordResetDto, ResetPasswordDto, ValidateResetTokenDto } from '../dto/password-reset.dto';
import { PASSWORD_RESET_CONFIG } from '../entities/password-reset-token.entity';
import { PasswordResetToken as PrismaPasswordResetToken } from '@prisma/client';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Request a password reset for a user
   */
  async requestPasswordReset(dto: RequestPasswordResetDto, ipAddress?: string, userAgent?: string): Promise<{ message: string }> {
    const { email } = dto;
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });
    
    // For security, always return success even if user doesn't exist
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${normalizedEmail} from IP: ${ipAddress}`);
      return { message: 'If an account exists with this email, you will receive a reset link shortly.' };
    }
    
    // Check rate limiting: max 5 attempts per day per email
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = await this.prisma.passwordResetToken.count({
      where: {
        email: normalizedEmail,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    
    if (recentAttempts >= PASSWORD_RESET_CONFIG.MAX_ATTEMPTS_PER_DAY) {
      this.logger.warn(`Rate limit exceeded for password reset: ${normalizedEmail} (${recentAttempts} attempts)`);
      throw new ConflictException('Too many reset attempts. Please try again later.');
    }
    
    // Generate reset token
    const rawToken = randomBytes(PASSWORD_RESET_CONFIG.TOKEN_LENGTH).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    
    // Calculate expiry (1 hour from now)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    
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
    
    // Log the request (but not the token)
    this.logger.log(`Password reset requested for user: ${user.id} (${normalizedEmail})`);
    
    // In production, send email with reset link
    // For MVP, we'll log the token (remove in production!)
    this.logger.debug(`Password reset token for ${normalizedEmail}: ${rawToken}`);
    
    return { 
      message: 'If an account exists with this email, you will receive a reset link shortly.' 
    };
  }

  /**
   * Validate a password reset token
   */
  async validateResetToken(dto: ValidateResetTokenDto): Promise<{ valid: boolean; email?: string }> {
    const { token } = dto;
    
    // Find all unexpired, unused tokens
    const resetTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    
    // Check each token and get user email
    for (const resetToken of resetTokens) {
      const isValid = await bcrypt.compare(token, resetToken.tokenHash);
      if (isValid) {
        // Get user email
        const user = await this.prisma.user.findUnique({
          where: { id: resetToken.userId },
          select: { email: true },
        });
        
        return { 
          valid: true, 
          email: user?.email || resetToken.email 
        };
      }
    }
    
    return { valid: false };
  }

  /**
   * Reset password using a valid token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword, confirmPassword } = dto;
    
    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
    
    // Find all unexpired, unused tokens
    const resetTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    
    // Find the valid token
    let validToken: PrismaPasswordResetToken | null = null;
    for (const resetToken of resetTokens) {
      const isValid = await bcrypt.compare(token, resetToken.tokenHash);
      if (isValid) {
        validToken = resetToken;
        break;
      }
    }
    
    if (!validToken) {
      throw new NotFoundException('Invalid or expired reset token.');
    }
    
    // Check if user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { 
        id: validToken.userId,
        deletedAt: null,
      },
    });
    
    if (!user) {
      throw new NotFoundException('User account no longer exists.');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user password and increment token version (invalidates all sessions)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validToken.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          lastPasswordResetAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: validToken.id },
        data: {
          usedAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);
    
    // Log the password reset
    this.logger.log(`Password reset successful for user: ${validToken.userId}`);
    
    return { 
      message: 'Password has been reset successfully. You can now login with your new password.' 
    };
  }

  /**
   * Clean up expired reset tokens (cron job)
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: oneDayAgo } },
        ],
      },
    });
    
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired password reset tokens`);
    }
    
    return { deleted: result.count };
  }

  /**
   * Check if user account is locked
   */
  async isAccountLocked(email: string): Promise<{ locked: boolean; until?: Date }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        deletedAt: null,
      },
    });
    
    if (!user) {
      return { locked: false };
    }
    
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { locked: true, until: user.lockedUntil };
    }
    
    return { locked: false };
  }

  /**
   * Reset failed login attempts (call this on successful login)
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });
  }
}