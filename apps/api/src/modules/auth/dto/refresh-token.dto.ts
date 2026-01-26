import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @IsOptional()
  @IsString()
  csrfToken?: string;
}

export class CreateRefreshTokenDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  expiresIn?: number = 604800; // 7 days
}

export class ValidateRefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  organizationId: string;
}

export class RevokeRefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
