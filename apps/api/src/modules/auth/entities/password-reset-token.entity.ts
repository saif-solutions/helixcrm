import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetToken {
  @ApiProperty({
    description: 'Unique identifier for the reset token',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with this reset token',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Organization ID for multi-tenant isolation',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Hashed reset token (never stored in plain text)',
    example: '$2b$10$hashed_token_string_here',
  })
  tokenHash: string;

  @ApiProperty({
    description: 'Email address the reset was requested for',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'IP address that requested the reset',
    example: '192.168.1.1',
    nullable: true,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent from the reset request',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'When the token was used to reset password',
    example: '2024-01-15T10:30:00.000Z',
    nullable: true,
  })
  usedAt?: Date;

  @ApiProperty({
    description: 'When the token expires (default: 1 hour from creation)',
    example: '2024-01-15T11:30:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'When the token was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the token was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

// Constants for password reset configuration
export const PASSWORD_RESET_CONFIG = {
  TOKEN_EXPIRY_HOURS: 1, // Token expires after 1 hour
  TOKEN_LENGTH: 32, // 32 character token
  MAX_ATTEMPTS_PER_DAY: 5, // Max 5 reset attempts per day per email
  RESET_WINDOW_HOURS: 24, // Track attempts within 24 hours
} as const;