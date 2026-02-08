import { IsString, IsUUID, IsOptional } from 'class-validator';

export class MoveDealStageDto {
  @IsString({ message: 'Stage ID must be a string' })
  @IsUUID('4', { message: 'Stage ID must be a valid UUID' })
  stageId: string;

  @IsOptional()
  probability?: number;

  @IsOptional()
  notes?: string;
}
