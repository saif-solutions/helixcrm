// apps/api/src/modules/file-storage/processors/file-cleanup.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Helper functions
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : '';
}

interface FileCleanupResult {
  processedCount: number;
  message: string;
}

@Processor('file-cleanup-queue')
export class FileCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(FileCleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<FileCleanupResult> {
    this.logger.log(`Processing file cleanup job: ${job.id}`);

    try {
      // Find files marked for deletion more than 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldDeletedFiles = await this.prisma.file.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: thirtyDaysAgo,
          },
        },
        take: 100, // Process in batches
      });

      this.logger.log(
        `Found ${oldDeletedFiles.length} files to permanently delete`,
      );

      // In a real implementation, you would:
      // 1. Delete physical files from storage
      // 2. Remove database records
      // For now, we'll just log the files that would be deleted

      for (const file of oldDeletedFiles) {
        this.logger.debug(`Would delete file: ${file.id} - ${file.filename}`);
      }

      return {
        processedCount: oldDeletedFiles.length,
        message: 'File cleanup completed',
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`File cleanup job failed: ${errMsg}`, errStack);
      throw error;
    }
  }
}
