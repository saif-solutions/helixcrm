import { IsString, IsDate, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class TriggerWebhookDto {
  @IsString()
  event: string;

  @IsOptional()
  data?: unknown;

  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
