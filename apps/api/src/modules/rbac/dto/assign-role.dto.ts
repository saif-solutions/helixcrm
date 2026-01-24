import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'User ID to assign role to',
    example: 'user_123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Role ID to assign',
    example: 'role_456',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for the assignment',
    example: { assignedBy: 'admin@example.com', reason: 'Promotion' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}