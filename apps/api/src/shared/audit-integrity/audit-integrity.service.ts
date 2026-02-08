import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  tenantId?: string;
  details?: any;
  timestamp?: Date;
  metadata?: any; // Changed from Record<string, any> to any to handle Prisma JsonValue
}

export interface VerificationResult {
  valid: boolean;
  verifiedAt: Date;
  totalEvents: number;
  brokenAtIndex?: number;
  brokenAtHash?: string;
  expectedHash?: string;
  actualHash?: string;
  details?: any;
}

export interface IntegrityConfig {
  algorithm?: string;
  encoding?: crypto.BinaryToTextEncoding;
  genesisHash?: string;
  batchSize?: number;
}

@Injectable()
export class AuditIntegrityService {
  private readonly logger = new Logger(AuditIntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Default configuration
  private readonly defaultConfig: IntegrityConfig = {
    algorithm: 'sha256',
    encoding: 'hex' as crypto.BinaryToTextEncoding,
    genesisHash:
      '0000000000000000000000000000000000000000000000000000000000000000',
    batchSize: 1000,
  };

  /**
   * Generate hash for an audit event
   */
  private generateHash(
    event: AuditEvent,
    previousHash: string,
    config: IntegrityConfig = this.defaultConfig,
  ): string {
    const { algorithm, encoding } = config;

    // Create a deterministic string representation of the event
    // IMPORTANT: Order of properties matters for hash consistency
    const eventString = JSON.stringify({
      a: event.action, // Action
      e: event.entityType, // Entity Type
      i: event.entityId, // Entity ID
      u: event.userId, // User ID
      t: event.tenantId, // Tenant ID
      d: event.details, // Details
      ts: event.timestamp?.toISOString(), // Timestamp
      ph: previousHash, // Previous Hash (crucial for chaining)
    });

    // Generate hash
    const hash = crypto.createHash(algorithm);
    hash.update(eventString);
    return hash.digest(encoding);
  }

  /**
   * Append an event to the audit chain
   * This should be called whenever an audit log is created
   */
  async appendEvent(event: AuditEvent): Promise<string> {
    const config = this.defaultConfig;

    try {
      // Get the last hash from the chain
      const lastBlock = await this.prisma.appendOnlyAuditChain.findFirst({
        orderBy: { blockIndex: 'desc' },
        select: { eventHash: true, blockIndex: true },
      });

      const previousHash = lastBlock?.eventHash || config.genesisHash;
      const nextIndex = (lastBlock?.blockIndex || 0) + 1;

      // Generate hash for this event
      const eventHash = this.generateHash(event, previousHash, config);

      // Store in append-only table
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
            originalTimestamp: event.timestamp || new Date(),
            ...(event.metadata || {}),
          },
        },
      });

      this.logger.debug(
        `Appended audit event to integrity chain. Block: ${nextIndex}, Hash: ${eventHash.substring(0, 16)}...`,
      );

      return eventHash;
    } catch (error) {
      this.logger.error(
        `Failed to append audit event to integrity chain: ${error.message}`,
        error.stack,
      );
      throw new Error(`Audit integrity append failed: ${error.message}`);
    }
  }

  /**
   * Verify the entire audit chain
   */
  async verifyChain(): Promise<VerificationResult> {
    const startTime = Date.now();
    const config = this.defaultConfig;

    try {
      // Get all events in order
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
        const verification = {
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

      // Verify chain integrity
      let previousHash = config.genesisHash;
      let isChainValid = true;
      let brokenAtIndex: number | undefined;
      let brokenAtHash: string | undefined;
      let expectedHash: string | undefined;
      let actualHash: string | undefined;

      for (const event of allEvents) {
        // Recreate the event from metadata
        const metadata = event.metadata as any;
        const auditEvent: AuditEvent = {
          action: metadata['action'],
          entityType: metadata['entityType'],
          entityId: metadata['entityId'],
          userId: metadata['userId'],
          tenantId: metadata['tenantId'],
          details: metadata['details'],
          timestamp: new Date(metadata['originalTimestamp']),
          metadata: metadata,
        };

        // Generate expected hash
        const calculatedHash = this.generateHash(
          auditEvent,
          previousHash,
          config,
        );

        // Compare with stored hash
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
    } catch (error) {
      this.logger.error(
        `Audit chain verification error: ${error.message}`,
        error.stack,
      );

      const result: VerificationResult = {
        valid: false,
        verifiedAt: new Date(),
        totalEvents: 0,
        details: { error: error.message },
      };

      await this.recordVerification({
        ...result,
        verificationDurationMs: Date.now() - startTime,
        details: { error: error.message, stack: error.stack },
      });

      return result;
    }
  }

  /**
   * Record verification result
   */
  private async recordVerification(result: any): Promise<void> {
    try {
      await this.prisma.auditIntegrityVerification.create({
        data: {
          status: result.valid ? 'SUCCESS' : 'FAILURE',
          totalEvents: result.totalEvents || 0,
          brokenAtIndex: result.brokenAtIndex,
          verificationDurationMs: result.verificationDurationMs,
          details: {
            brokenAtHash: result.brokenAtHash,
            expectedHash: result.expectedHash,
            actualHash: result.actualHash,
            verifiedAt: result.verifiedAt,
            ...result.details,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record verification: ${error.message}`);
    }
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(limit: number = 30) {
    return this.prisma.auditIntegrityVerification.findMany({
      orderBy: { verificationTimestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get chain statistics
   */
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
    } catch (error) {
      this.logger.error(`Failed to get chain stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate verification success rate
   */
  private async calculateSuccessRate(): Promise<number> {
    try {
      const [successCount, totalCount] = await Promise.all([
        this.prisma.auditIntegrityVerification.count({
          where: { status: 'SUCCESS' },
        }),
        this.prisma.auditIntegrityVerification.count(),
      ]);

      return totalCount > 0 ? (successCount / totalCount) * 100 : 100;
    } catch (error) {
      this.logger.error(`Failed to calculate success rate: ${error.message}`);
      return 0;
    }
  }

  /**
   * Export chain for external verification
   */
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

  /**
   * Manual chain repair (emergency use only)
   */
  async repairChain(): Promise<{ repaired: boolean; message: string }> {
    this.logger.warn(
      'Manual chain repair initiated - this should only be used in emergencies',
    );

    try {
      // Verify current chain first
      const verification = await this.verifyChain();

      if (verification.valid) {
        return {
          repaired: false,
          message: 'Chain is already valid, no repair needed',
        };
      }

      // In a real implementation, this would involve complex repair logic
      // For now, we'll just log the issue
      this.logger.error(
        `Chain repair needed at block ${verification.brokenAtIndex}`,
      );

      return {
        repaired: false,
        message: `Chain repair logic not implemented. Broken at block ${verification.brokenAtIndex}`,
      };
    } catch (error) {
      this.logger.error(`Chain repair failed: ${error.message}`);
      return {
        repaired: false,
        message: `Repair failed: ${error.message}`,
      };
    }
  }
}
