import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineStageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Qualification' })
  name: string;

  @ApiPropertyOptional({ example: 'Initial contact and qualification' })
  description?: string;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: 10 })
  probability: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  pipelineId: string;

  @ApiProperty({ example: 5 })
  dealCount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
