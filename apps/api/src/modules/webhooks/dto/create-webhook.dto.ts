import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'Order Created Webhook' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://api.example.com/webhook' })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  url: string;

  @ApiProperty({ example: ['order.created', 'order.updated'] })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  retryCount?: number;

  @ApiPropertyOptional({ minimum: 1000, maximum: 60000, default: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;

  @ApiPropertyOptional({ example: { 'X-Custom-Header': 'value' } })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
