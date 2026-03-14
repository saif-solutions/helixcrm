import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  name: string;

  @IsString()
  @IsUrl()
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
