import { Controller, Post, Body, HttpCode, HttpStatus, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasswordResetService } from '../services/password-reset.service';
import { RequestPasswordResetDto, ResetPasswordDto, ValidateResetTokenDto } from '../dto/password-reset.dto';

@ApiTags('Authentication - Password Reset')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset email sent (if account exists)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If an account exists with this email, you will receive a reset link shortly.' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.TOO_MANY_REQUESTS, 
    description: 'Too many reset attempts' 
  })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.passwordResetService.requestPasswordReset(dto, ipAddress, userAgent);
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        email: { type: 'string', example: 'user@example.com', nullable: true }
      }
    }
  })
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    return this.passwordResetService.validateResetToken(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password has been reset successfully. You can now login with your new password.' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid token or passwords do not match' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Token expired or user not found' 
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }
}