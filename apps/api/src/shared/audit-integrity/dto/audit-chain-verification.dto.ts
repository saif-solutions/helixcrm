import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditChainVerificationDto {
  @ApiProperty({
    description: 'Whether the chain is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Verification timestamp',
    example: '2024-02-04T10:30:00.000Z',
  })
  verifiedAt: Date;

  @ApiProperty({
    description: 'Total events in the chain',
    example: 150,
  })
  totalEvents: number;

  @ApiPropertyOptional({
    description: 'Index where chain is broken (if invalid)',
    example: 125,
  })
  brokenAtIndex?: number;

  @ApiPropertyOptional({
    description: 'Hash at broken index (if invalid)',
    example: 'abc123def456...',
  })
  brokenAtHash?: string;

  @ApiPropertyOptional({
    description: 'Expected hash at broken index (if invalid)',
    example: 'def456abc123...',
  })
  expectedHash?: string;

  @ApiPropertyOptional({
    description: 'Actual hash at broken index (if invalid)',
    example: 'abc123def456...',
  })
  actualHash?: string;

  @ApiPropertyOptional({
    description: 'Additional details about verification',
    example: { warning: 'Chain contains bootstrap events' },
  })
  details?: any;
}

export class AuditChainStatsDto {
  @ApiProperty({
    description: 'Total events in chain',
    example: 150,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Timestamp of first block',
    example: '2024-01-01T00:00:00.000Z',
  })
  firstBlockTimestamp: Date;

  @ApiProperty({
    description: 'Timestamp of last block',
    example: '2024-02-04T10:00:00.000Z',
  })
  lastBlockTimestamp: Date;

  @ApiProperty({
    description: 'Last successful verification',
    example: '2024-02-04T02:00:00.000Z',
  })
  lastSuccessfulVerification: Date;

  @ApiProperty({
    description: 'Chain length in days',
    example: 34,
  })
  chainLengthDays: number;

  @ApiProperty({
    description: 'Verification success rate in percentage',
    example: 100,
  })
  verificationSuccessRate: number;
}

export class VerificationHistoryDto {
  @ApiProperty({
    description: 'Verification ID',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Verification timestamp',
    example: '2024-02-04T02:00:00.000Z',
  })
  verificationTimestamp: Date;

  @ApiProperty({
    description: 'Verification status',
    enum: ['SUCCESS', 'FAILURE', 'WARNING'],
    example: 'SUCCESS',
  })
  status: string;

  @ApiProperty({
    description: 'Total events at time of verification',
    example: 150,
  })
  totalEvents: number;

  @ApiPropertyOptional({
    description: 'Block index where chain was broken',
    example: 125,
  })
  brokenAtIndex?: number;

  @ApiProperty({
    description: 'Verification duration in milliseconds',
    example: 250,
  })
  verificationDurationMs: number;

  @ApiPropertyOptional({
    description: 'Additional verification details',
    example: { note: 'Automatic daily verification' },
  })
  details?: any;
}
