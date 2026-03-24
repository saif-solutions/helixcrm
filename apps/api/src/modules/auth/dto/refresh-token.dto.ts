// apps/api/src/modules/auth/dto/refresh-token.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsJWT,
} from 'class-validator';

/**
 * DTO for refreshing access tokens
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token obtained from previous authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    required: true,
  })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString({ message: 'Refresh token must be a string' })
  @IsJWT({ message: 'Invalid refresh token format' })
  refreshToken: string;

  @ApiPropertyOptional({
    description:
      'CSRF token for additional security (prevents cross-site request forgery)',
    example: 'xsrf-token-abc123xyz',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'CSRF token must be a string' })
  csrfToken?: string;
}

/**
 * DTO for creating a new refresh token (internal use)
 */
export class CreateRefreshTokenDto {
  @ApiProperty({
    description: 'User ID for token ownership',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'Organization ID for tenant isolation',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: true,
  })
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organizationId: string;

  @ApiPropertyOptional({
    description: 'IP address of the client (for audit and security)',
    example: '192.168.1.1',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent of the client (for device fingerprinting)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Token expiration time in seconds (default: 604800 = 7 days)',
    example: 604800,
    default: 604800,
    minimum: 60,
    maximum: 2592000, // 30 days
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Expiration must be a number' })
  @Min(60, { message: 'Expiration must be at least 60 seconds (1 minute)' })
  @Max(2592000, {
    message: 'Expiration cannot exceed 2,592,000 seconds (30 days)',
  })
  expiresIn?: number = 604800; // 7 days
}

/**
 * DTO for validating an existing refresh token
 */
export class ValidateRefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to validate',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    required: true,
  })
  @IsNotEmpty({ message: 'Token is required' })
  @IsString({ message: 'Token must be a string' })
  @IsJWT({ message: 'Invalid token format' })
  token: string;

  @ApiProperty({
    description: 'User ID to validate against',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'Organization ID for tenant isolation',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: true,
  })
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organizationId: string;
}

/**
 * DTO for revoking a refresh token
 */
export class RevokeRefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to revoke',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    required: true,
  })
  @IsNotEmpty({ message: 'Token is required' })
  @IsString({ message: 'Token must be a string' })
  @IsJWT({ message: 'Invalid token format' })
  token: string;

  @ApiPropertyOptional({
    description:
      'Reason for revocation (e.g., "logout", "password_change", "security_breach")',
    example: 'user_logout',
    enum: [
      'user_logout',
      'password_change',
      'security_breach',
      'admin_revocation',
    ],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}

/**
 * Response DTO for refresh token operation
 */
export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
      email: { type: 'string', example: 'user@example.com' },
      firstName: { type: 'string', nullable: true, example: 'John' },
      lastName: { type: 'string', nullable: true, example: 'Doe' },
      organizationId: {
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440001',
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        example: ['user:read', 'deal:write'],
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        example: ['SystemAdmin', 'User'],
      },
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organizationId: string;
    permissions: string[];
    roles: string[];
  };
}

/**
 * Response DTO for token validation
 */
export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid',
    example: true,
  })
  valid: boolean;

  @ApiPropertyOptional({
    description: 'User ID associated with the token (if valid)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Organization ID associated with the token (if valid)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Error message if token is invalid',
    example: 'Token expired',
    required: false,
  })
  error?: string;
}

/**
 * DTO for revoking all user tokens
 */
export class RevokeAllUserTokensDto {
  @ApiProperty({
    description: 'User ID to revoke all tokens for',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiPropertyOptional({
    description: 'Reason for revoking all tokens',
    example: 'password_change',
    enum: [
      'password_change',
      'security_breach',
      'admin_action',
      'user_request',
    ],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}

/**
 * DTO for rotating a refresh token (atomic operation)
 */
export class RotateRefreshTokenDto {
  @ApiProperty({
    description: 'Current refresh token (old token)',
    required: true,
  })
  @IsNotEmpty({ message: 'Old token is required' })
  @IsString({ message: 'Old token must be a string' })
  @IsJWT({ message: 'Invalid old token format' })
  oldToken: string;

  @ApiProperty({
    description: 'New refresh token (after rotation)',
    required: true,
  })
  @IsNotEmpty({ message: 'New token is required' })
  @IsString({ message: 'New token must be a string' })
  @IsJWT({ message: 'Invalid new token format' })
  newToken: string;

  @ApiProperty({
    description: 'User ID for token ownership',
    required: true,
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;
}
