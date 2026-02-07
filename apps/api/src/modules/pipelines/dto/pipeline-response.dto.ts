import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PipelineStageResponseDto } from "./pipeline-stage-response.dto";

export class PipelineResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Sales Pipeline 2024' })
  name: string;

  @ApiPropertyOptional({ example: 'Main sales pipeline for 2024' })
  description?: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: 'org_1234567890' })
  organizationId: string;

  @ApiProperty({ type: [PipelineStageResponseDto] })
  stages: PipelineStageResponseDto[];

  @ApiProperty({ example: 42 })
  dealCount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

export class PaginatedPipelineResponseDto {
  @ApiProperty({ type: [PipelineResponseDto] })
  data: PipelineResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 8 })
  pages: number;
}