// apps/api/src/modules/contacts/dto/bulk-contact.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsArray,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { CreateContactDto } from './create-contact.dto';
import { UpdateContactDto } from './update-contact.dto';

export class BulkCreateContactsDto {
  @ApiProperty({
    description: 'Array of contacts to create',
    type: [CreateContactDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts: CreateContactDto[];
}

export class BulkUpdateContactsDto {
  @ApiProperty({
    description: 'Array of contact updates with IDs',
    type: 'array',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Updated',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  updates: Array<{ id: string } & UpdateContactDto>;
}

// DTO for individual update items for better validation
export class BulkUpdateItemDto {
  @ApiProperty({
    description: 'Contact ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Inc',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Software Engineer',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Is contact active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Update BulkUpdateContactsDto to use the new DTO
export class BulkUpdateContactsDtoV2 {
  @ApiProperty({
    description: 'Array of contact updates with IDs',
    type: [BulkUpdateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}

export class BulkDeleteContactsDto {
  @ApiProperty({
    description: 'Array of contact IDs to delete',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-8b9c-0a1b2c3d4e5f',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID' })
  ids: string[];

  @ApiPropertyOptional({
    description: 'Whether to hard delete or soft delete',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hardDelete?: boolean;
}

export class ExportContactsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date filter',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search term',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'json'],
    default: 'csv',
  })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'csv';

  @ApiPropertyOptional({
    description: 'Maximum records to export',
    minimum: 1,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  limit?: number = 1000;
}
