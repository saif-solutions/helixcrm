import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditJobData } from './audit-queue.service';

@Processor('audit-queue')
@Injectable()
export class AuditQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditQueueProcessor.name);
  private readonly BATCH_SIZE = 10; // Process up to 10 events at once for efficiency
  private processedCount = 0;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<any> {
    const startTime = Date.now();
    const {
      action,
      entityType,
      actorEmail,
      actorUserId,
      entityId,
      metadata,
      severity,
      organizationId,
      ipAddress,
      userAgent,
      requestId,
      isCritical,
    } = job.data;

    try {
      // Log critical events immediately
      if (isCritical) {
        this.logger.log(`Processing CRITICAL audit event: ${action}`, {
          jobId: job.id,
          actorEmail,
          organizationId,
        });
      } else {
        this.logger.debug(`Processing audit event: ${action}`, {
          jobId: job.id,
          actorEmail,
        });
      }

      // Build the audit log data
      const data: any = {
        action,
        entityType,
        actorEmail,
        actorUserId,
        entityId,
        metadata,
        severity,
        ipAddress,
        userAgent,
        requestId,
      };

      // Only add organizationId if it exists (database constraint)
      if (organizationId) {
        data.organizationId = organizationId;
      }

      // Create the audit log entry
      const auditLog = await this.prisma.auditLog.create({ data });

      this.processedCount++;

      const processingTime = Date.now() - startTime;

      // Log performance metrics for slow processing
      if (processingTime > 100) {
        // > 100ms is slow for audit
        this.logger.warn(
          `Slow audit processing: ${processingTime}ms for ${action}`,
          {
            jobId: job.id,
            processingTime,
            action,
          },
        );
      }

      return {
        success: true,
        auditId: auditLog.id,
        action,
        processingTime,
        queuedAt: job.timestamp,
        processedAt: Date.now(),
      };
    } catch (error) {
      // Handle specific database constraint errors
      if (error.message.includes('organization') && !organizationId) {
        this.logger.warn(`Audit skipped - missing organization for ${action}`, {
          jobId: job.id,
          action,
          actorEmail,
        });

        // Return null to indicate audit was skipped (expected for bootstrap actions)
        return null;
      }

      // Log the error but don't throw - BullMQ will handle retries
      this.logger.error(
        `Failed to process audit job ${job.id}: ${error.message}`,
        {
          jobId: job.id,
          action,
          actorEmail,
          error: error.stack,
        },
      );

      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AuditJobData>) {
    this.logger.debug(`Audit job completed: ${job.id} - ${job.data.action}`, {
      jobId: job.id,
      action: job.data.action,
      attemptsMade: job.attemptsMade,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AuditJobData>, error: Error) {
    this.logger.error(
      `Audit job failed after ${job.attemptsMade} attempts: ${job.id} - ${job.data.action}`,
      {
        jobId: job.id,
        action: job.data.action,
        attemptsMade: job.attemptsMade,
        error: error.message,
        isCritical: job.data.isCritical,
      },
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Audit job stalled: ${jobId}`);
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      processedCount: this.processedCount,
      processorName: this.constructor.name,
    };
  }
}
