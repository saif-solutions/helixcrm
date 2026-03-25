// apps/api/src/modules/contacts/dto/create-contact.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Helper functions for safe transformations
function safeTrim(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return typeof value === 'number' ? String(value).trim() : '';
}

function safeLowerCaseTrim(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }
  if (typeof value === 'number') {
    return String(value).toLowerCase().trim();
  }
  return '';
}

// Optional: Add phone regex pattern constant for reusability
const PHONE_REGEX = /^[\d\s\-+()]+$/;

export class CreateContactDto {
  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Transform(({ value }) => safeTrim(value))
  name: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }) => safeLowerCaseTrim(value))
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  @Matches(PHONE_REGEX, {
    message:
      'Phone number contains invalid characters. Allowed: digits, spaces, dashes, plus, parentheses',
  })
  @Transform(({ value }) => safeTrim(value))
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Inc',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Company name must not exceed 100 characters' })
  @Transform(({ value }) => safeTrim(value))
  company?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Senior Developer',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  @Transform(({ value }) => safeTrim(value))
  title?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Engineering',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Department must not exceed 100 characters' })
  @Transform(({ value }) => safeTrim(value))
  department?: string;
}
