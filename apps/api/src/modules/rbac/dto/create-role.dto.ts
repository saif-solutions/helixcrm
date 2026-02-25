import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Senior Sales Manager',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manages sales team and deals',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Permission codes to assign to role',
    example: ['deals.read', 'deals.write', 'pipelines.manage'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Whether this is a system role (cannot be deleted)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
