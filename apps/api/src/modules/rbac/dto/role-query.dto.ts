import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RoleQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by system roles',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Search by role name',
    example: 'manager',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include user count in response',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeUserCount?: boolean;
}
