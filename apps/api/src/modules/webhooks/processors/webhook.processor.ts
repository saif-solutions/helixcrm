// apps/api/src/modules/webhooks/processors/webhook.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  WebhookRepository,
  WebhookDeliveryStatus,
} from '../repositories/webhook.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../../shared/audit-log/severity-mapper';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  Method,
} from 'axios';
import * as crypto from 'crypto';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

function getSeverity(level: 'info' | 'warning' | 'error'): string {
  return SeverityMapper.forEventType(level) as string;
}

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESPONSE_LENGTH = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const CONCURRENCY = 5;
const BASE_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 3600000;

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: unknown;
  event: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  isRetry?: boolean;
  attemptNumber?: number;
}

export interface WebhookResponse {
  success: boolean;
  deliveryId: string;
  statusCode?: number;
  responseTime: number;
  attemptNumber: number;
}

export interface UpdateDeliveryData {
  status: WebhookDeliveryStatus;
  statusCode?: number | null;
  response?: string | null;
  error?: string | null;
  completedAt?: Date | null;
  attempts?: number;
  nextAttemptAt?: Date | null;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

export interface ErrorMetadata {
  type: string;
  code?: string;
  statusCode?: number;
  isTimeout: boolean;
  isConnectionRefused: boolean;
  isDNSError: boolean;
  message: string;
}

// ============================================================================
// PROCESSOR IMPLEMENTATION
// ============================================================================

@Processor('webhook-queue', { concurrency: CONCURRENCY })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookRepository: WebhookRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    super();

