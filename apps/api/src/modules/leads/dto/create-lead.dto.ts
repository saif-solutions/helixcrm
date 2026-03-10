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
} from 'class-validator';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';

export { PrismaLeadStatus as LeadStatus };

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
  name: string;

  @ApiPropertyOptional({
    description: 'Lead email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Lead phone number',
    example: '+1234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone cannot exceed 20 characters' })
  phone?: string;

  @ApiProperty({
    description: 'Lead status',
    enum: PrismaLeadStatus,
    example: 'new',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(PrismaLeadStatus, {
    message: 'Status must be one of: new, contacted, qualified',
  })
  status: PrismaLeadStatus;

  @ApiPropertyOptional({
    description: 'Lead source',
    example: 'Website',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Source must be a string' })
  @MaxLength(100, { message: 'Source cannot exceed 100 characters' })
  source?: string;
}
