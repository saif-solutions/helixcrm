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
// ENUMS & CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RESPONSE_LENGTH = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const CONCURRENCY = 5;
const BASE_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 3600000; // 1 hour

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

    // Configure axios instance with defaults
    this.axiosInstance = axios.create({
      timeout: DEFAULT_TIMEOUT_MS,
      maxRedirects: 3,
      maxContentLength: 10 * 1024 * 1024, // 10MB
      validateStatus: (status: number) => status >= 200 && status < 300,
    });
  }

  /**
   * Main job processor for webhook deliveries
   */
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
      // Update delivery status to processing
      await this.updateDeliveryStatus(deliveryId, {
        status: 'processing' as WebhookDeliveryStatus,
        attempts: attemptNumber,
        lockedAt: new Date(),
        lockedBy: `job-${job.id}`,
      });

      // Prepare and send webhook request
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

      // Validate response
      this.validateWebhookResponse(response);

      // Handle successful delivery
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
      // Handle failed delivery
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

  /**
   * Send webhook HTTP request with proper configuration
   */
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

  /**
   * Validate webhook response
   */
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

  /**
   * Handle successful webhook delivery
   */
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

    // Update delivery record
    await this.updateDeliveryStatus(deliveryId, {
      status: 'success' as WebhookDeliveryStatus,
      statusCode: response.status,
      response: this.truncateResponse(response.data),
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });

    // Log success with properly typed data
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

    // Get organization ID first to avoid async issues
    const organizationId = await this.getOrganizationId(webhookId);

    // Create audit log - use string literals directly
    await this.auditLogService.logEvent({
      action: 'WEBHOOK_DELIVERED', // Direct string literal, no variable needed
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
      severity: SeverityMapper.forEventType('info'),
    });
  }

  /**
   * Handle failed webhook delivery
   */
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

    // Prepare update data
    const updateData: UpdateDeliveryData = {
      status: 'failed' as WebhookDeliveryStatus,
      statusCode: errorMetadata.statusCode || null,
      error: errorMetadata.message,
      completedAt: isLastAttempt ? new Date() : null,
      lockedAt: null,
      lockedBy: null,
    };

    // Set next retry time if not last attempt
    if (!isLastAttempt) {
      updateData.nextAttemptAt = this.calculateNextRetryTime(job);
    }

    // Update delivery record
    await this.updateDeliveryStatus(deliveryId, updateData);

    // Log failure with appropriate level
    const logMessage = `Webhook delivery ${isLastAttempt ? 'failed permanently' : 'failed, will retry'}`;

    // Create a properly typed log object
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

    // Get organization ID first
    const organizationId = await this.getOrganizationId(webhookId);

    // Create audit log - use string literals directly
    await this.auditLogService.logEvent({
      action: 'WEBHOOK_DELIVERY_FAILED', // Direct string literal, no variable needed
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
      severity: isLastAttempt
        ? SeverityMapper.forEventType('error')
        : SeverityMapper.forEventType('warning'),
    });

    // Throw error to trigger BullMQ retry mechanism
    throw this.normalizeError(error);
  }

  /**
   * Normalize any error to an Error instance
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    // Handle non-Error objects
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;

      // Try to extract message in priority order
      const messageSource =
        (typeof errorObj.message === 'string' && errorObj.message) ||
        (typeof errorObj.error === 'string' && errorObj.error) ||
        (typeof errorObj.detail === 'string' && errorObj.detail);

      if (messageSource) {
        return new Error(messageSource);
      }

      // Stringify the object with a limit to prevent huge strings
      try {
        const stringified = JSON.stringify(errorObj, null, 2);
        // Truncate if too long (e.g., for logging systems)
        const truncated =
          stringified.length > 500
            ? stringified.substring(0, 500) + '... [truncated]'
            : stringified;
        return new Error(truncated);
      } catch {
        return new Error('[Complex Error Object]');
      }
    }

    // Handle primitive types with descriptive messages
    if (typeof error === 'string') return new Error(error);
    if (typeof error === 'number') return new Error(`Error code: ${error}`);
    if (typeof error === 'boolean') return new Error(`Boolean error: ${error}`);
    if (error === null) return new Error('Null error');
    if (error === undefined) return new Error('Undefined error');

    return new Error('Unknown error occurred');
  }

  /**
   * Extract structured error metadata from various error types
   */
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

      // Check if it's an Axios error
      if (this.isAxiosError(error)) {
        metadata.type = 'AxiosError';
        metadata.code = error.code;

        if (error.response) {
          const response = error.response;
          metadata.statusCode = response.status;
          metadata.message = this.extractErrorMessageFromResponse({
            status: response.status,
            data: response.data,
            statusText: response.statusText,
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

  /**
   * Type guard for AxiosError
   */
  private isAxiosError(error: Error): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  /**
   * Extract error message from HTTP response
   */
  private extractErrorMessageFromResponse(response: {
    status: number;
    data: unknown;
    statusText: string;
  }): string {
    if (!response?.data) {
      return `HTTP ${response?.status}: ${response?.statusText || 'Unknown error'}`;
    }

    const data = response.data;

    if (typeof data === 'string') {
      return data.substring(0, 200);
    }

    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;

      // Common error response formats
      if (typeof dataObj.message === 'string') {
        return dataObj.message;
      }
      if (typeof dataObj.error === 'string') {
        return dataObj.error;
      }
      if (typeof dataObj.detail === 'string') {
        return dataObj.detail;
      }

      try {
        return JSON.stringify(data).substring(0, 200);
      } catch {
        return `HTTP ${response.status}`;
      }
    }

    return `HTTP ${response.status}`;
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetryTime(job: Job<WebhookDeliveryJobData>): Date {
    const attempt = job.attemptsMade + 1;

    // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, 320s, 640s, 1280s, 2560s
    const delayMs = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
      MAX_RETRY_DELAY_MS,
    );

    return new Date(Date.now() + delayMs);
  }

  /**
   * Update delivery status in repository
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    data: UpdateDeliveryData,
  ): Promise<void> {
    try {
      await this.webhookRepository.updateDelivery(deliveryId, data);
    } catch (updateError) {
      // Safely extract error information
      const errorMessage =
        updateError instanceof Error ? updateError.message : 'Unknown error';
      const errorStack =
        updateError instanceof Error ? updateError.stack : undefined;

      this.logger.error('Failed to update delivery status', {
        deliveryId,
        error: errorMessage,
        stack: errorStack,
      });

      // Don't throw - we don't want to fail the job if status update fails
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
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
      // Safely extract error message
      const errorMessage =
        signatureError instanceof Error
          ? signatureError.message
          : 'Unknown signature error';

      this.logger.error('Failed to generate webhook signature', {
        error: errorMessage,
      });
      return 'signature-error';
    }
  }

  /**
   * Truncate response for storage
   */
  private truncateResponse(response: unknown): string {
    if (response === undefined || response === null) {
      return '';
    }

    try {
      const responseStr =
        typeof response === 'string' ? response : JSON.stringify(response);

      if (responseStr.length > MAX_RESPONSE_LENGTH) {
        return `${responseStr.substring(0, MAX_RESPONSE_LENGTH)}... [TRUNCATED]`;
      }

      return responseStr;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to stringify webhook response', {
        error: errorMessage,
      });
      return '[Unparseable response]';
    }
  }

  /**
   * Get organization ID from webhook
   */
  private async getOrganizationId(webhookId: string): Promise<string> {
    try {
      const webhook = await this.prisma.webhook.findUnique({
        where: { id: webhookId },
        select: { organizationId: true },
      });

      return webhook?.organizationId ?? 'unknown';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to fetch organization for webhook', {
        webhookId,
        error: errorMessage,
      });
      return 'unknown';
    }
  }

  /**
   * Job failure handler (non-async because no await needed)
   */
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

  /**
   * Job completion handler (non-async because no await needed)
   */
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
