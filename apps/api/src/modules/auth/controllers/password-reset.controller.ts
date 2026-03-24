// apps/api/src/modules/auth/controllers/password-reset.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasswordResetService } from '../services/password-reset.service';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  ValidateResetTokenDto,
} from '../dto/password-reset.dto';

// Response interfaces for Swagger
class PasswordResetResponseDto {
  message: string;
}

class ValidateTokenResponseDto {
  valid: boolean;
  email?: string;
}

@ApiTags('Authentication - Password Reset')
@Controller('auth/password-reset')
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);

  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Request password reset email',
    description:
      'Sends a password reset email to the user if the account exists. ' +
      'For security reasons, this endpoint always returns the same message even if the email does not exist.',
  })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiHeader({
    name: 'user-agent',
    description: 'User agent of the client (for audit)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent (if account exists)',
    type: PasswordResetResponseDto,
    schema: {
      example: {
        message:
          'If an account exists with this email, you will receive a reset link shortly.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many reset attempts. Rate limit: 3 requests per minute.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Too many reset attempts within 24 hours. Maximum 5 attempts per day.',
  })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<PasswordResetResponseDto> {
    try {
      this.logger.debug(
        `Password reset requested for email: ${this.maskEmail(dto.email)} from IP: ${ipAddress}`,
      );

      return await this.passwordResetService.requestPasswordReset(
        dto,
        ipAddress,
        userAgent,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password reset request failed: ${errorMessage}`);
      throw error;
    }
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate password reset token',
    description:
      'Checks if a password reset token is valid and returns the associated email if valid.',
  })
  @ApiBody({ type: ValidateResetTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token validation result',
    type: ValidateTokenResponseDto,
    schema: {
      examples: {
        valid: {
          summary: 'Valid token',
          value: { valid: true, email: 'user@example.com' },
        },
        invalid: {
          summary: 'Invalid token',
          value: { valid: false },
        },
      },
    },
  })
  async validateResetToken(
    @Body() dto: ValidateResetTokenDto,
  ): Promise<ValidateTokenResponseDto> {
    try {
      this.logger.debug('Reset token validation requested');
      return await this.passwordResetService.validateResetToken(dto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reset token validation failed: ${errorMessage}`);
      return { valid: false };
    }
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Reset password using token',
    description:
      "Resets the user's password using a valid reset token. " +
      'This will invalidate all existing sessions and require re-login.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
    type: PasswordResetResponseDto,
    schema: {
      example: {
        message:
          'Password has been reset successfully. You can now login with your new password.',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token or passwords do not match',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token expired or user not found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many reset attempts. Rate limit: 3 requests per minute.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<PasswordResetResponseDto> {
    try {
      this.logger.debug('Password reset attempt with token');
      return await this.passwordResetService.resetPassword(dto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Password reset failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Mask email for logging (show only first 3 chars and domain)
   */
  private maskEmail(email: string): string {
    if (!email || email.length <= 5) return '***';
    const [localPart, domain] = email.split('@');
    const maskedLocal =
      localPart.substring(0, Math.min(3, localPart.length)) + '***';
    return `${maskedLocal}@${domain}`;
  }
}
