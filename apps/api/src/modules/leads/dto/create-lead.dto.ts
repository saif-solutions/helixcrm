// apps/api/src/modules/leads/dto/create-lead.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Local enum – decoupled from Prisma schema
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
}

// Optional: mapping to Prisma enum if needed in service
export const PrismaLeadStatusMap = {
  [LeadStatus.NEW]: 'new',
  [LeadStatus.CONTACTED]: 'contacted',
  [LeadStatus.QUALIFIED]: 'qualified',
} as const;

// Helper transform functions with explicit return type 'unknown' (no redundant union)
const trimString = (value: unknown): unknown => {
  if (typeof value === 'string') return value.trim();
  return value;
};

const normalizeEmail = (value: unknown): unknown => {
  if (typeof value === 'string') return value.toLowerCase().trim();
  return value;
};

export class CreateLeadDto {
  @ApiProperty({
    description: 'Lead name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Transform(({ value }) => trimString(value))
  name: string;

  @ApiPropertyOptional({
    description: 'Lead email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => normalizeEmail(value))
  email?: string;

  @ApiPropertyOptional({
    description: 'Lead phone number (international format recommended)',
    example: '+1234567890',
    maxLength: 20,
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone cannot exceed 20 characters' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be a valid international number (e.g., +1234567890)',
  })
  @Transform(({ value }) => trimString(value))
  phone?: string;

  @ApiProperty({
    description: 'Lead status',
    enum: LeadStatus,
    example: LeadStatus.NEW,
    enumName: 'LeadStatus',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(LeadStatus, {
    message: 'Status must be one of: new, contacted, qualified',
  })
  status: LeadStatus;

  @ApiPropertyOptional({
    description: 'Lead source',
    example: 'Website',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Source must be a string' })
  @MaxLength(100, { message: 'Source cannot exceed 100 characters' })
  @Transform(({ value }) => trimString(value))
  source?: string;
}
