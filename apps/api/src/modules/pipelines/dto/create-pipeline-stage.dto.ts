import { IsString, IsInt, IsOptional, Min, Max, MinLength, MaxLength } from "class-validator";

export class CreatePipelineStageDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsInt({ message: 'Order must be an integer' })
  @Min(0, { message: 'Order must be at least 0' })
  order: number;

  @IsInt({ message: 'Probability must be an integer' })
  @Min(0, { message: 'Probability must be at least 0' })
  @Max(100, { message: 'Probability cannot exceed 100' })
  probability: number;
}