import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface StoredEvidence {
  id: string;
  collectionId: string;
  collectedAt: Date;
  evidenceHash: string;
  previousHash: string;
  status: 'PENDING' | 'STORED' | 'VERIFIED' | 'FAILED';
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

interface EvidenceInput {
  collectionId?: string;
  totalControls?: number;
  byCriteria?: Record<string, unknown>;
  evidencePath?: string;
  [key: string]: unknown;
}

@Injectable()
export class EvidenceStorageService {
  private readonly logger = new Logger(EvidenceStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async storeEvidenceWithIntegrity(
    evidence: EvidenceInput,
  ): Promise<StoredEvidence> {
    try {
      // Generate evidence hash
      const evidenceHash = this.generateHash(JSON.stringify(evidence));

      // Get previous hash to maintain chain
      const lastChainEntry = await this.prisma.evidenceChain.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      const collectionId = evidence.collectionId ?? `col-${Date.now()}`;

      // Store in evidence chain
      const chainEntry = await this.prisma.evidenceChain.create({
        data: {
          evidenceHash,
          previousHash: lastChainEntry?.evidenceHash ?? 'genesis',
          collectionId: collectionId,
          evidenceData: evidence,
        },
      });

      // Also store in collections table
      const collectionEntry = await this.prisma.evidenceCollection.create({
        data: {
          collectionId: collectionId,
          collectedAt: new Date(),
          totalControls: evidence.totalControls ?? 0,
          criteriaBreakdown: (evidence.byCriteria ?? {}) as Record<
            string,
            number
          >,
          evidencePath: evidence.evidencePath ?? '',
          verificationHash: evidenceHash,
          status: 'COMPLETED',
        },
      });

      this.logger.log(
        `Evidence stored with integrity: ${evidenceHash.substring(0, 16)}...`,
      );

      return {
        id: chainEntry.id,
        collectionId: collectionEntry.collectionId,
        collectedAt: collectionEntry.collectedAt,
        evidenceHash,
        previousHash: lastChainEntry?.evidenceHash ?? 'genesis',
        status: 'STORED',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to store evidence: ${errorMessage}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async verifyEvidenceChain(): Promise<{
    valid: boolean;
    issues: string[];
    chainLength: number;
  }> {
    const issues: string[] = [];

    try {
      const chainEntries = await this.prisma.evidenceChain.findMany({
        orderBy: { timestamp: 'asc' },
      });

      if (chainEntries.length === 0) {
        issues.push('Evidence chain is empty');
        return { valid: false, issues, chainLength: 0 };
      }

      let previousHash = 'genesis';
      let valid = true;

      for (let i = 0; i < chainEntries.length; i++) {
        const entry = chainEntries[i];

        if (entry.previousHash !== previousHash) {
          issues.push(
            `Hash mismatch at position ${i}: expected ${previousHash}, got ${entry.previousHash}`,
          );
          valid = false;
        }

        const calculatedHash = this.generateHash(
          JSON.stringify(entry.evidenceData),
        );
        if (entry.evidenceHash !== calculatedHash) {
          issues.push(
            `Hash verification failed at position ${i}: stored ${entry.evidenceHash}, calculated ${calculatedHash}`,
          );
          valid = false;
        }

        previousHash = entry.evidenceHash;
      }

      return {
        valid,
        issues,
        chainLength: chainEntries.length,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      issues.push(`Verification error: ${errorMessage}`);
      return { valid: false, issues, chainLength: 0 };
    }
  }

  async getEvidenceCollection(
    collectionId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const collection = await this.prisma.evidenceCollection.findUnique({
        where: { collectionId },
      });

      if (!collection) {
        return null;
      }

      const chainEntry = await this.prisma.evidenceChain.findFirst({
        where: { collectionId },
        orderBy: { timestamp: 'desc' },
      });

      return {
        ...collection,
        evidenceChain: chainEntry ? [chainEntry] : [],
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get evidence collection: ${errorMessage}`);
      throw error;
    }
  }

  async getRecentCollections(
    limit: number = 10,
  ): Promise<Record<string, unknown>[]> {
    try {
      const collections = await this.prisma.evidenceCollection.findMany({
        orderBy: { collectedAt: 'desc' },
        take: limit,
      });

      const collectionsWithChain = await Promise.all(
        collections.map(async (collection) => {
          const chainEntry = await this.prisma.evidenceChain.findFirst({
            where: { collectionId: collection.collectionId },
            orderBy: { timestamp: 'desc' },
          });

          return {
            ...collection,
            evidenceChain: chainEntry ? [chainEntry] : [],
          };
        }),
      );

      return collectionsWithChain;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get recent collections: ${errorMessage}`);
      throw error;
    }
  }

  async cleanupOldEvidence(
    retentionDays: number = 365,
  ): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCollections =
        await this.prisma.evidenceCollection.deleteMany({
          where: {
            collectedAt: { lt: cutoffDate },
          },
        });

      this.logger.log(
        `Cleaned up ${deletedCollections.count} old evidence collections`,
      );

      return { deletedCount: deletedCollections.count };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to cleanup old evidence: ${errorMessage}`);
      throw error;
    }
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
