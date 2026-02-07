import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePipelineDto {
  @ApiProperty({
    description: 'Pipeline name',
    example: 'Sales Pipeline 2024',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string = '';  // Initialize with default value

  @ApiPropertyOptional({
    description: 'Pipeline description',
    example: 'Main sales pipeline for 2024',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this pipeline is the default for the organization',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean' })
  isDefault?: boolean = false;  // Initialize with default value
}