import { ApiProperty } from "@nestjs/swagger";
import { PipelineResponseDto } from "./pipeline-response.dto";

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