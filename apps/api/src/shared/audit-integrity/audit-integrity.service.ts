import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  tenantId?: string;
  details?: unknown;
  timestamp?: Date;
  metadata?: unknown;
}

export interface VerificationResult {
  valid: boolean;
  verifiedAt: Date;
  totalEvents: number;
  brokenAtIndex?: number;
  brokenAtHash?: string;
  expectedHash?: string;
  actualHash?: string;
  details?: unknown;
}

export interface IntegrityConfig {
  algorithm?: string;
  encoding?: crypto.BinaryToTextEncoding;
  genesisHash?: string;
  batchSize?: number;
}

interface VerificationRecord {
  valid: boolean;
  verifiedAt: Date;
  totalEvents: number;
  brokenAtIndex?: number;
  brokenAtHash?: string;
  expectedHash?: string;
  actualHash?: string;
  verificationDurationMs?: number;
  details?: unknown;
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

function toErrorWithCause(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

@Injectable()
export class AuditIntegrityService {
  private readonly logger = new Logger(AuditIntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultConfig: IntegrityConfig = {
    algorithm: 'sha256',
    encoding: 'hex' as crypto.BinaryToTextEncoding,
    genesisHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    batchSize: 1000,
  };

  private generateHash(
    event: AuditEvent,
    previousHash: string,
    config: IntegrityConfig = this.defaultConfig,
  ): string {
    const { algorithm, encoding } = config;

    const eventString = JSON.stringify({
      a: event.action,
      e: event.entityType,
      i: event.entityId,
      u: event.userId,
      t: event.tenantId,
      d: event.details,
      ts: event.timestamp?.toISOString(),
      ph: previousHash,
    });

    const hash = crypto.createHash(algorithm ?? 'sha256');
    hash.update(eventString);
    return hash.digest(encoding);
  }

  async appendEvent(event: AuditEvent): Promise<string> {
    const config = this.defaultConfig;

    try {
      const lastBlock = await this.prisma.appendOnlyAuditChain.findFirst({
        orderBy: { blockIndex: 'desc' },
        select: { eventHash: true, blockIndex: true },
      });

      const previousHash = lastBlock?.eventHash ?? config.genesisHash;
      const nextIndex = (lastBlock?.blockIndex ?? 0) + 1;

      const eventHash = this.generateHash(event, previousHash, config);

      await this.prisma.appendOnlyAuditChain.create({
        data: {
          eventHash,
          previousHash,
          blockIndex: nextIndex,
          metadata: {
            action: event.action,
            entityType: event.entityType,
            entityId: event.entityId,
            userId: event.userId,
            tenantId: event.tenantId,
            details: event.details,
            originalTimestamp: event.timestamp ?? new Date(),
            ...(event.metadata as Record<string, unknown>),
          },
        },
      });

      this.logger.debug(
        `Appended audit event to integrity chain. Block: ${nextIndex}, Hash: ${eventHash.substring(0, 16)}...`,
      );

      return eventHash;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to append audit event to integrity chain: ${errorMessage}`,
        getErrorStack(error),
      );
      throw toErrorWithCause(
        error,
        `Audit integrity append failed: ${errorMessage}`,
      );
    }
  }

  async verifyChain(): Promise<VerificationResult> {
    const startTime = Date.now();
    const config = this.defaultConfig;

    try {
      const allEvents = await this.prisma.appendOnlyAuditChain.findMany({
        orderBy: { blockIndex: 'asc' },
        select: {
          blockIndex: true,
          eventHash: true,
          previousHash: true,
          metadata: true,
          timestamp: true,
        },
      });

      if (allEvents.length === 0) {
        const verification: VerificationResult = {
          valid: true,
          verifiedAt: new Date(),
          totalEvents: 0,
        };

        await this.recordVerification({
          ...verification,
          verificationDurationMs: Date.now() - startTime,
        });

        return verification;
      }

      let previousHash = config.genesisHash;
      let isChainValid = true;
      let brokenAtIndex: number | undefined;
      let brokenAtHash: string | undefined;
      let expectedHash: string | undefined;
      let actualHash: string | undefined;

      for (const event of allEvents) {
        const metadata = event.metadata as Record<string, unknown>;
        const auditEvent: AuditEvent = {
          action: metadata.action as string,
          entityType: metadata.entityType as string,
          entityId: metadata.entityId as string | undefined,
          userId: metadata.userId as string | undefined,
          tenantId: metadata.tenantId as string | undefined,
          details: metadata.details,
          timestamp: metadata.originalTimestamp
            ? new Date(metadata.originalTimestamp as string)
            : undefined,
          metadata,
        };

        const calculatedHash = this.generateHash(
          auditEvent,
          previousHash,
          config,
        );

        if (event.eventHash !== calculatedHash) {
          isChainValid = false;
          brokenAtIndex = event.blockIndex;
          brokenAtHash = event.eventHash;
          expectedHash = calculatedHash;
          actualHash = event.eventHash;

          this.logger.error(
            `Audit chain integrity violation at block ${event.blockIndex}`,
          );
          this.logger.error(`Expected: ${calculatedHash.substring(0, 32)}...`);
          this.logger.error(`Actual: ${event.eventHash.substring(0, 32)}...`);

          break;
        }

        previousHash = event.eventHash;
      }

      const result: VerificationResult = {
        valid: isChainValid,
        verifiedAt: new Date(),
        totalEvents: allEvents.length,
        brokenAtIndex,
        brokenAtHash,
        expectedHash,
        actualHash,
      };

      await this.recordVerification({
        ...result,
        verificationDurationMs: Date.now() - startTime,
      });

      if (isChainValid) {
        this.logger.log(
          `Audit chain verification successful. Total events: ${allEvents.length}`,
        );
      } else {
        this.logger.error(
          `Audit chain verification FAILED at block ${brokenAtIndex}`,
        );
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(
        `Audit chain verification error: ${errorMessage}`,
        errorStack,
      );

      const result: VerificationResult = {
        valid: false,
        verifiedAt: new Date(),
        totalEvents: 0,
        details: { error: errorMessage },
      };

      await this.recordVerification({
        ...result,
        verificationDurationMs: Date.now() - startTime,
        details: { error: errorMessage, stack: errorStack },
      });

      return result;
    }
  }

  private async recordVerification(result: VerificationRecord): Promise<void> {
    try {
      await this.prisma.auditIntegrityVerification.create({
        data: {
          status: result.valid ? 'SUCCESS' : 'FAILURE',
          totalEvents: result.totalEvents,
          brokenAtIndex: result.brokenAtIndex,
          verificationDurationMs: result.verificationDurationMs,
          details: {
            brokenAtHash: result.brokenAtHash,
            expectedHash: result.expectedHash,
            actualHash: result.actualHash,
            verifiedAt: result.verifiedAt,
            ...(result.details as Record<string, unknown>),
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to record verification: ${errorMessage}`);
    }
  }

  async getVerificationHistory(limit: number = 30) {
    return this.prisma.auditIntegrityVerification.findMany({
      orderBy: { verificationTimestamp: 'desc' },
      take: limit,
    });
  }

  async getChainStats() {
    try {
      const [totalEvents, lastVerification, firstBlock, lastBlock] =
        await Promise.all([
          this.prisma.appendOnlyAuditChain.count(),
          this.prisma.auditIntegrityVerification.findFirst({
            orderBy: { verificationTimestamp: 'desc' },
            where: { status: 'SUCCESS' },
          }),
          this.prisma.appendOnlyAuditChain.findFirst({
            orderBy: { blockIndex: 'asc' },
          }),
          this.prisma.appendOnlyAuditChain.findFirst({
            orderBy: { blockIndex: 'desc' },
          }),
        ]);

      return {
        totalEvents,
        firstBlockTimestamp: firstBlock?.timestamp,
        lastBlockTimestamp: lastBlock?.timestamp,
        lastSuccessfulVerification: lastVerification?.verificationTimestamp,
        chainLengthDays:
          firstBlock && lastBlock
            ? Math.ceil(
                (lastBlock.timestamp.getTime() -
                  firstBlock.timestamp.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0,
        verificationSuccessRate: await this.calculateSuccessRate(),
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get chain stats: ${errorMessage}`);
      throw error;
    }
  }

  private async calculateSuccessRate(): Promise<number> {
    try {
      const [successCount, totalCount] = await Promise.all([
        this.prisma.auditIntegrityVerification.count({
          where: { status: 'SUCCESS' },
        }),
        this.prisma.auditIntegrityVerification.count(),
      ]);

      return totalCount > 0 ? (successCount / totalCount) * 100 : 100;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to calculate success rate: ${errorMessage}`);
      return 0;
    }
  }

  async exportChain(limit?: number) {
    const events = await this.prisma.appendOnlyAuditChain.findMany({
      orderBy: { blockIndex: 'asc' },
      take: limit,
      select: {
        blockIndex: true,
        eventHash: true,
        previousHash: true,
        timestamp: true,
        metadata: true,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      totalEvents: events.length,
      genesisHash: this.defaultConfig.genesisHash,
      algorithm: this.defaultConfig.algorithm,
      chain: events,
    };
  }

  async repairChain(): Promise<{ repaired: boolean; message: string }> {
    this.logger.warn(
      'Manual chain repair initiated - this should only be used in emergencies',
    );

    try {
      const verification = await this.verifyChain();

      if (verification.valid) {
        return {
          repaired: false,
          message: 'Chain is already valid, no repair needed',
        };
      }

      this.logger.error(
        `Chain repair needed at block ${verification.brokenAtIndex}`,
      );

      return {
        repaired: false,
        message: `Chain repair logic not implemented. Broken at block ${verification.brokenAtIndex}`,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Chain repair failed: ${errorMessage}`);
      return {
        repaired: false,
        message: `Repair failed: ${errorMessage}`,
      };
    }
  }
}
