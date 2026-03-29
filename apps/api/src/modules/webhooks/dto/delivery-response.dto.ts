import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DeliveryResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  webhookId: string;

  @ApiProperty()
  @Expose()
  event: string;

  @ApiProperty()
  @Expose()
  status: 'pending' | 'processing' | 'success' | 'failed';

  @ApiPropertyOptional()
  @Expose()
  statusCode?: number;

  @ApiPropertyOptional()
  @Expose()
  response?: string;

  @ApiPropertyOptional()
  @Expose()
  error?: string;

  @ApiProperty()
  @Expose()
  attemptedAt: Date;

  @ApiPropertyOptional()
  @Expose()
  completedAt?: Date;

  @ApiProperty()
  @Expose()
  retryCount: number;
}
