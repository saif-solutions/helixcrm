import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  AuditIntegrityService,
  VerificationResult,
} from './audit-integrity.service';

@ApiTags('audit-integrity')
@Controller('audit-integrity')
export class AuditIntegrityController {
  constructor(private readonly auditIntegrityService: AuditIntegrityService) {}

  @Post('verify')
  @ApiOperation({
    summary: 'Manually trigger audit chain verification',
    description:
      'Verifies the integrity of the entire audit chain. This is also done automatically daily at 2 AM.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification completed successfully',
    schema: {
      example: {
        valid: true,
        verifiedAt: '2024-02-04T10:30:00.000Z',
        totalEvents: 150,
        brokenAtIndex: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Verification failed',
    schema: {
      example: {
        valid: false,
        verifiedAt: '2024-02-04T10:30:00.000Z',
        totalEvents: 150,
        brokenAtIndex: 125,
        brokenAtHash: 'abc123...',
        expectedHash: 'def456...',
        actualHash: 'abc123...',
      },
    },
  })
  async verifyChain(): Promise<VerificationResult> {
    return this.auditIntegrityService.verifyChain();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get audit chain status and statistics',
    description:
      'Returns current statistics about the audit chain including total events and verification history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chain status retrieved successfully',
    schema: {
      example: {
        totalEvents: 150,
        firstBlockTimestamp: '2024-01-01T00:00:00.000Z',
        lastBlockTimestamp: '2024-02-04T10:00:00.000Z',
        lastSuccessfulVerification: '2024-02-04T02:00:00.000Z',
        chainLengthDays: 34,
        verificationSuccessRate: 100,
      },
    },
  })
  async getStatus() {
    return this.auditIntegrityService.getChainStats();
  }

  @Get('verification-history')
  @ApiOperation({
    summary: 'Get verification history',
    description:
      'Returns the history of chain verifications, ordered by most recent.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of verification records to return (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification history retrieved successfully',
    schema: {
      example: [
        {
          id: 'uuid-123',
          verificationTimestamp: '2024-02-04T02:00:00.000Z',
          status: 'SUCCESS',
          totalEvents: 150,
          brokenAtIndex: null,
          verificationDurationMs: 250,
        },
        {
          id: 'uuid-124',
          verificationTimestamp: '2024-02-03T02:00:00.000Z',
          status: 'SUCCESS',
          totalEvents: 145,
          brokenAtIndex: null,
          verificationDurationMs: 240,
        },
      ],
    },
  })
  async getVerificationHistory(@Query('limit') limit: string) {
    const limitNum = parseInt(limit) || 30;
    return this.auditIntegrityService.getVerificationHistory(limitNum);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export audit chain for external verification',
    description:
      'Exports the audit chain in a format suitable for external verification tools.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of events to export',
    example: 1000,
  })
  @ApiResponse({
    status: 200,
    description: 'Chain exported successfully',
    schema: {
      example: {
        exportedAt: '2024-02-04T10:30:00.000Z',
        totalEvents: 150,
        genesisHash:
          '0000000000000000000000000000000000000000000000000000000000000000',
        algorithm: 'sha256',
        chain: [
          {
            blockIndex: 1,
            eventHash: 'hash1...',
            previousHash: 'genesis...',
            timestamp: '2024-01-01T00:00:00.000Z',
            metadata: { action: 'LOGIN_SUCCESS', entityType: 'AUTH' },
          },
        ],
      },
    },
  })
  async exportChain(@Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit) : undefined;
    return this.auditIntegrityService.exportChain(limitNum);
  }

  @Post('repair')
  @ApiOperation({
    summary: 'Attempt to repair audit chain (EMERGENCY USE ONLY)',
    description:
      'Attempts to repair the audit chain if integrity verification fails. This should only be used in emergencies and may require manual intervention.',
  })
  @ApiResponse({
    status: 200,
    description: 'Repair attempted',
    schema: {
      example: {
        repaired: false,
        message: 'Chain is already valid, no repair needed',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Repair failed',
    schema: {
      example: {
        repaired: false,
        message: 'Repair failed: Chain broken at block 125',
      },
    },
  })
  async repairChain() {
    return this.auditIntegrityService.repairChain();
  }
}
