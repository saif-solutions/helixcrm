import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Processor('file-cleanup-queue')
export class FileCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(FileCleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
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

      this.logger.log(`Found ${oldDeletedFiles.length} files to permanently delete`);

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
    } catch (error: any) {
      this.logger.error(`File cleanup job failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
