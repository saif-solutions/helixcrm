import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from './audit-log.service';

export interface AuditJobData {
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  severity: AuditSeverity;
  organizationId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  isCritical: boolean; // Critical events should be processed immediately
}

@Injectable()
export class AuditQueueService implements OnModuleInit {
  private readonly logger = new Logger(AuditQueueService.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CRITICAL_ACTIONS = new Set<AuditAction>([
    AuditAction.LOGIN_FAILURE,
    AuditAction.USER_DELETED,
    AuditAction.PERMISSION_DENIED,
    AuditAction.PASSWORD_CHANGE,
    AuditAction.RATE_LIMIT_TRIGGERED,
    AuditAction.CSRF_FAILURE,
    AuditAction.SYSTEM_ERROR,
  ]);

  constructor(
    @InjectQueue('audit-queue')
    private readonly auditQueue: Queue<AuditJobData>,
  ) {}

  async onModuleInit() {
    await this.initializeQueue();
  }

  private async initializeQueue() {
    // Clean stalled jobs on startup
    await this.auditQueue.clean(0, 1000, 'failed');

    this.logger.log(
      `Audit queue initialized. Critical actions: ${Array.from(this.CRITICAL_ACTIONS).join(', ')}`,
    );
  }

  /**
   * Add an audit event to the queue
   * Critical events get higher priority and are processed immediately
   */
  async addAuditEvent(
    data: Omit<AuditJobData, 'isCritical'>,
  ): Promise<Job<AuditJobData>> {
    const isCritical = this.CRITICAL_ACTIONS.has(data.action);
    const jobData: AuditJobData = {
      ...data,
      isCritical,
    };

    const job = await this.auditQueue.add('audit-event', jobData, {
      priority: isCritical ? 1 : 3, // Higher number = lower priority
      attempts: this.MAX_RETRY_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 1000, // Start with 1 second, then 2, 4, etc.
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
    });

    this.logger.debug(
      `Audit event queued: ${data.action} (${isCritical ? 'CRITICAL' : 'NORMAL'})`,
      {
        jobId: job.id,
        action: data.action,
        actorEmail: data.actorEmail,
      },
    );

    return job;
  }

  /**
   * Get queue metrics for monitoring
   */
  async getQueueMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.auditQueue.getWaitingCount(),
      this.auditQueue.getActiveCount(),
      this.auditQueue.getCompletedCount(),
      this.auditQueue.getFailedCount(),
      this.auditQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Retry failed jobs (admin function)
   */
  async retryFailedJobs(count: number = 10) {
    const failedJobs = await this.auditQueue.getFailed(0, count);

    for (const job of failedJobs) {
      await job.retry();
      this.logger.log(
        `Retried failed audit job: ${job.id} - ${job.data.action}`,
      );
    }

    return failedJobs.length;
  }
}
