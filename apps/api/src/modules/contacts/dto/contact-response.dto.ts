// apps/api/src/modules/contacts/dto/contact-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({
    description: 'Contact ID',
    example: 'c1234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 255,
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 255,
  })
  lastName: string;

  @ApiProperty({
    description: 'Full name (concatenation of first and last name)',
    example: 'John Doe',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Inc',
    maxLength: 255,
  })
  company?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Senior Developer',
    maxLength: 255,
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Engineering',
    maxLength: 255,
  })
  department?: string;

  @ApiProperty({
    description: 'Whether the contact is active',
    example: true,
    default: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org123',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Deletion timestamp (soft delete)',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  deletedAt?: Date;
}

// Optional: Add a paginated response wrapper DTO for consistent API responses
export class PaginatedContactResponseDto {
  @ApiProperty({
    description: 'Array of contacts',
    type: [ContactResponseDto],
  })
  data: ContactResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 20 },
      total: { type: 'number', example: 100 },
      pages: { type: 'number', example: 5 },
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
