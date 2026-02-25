import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveRoleDto {
  @ApiProperty({
    description: 'User ID to remove role from',
    example: 'user_123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Role ID to remove',
    example: 'role_456',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
