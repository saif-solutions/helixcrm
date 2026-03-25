// apps/api/src/modules/contacts/dto/update-contact.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

// Helper function for safe boolean transformation
function safeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @ApiPropertyOptional({
    description: 'Whether the contact is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  @Transform(({ value }) => safeBoolean(value))
  isActive?: boolean;
}
