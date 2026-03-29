// apps/api/src/modules/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Helper function with return type 'unknown' (string | any other value)
const normalizeEmail = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }
  return value;
};

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(value))
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsString()
  role?: string = 'user'; // Legacy role field for backward compatibility

  // Note: RBAC roles are assigned separately via RBAC endpoints
}