    this.axiosInstance = axios.create({
      timeout: DEFAULT_TIMEOUT_MS,
      maxRedirects: 3,
      maxContentLength: 10 * 1024 * 1024,
      validateStatus: (status: number) => status >= 200 && status < 300,
    });
  }

  async process(job: Job<WebhookDeliveryJobData>): Promise<WebhookResponse> {
    const {
      deliveryId,
      webhookId,
      url,
      secret,
      payload,
      event,
      headers = {},
      timeoutMs = DEFAULT_TIMEOUT_MS,
      isRetry = false,
    } = job.data;

    const startTime = Date.now();
    const attemptNumber = job.attemptsMade + 1;
    const maxAttempts = job.opts?.attempts || MAX_RETRY_ATTEMPTS;

    const context = {
      deliveryId,
      webhookId,
      url,
      event,
      attemptNumber,
      maxAttempts,
      isRetry,
      jobId: job.id,
    };

    this.logger.log('Processing webhook delivery', {
      ...context,
      eventType: 'webhook_delivery_started',
    });

    try {
      await this.updateDeliveryStatus(deliveryId, {
        status: 'processing' as WebhookDeliveryStatus,
        attempts: attemptNumber,
        lockedAt: new Date(),
        lockedBy: `job-${job.id}`,
      });

      const response = await this.sendWebhookRequest(
        url,
        payload,
        secret,
        headers,
        timeoutMs,
        event,
        deliveryId,
        attemptNumber,
      );

      this.validateWebhookResponse(response);

      await this.handleSuccessfulDelivery(
        deliveryId,
        webhookId,
        response,
        context,
        startTime,
      );

      this.logger.log('Webhook delivery succeeded', {
        ...context,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        eventType: 'webhook_delivery_succeeded',
      });

      return {
        success: true,
        deliveryId,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        attemptNumber,
      };
    } catch (error) {
      return await this.handleFailedDelivery(
        error,
        deliveryId,
        webhookId,
        context,
        startTime,
        job,
      );
    }
  }

  private async sendWebhookRequest(
    url: string,
    payload: unknown,
    secret: string,
    customHeaders: Record<string, string>,
    timeoutMs: number,
    event: string,
    deliveryId: string,
    attemptNumber: number,
  ): Promise<AxiosResponse> {
    const timestamp = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HelixCRM-Webhook/1.0',
      'X-Webhook-Event': event,
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Attempt': attemptNumber.toString(),
      'X-Webhook-Retry': attemptNumber > 1 ? 'true' : 'false',
      ...customHeaders,
    };

    const config: AxiosRequestConfig = {
      method: 'POST' as Method,
      url,
      data: payload,
      headers,
      timeout: timeoutMs,
      maxRedirects: 3,
      decompress: true,
    };

    return this.axiosInstance.request<unknown>(config);
  }

  private validateWebhookResponse(response: AxiosResponse): void {
    if (!response) {
      throw new Error('Empty response received from webhook endpoint');
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Webhook returned non-success status: ${response.status} ${response.statusText || ''}`,
      );
    }
  }

  private async handleSuccessfulDelivery(
    deliveryId: string,
    webhookId: string,
    response: AxiosResponse,
    context: {
      deliveryId: string;
      webhookId: string;
      url: string;
      event: string;
      attemptNumber: number;
      maxAttempts: number;
      isRetry: boolean;
      jobId: string;
    },
    startTime: number,
  ): Promise<void> {
    const processingTime = Date.now() - startTime;

    await this.updateDeliveryStatus(deliveryId, {
      status: 'success' as WebhookDeliveryStatus,
      statusCode: response.status,
      response: this.truncateResponse(response.data),
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });

    this.logger.log('Webhook delivery succeeded', {
      deliveryId: context.deliveryId,
      webhookId: context.webhookId,
      url: context.url,
      event: context.event,
      attemptNumber: context.attemptNumber,
      maxAttempts: context.maxAttempts,
      isRetry: context.isRetry,
      jobId: context.jobId,
      statusCode: response.status,
      responseTime: processingTime,
      eventType: 'webhook_delivery_succeeded',
    });

    const organizationId = await this.getOrganizationId(webhookId);

    await this.auditLogService.logEvent({
      action: 'WEBHOOK_DELIVERED',
      entityId: deliveryId,
      entityType: 'WEBHOOK_DELIVERY',
      organizationId,
      actorUserId: 'system',
      actorEmail: 'system@webhook-delivery',
      metadata: {
        deliveryId,
        webhookId: context.webhookId,
        event: context.event,
        statusCode: response.status,
        processingTime,
        attemptNumber: context.attemptNumber,
        maxAttempts: context.maxAttempts,
        isRetry: context.isRetry,
      },
      severity: getSeverity('info'),
    });
  }

  private async handleFailedDelivery(
    error: unknown,
    deliveryId: string,
    webhookId: string,
    context: {
      deliveryId: string;
      webhookId: string;
      url: string;
      event: string;
      attemptNumber: number;
      maxAttempts: number;
      isRetry: boolean;
      jobId: string;
    },
    startTime: number,
    job: Job<WebhookDeliveryJobData>,
  ): Promise<never> {
    const processingTime = Date.now() - startTime;
    const isLastAttempt = context.attemptNumber >= context.maxAttempts;
    const errorMetadata = this.extractErrorMetadata(error);

    const updateData: UpdateDeliveryData = {
      status: 'failed' as WebhookDeliveryStatus,
      statusCode: errorMetadata.statusCode || null,
      error: errorMetadata.message,
      completedAt: isLastAttempt ? new Date() : null,
      lockedAt: null,
      lockedBy: null,
    };

    if (!isLastAttempt) {
      updateData.nextAttemptAt = this.calculateNextRetryTime(job);
    }

    await this.updateDeliveryStatus(deliveryId, updateData);

    const logMessage = `Webhook delivery ${isLastAttempt ? 'failed permanently' : 'failed, will retry'}`;
    const logData = {
      deliveryId: context.deliveryId,
      webhookId: context.webhookId,
      url: context.url,
      event: context.event,
      attemptNumber: context.attemptNumber,
      maxAttempts: context.maxAttempts,
      isRetry: context.isRetry,
      jobId: context.jobId,
      errorType: errorMetadata.type,
      errorCode: errorMetadata.code,
      errorMessage: errorMetadata.message,
      statusCode: errorMetadata.statusCode,
      isTimeout: errorMetadata.isTimeout,
      isConnectionRefused: errorMetadata.isConnectionRefused,
      isDNSError: errorMetadata.isDNSError,
      isLastAttempt,
      processingTime,
      nextRetryAt: updateData.nextAttemptAt,
      eventType: isLastAttempt
        ? 'webhook_delivery_failed_permanent'
        : 'webhook_delivery_failed_temporary',
    };

    if (isLastAttempt) {
      this.logger.error(logMessage, logData);
    } else {
      this.logger.warn(logMessage, logData);
    }

    const organizationId = await this.getOrganizationId(webhookId);

    await this.auditLogService.logEvent({
      action: 'WEBHOOK_DELIVERY_FAILED',
      entityId: deliveryId,
      entityType: 'WEBHOOK_DELIVERY',
      organizationId,
      actorUserId: 'system',
      actorEmail: 'system@webhook-delivery',
      metadata: {
        deliveryId,
        webhookId: context.webhookId,
        event: context.event,
        error: errorMetadata.message,
        errorType: errorMetadata.type,
        statusCode: errorMetadata.statusCode,
        processingTime,
        attemptNumber: context.attemptNumber,
        maxAttempts: context.maxAttempts,
        isLastAttempt,
        isRetry: context.isRetry,
      },
      severity: isLastAttempt ? getSeverity('error') : getSeverity('warning'),
    });

    throw this.normalizeError(error);
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;

    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      const messageSource =
        (typeof errorObj.message === 'string' && errorObj.message) ||
        (typeof errorObj.error === 'string' && errorObj.error) ||
        (typeof errorObj.detail === 'string' && errorObj.detail);
      if (messageSource) return new Error(messageSource);
      try {
        const stringified = JSON.stringify(errorObj, null, 2);
        const truncated =
          stringified.length > 500
            ? stringified.substring(0, 500) + '... [truncated]'
            : stringified;
        return new Error(truncated);
      } catch {
        return new Error('[Complex Error Object]');
      }
    }

    if (typeof error === 'string') return new Error(error);
    if (typeof error === 'number') return new Error(`Error code: ${error}`);
    if (typeof error === 'boolean') return new Error(`Boolean error: ${error}`);
    if (error === null) return new Error('Null error');
    if (error === undefined) return new Error('Undefined error');
    return new Error('Unknown error occurred');
  }

  private extractErrorMetadata(error: unknown): ErrorMetadata {
    const metadata: ErrorMetadata = {
      type: 'UnknownError',
      message: 'Unknown error occurred',
      isTimeout: false,
      isConnectionRefused: false,
      isDNSError: false,
    };

    if (error instanceof Error) {
      metadata.type = error.name;
      metadata.message = error.message;

      if (this.isAxiosError(error)) {
        metadata.type = 'AxiosError';
        metadata.code = error.code;

        if (error.response) {
          metadata.statusCode = error.response.status;
          metadata.message = this.extractErrorMessageFromResponse({
            status: error.response.status,
            data: error.response.data,
            statusText: error.response.statusText,
          });
          metadata.type = 'HttpError';
        } else if (error.request) {
          metadata.type = 'NetworkError';
          const errorCode = error.code;
          if (errorCode === 'ECONNABORTED') {
            metadata.isTimeout = true;
            metadata.message = 'Request timeout';
          } else if (errorCode === 'ECONNREFUSED') {
            metadata.isConnectionRefused = true;
            metadata.message = 'Connection refused';
          } else if (errorCode === 'ENOTFOUND') {
            metadata.isDNSError = true;
            metadata.message = 'DNS lookup failed';
          } else if (errorCode === 'ETIMEDOUT') {
            metadata.isTimeout = true;
            metadata.message = 'Connection timeout';
          }
        }
      }
    }

    return metadata;
  }

  private isAxiosError(error: Error): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  private extractErrorMessageFromResponse(response: {
    status: number;
    data: unknown;
    statusText: string;
  }): string {
    if (!response?.data) {
      return `HTTP ${response?.status}: ${response?.statusText || 'Unknown error'}`;
    }
    const data = response.data;
    if (typeof data === 'string') return data.substring(0, 200);
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (typeof dataObj.message === 'string') return dataObj.message;
      if (typeof dataObj.error === 'string') return dataObj.error;
      if (typeof dataObj.detail === 'string') return dataObj.detail;
      try {
        return JSON.stringify(data).substring(0, 200);
      } catch {
        return `HTTP ${response.status}`;
      }
    }
    return `HTTP ${response.status}`;
  }

  private calculateNextRetryTime(job: Job<WebhookDeliveryJobData>): Date {
    const attempt = job.attemptsMade + 1;
    const delayMs = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
      MAX_RETRY_DELAY_MS,
    );
    return new Date(Date.now() + delayMs);
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    data: UpdateDeliveryData,
  ): Promise<void> {
    try {
      await this.webhookRepository.updateDelivery(deliveryId, data);
    } catch (updateError) {
      this.logger.error('Failed to update delivery status', {
        deliveryId,
        error: getErrorMessage(updateError),
        stack: getErrorStack(updateError),
      });
    }
  }

  private generateSignature(
    payload: string,
    secret: string,
    timestamp: number,
  ): string {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const data = `${timestamp}.${payload}`;
      hmac.update(data);
      return hmac.digest('hex');
    } catch (signatureError) {
      this.logger.error('Failed to generate webhook signature', {
        error: getErrorMessage(signatureError),
      });
      return 'signature-error';
    }
  }

  private truncateResponse(response: unknown): string {
    if (response === undefined || response === null) return '';
    try {
      const responseStr =
        typeof response === 'string' ? response : JSON.stringify(response);
      if (responseStr.length > MAX_RESPONSE_LENGTH) {
        return `${responseStr.substring(0, MAX_RESPONSE_LENGTH)}... [TRUNCATED]`;
      }
      return responseStr;
    } catch (error) {
      this.logger.warn('Failed to stringify webhook response', {
        error: getErrorMessage(error),
      });
      return '[Unparseable response]';
    }
  }

  private async getOrganizationId(webhookId: string): Promise<string> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id: webhookId },
        select: { organizationId: true },
      });
      return webhook?.organizationId ?? 'unknown';
    } catch (error) {
      this.logger.warn('Failed to fetch organization for webhook', {
        webhookId,
        error: getErrorMessage(error),
      });
      return 'unknown';
    }
  }

  onFailed(job: Job<WebhookDeliveryJobData>, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
      {
        jobId: job.id,
        deliveryId: job.data.deliveryId,
        webhookId: job.data.webhookId,
        attempts: job.attemptsMade,
        error: error.message,
        stack: error.stack,
        eventType: 'webhook_job_failed',
      },
    );
  }

  onCompleted(job: Job<WebhookDeliveryJobData>): void {
    this.logger.log(`Job ${job.id} completed successfully`, {
      jobId: job.id,
      deliveryId: job.data.deliveryId,
      webhookId: job.data.webhookId,
      attempts: job.attemptsMade,
      eventType: 'webhook_job_completed',
    });
  }
}
