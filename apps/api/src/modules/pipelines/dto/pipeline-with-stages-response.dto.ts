import { ApiProperty } from '@nestjs/swagger';

class PipelineStageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  probability: number;

  @ApiProperty()
  pipelineId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PipelineWithStagesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ type: [PipelineStageResponseDto] })
  stages: PipelineStageResponseDto[];

  @ApiProperty()
  dealCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
