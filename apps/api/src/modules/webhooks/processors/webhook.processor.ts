// src/modules/webhooks/processors/webhook.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../../shared/audit-log/severity-mapper';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';

// ==================== TYPE DEFINITIONS ====================

interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: unknown;
  event: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  isRetry?: boolean;
}

interface WebhookResponse {
  success: boolean;
  deliveryId: string;
  statusCode?: number;
  responseTime: number;
}

interface UpdateDeliveryData {
  status: string;
  statusCode?: number;
  response?: string;
  error?: string;
  completedAt?: Date;
}

interface ErrorWithResponse {
  response?: {
    status: number;
    data: unknown;
  };
  code?: string;
  message?: string;
  request?: unknown;
  stack?: string;
}

// ==================== PROCESSOR IMPLEMENTATION ====================

@Processor('webhook-queue', { concurrency: 5 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);
  private readonly MAX_RESPONSE_LENGTH = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookRepository: WebhookRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    super();
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
      timeoutMs,
      isRetry = false,
    } = job.data;

    const startTime = Date.now();

    this.logger.log(`Processing webhook delivery ${deliveryId}`, {
      deliveryId,
      webhookId,
      url,
      event,
      isRetry,
      jobId: job.id,
      eventType: 'webhook_delivery_started',
    });

    try {
      await this.updateDeliveryStatus(deliveryId, { status: 'processing' });

      const requestConfig = this.prepareRequestConfig(
        payload,
        secret,
        headers,
        timeoutMs,
      );

      const response = await this.sendWebhookRequest(url, requestConfig);
      this.validateResponse(response);

      await this.updateDeliveryStatus(deliveryId, {
        status: 'success',
        statusCode: response.status,
        response: this.truncateResponse(response.data),
        completedAt: new Date(),
      });

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELIVERED',
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY',
        organizationId: await this.getOrganizationId(webhookId),
        actorUserId: undefined,
        actorEmail: this.getActorEmail(),
        metadata: {
          deliveryId,
          webhookId,
          url,
          event,
          statusCode: response.status,
          responseTime: Date.now() - startTime,
          isRetry,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Webhook delivery ${deliveryId} succeeded`, {
        deliveryId,
        webhookId,
        url,
        event,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        isRetry,
        eventType: 'webhook_delivery_succeeded',
      });

      return {
        success: true,
        deliveryId,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorWithResponse = error as ErrorWithResponse;
      const errorMessage = this.extractErrorMessage(errorWithResponse);
      const statusCode =
        errorWithResponse.response?.status ||
        Number(errorWithResponse.code) ||
        0;

      await this.updateDeliveryStatus(deliveryId, {
        status: 'failed',
        statusCode,
        error: errorMessage,
        completedAt: new Date(),
      });

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELIVERY_FAILED',
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY',
        organizationId: await this.getOrganizationId(webhookId),
        actorUserId: undefined,
        actorEmail: this.getActorEmail(),
        metadata: {
          deliveryId,
          webhookId,
          url,
          event,
          error: errorMessage,
          statusCode,
          responseTime: Date.now() - startTime,
          isRetry,
          attemptNumber: job.attemptsMade,
        },
        severity: SeverityMapper.forEventType('error'),
      });

      this.logger.error(
        `Webhook delivery ${deliveryId} failed: ${errorMessage}`,
        errorWithResponse.stack,
        {
          deliveryId,
          webhookId,
          url,
          event,
          statusCode,
          responseTime: Date.now() - startTime,
          isRetry,
          attemptNumber: job.attemptsMade,
          eventType: 'webhook_delivery_failed',
        },
      );

      throw error;
    }
  }

  /**
   * Update delivery status with type safety
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    data: UpdateDeliveryData,
  ): Promise<void> {
    await this.webhookRepository.updateDelivery(deliveryId, data);
  }

  /**
   * Prepare HTTP request configuration
   */
  private prepareRequestConfig(
    payload: unknown,
    secret: string,
    customHeaders: Record<string, string>,
    timeoutMs: number,
  ): AxiosRequestConfig {
    const timestamp = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HelixCRM-Webhook-Delivery/1.0',
      'X-Webhook-Event': 'webhook-event',
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Signature': signature,
      'X-Webhook-Attempt': '1',
      ...customHeaders,
    };

    return {
      method: 'POST',
      data: payload,
      headers,
      timeout: timeoutMs,
      maxRedirects: 2,
      validateStatus: (status) => status >= 200 && status < 300,
    };
  }

  /**
   * Send webhook HTTP request
   */
  private async sendWebhookRequest(
    url: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const requestConfig = {
      ...config,
      url,
    };

    try {
      return await axios(requestConfig);
    } catch (error) {
      const errorWithResponse = error as ErrorWithResponse;

      if (errorWithResponse.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused: ${url}`, { cause: error });
      }
      if (errorWithResponse.code === 'ETIMEDOUT') {
        throw new Error(`Request timeout: ${url}`, { cause: error });
      }
      if (errorWithResponse.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed: ${url}`, { cause: error });
      }
      if (errorWithResponse.response) {
        throw error;
      }
      if (errorWithResponse.request) {
        throw new Error(`No response received from webhook: ${url}`, {
          cause: error,
        });
      }

      throw new Error(`Webhook delivery failed: ${errorWithResponse.message}`, {
        cause: error,
      });
    }
  }

  /**
   * Validate webhook response
   */
  private validateResponse(response: AxiosResponse): void {
    if (!response) {
      throw new Error('Empty response from webhook');
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook returned non-2xx status: ${response.status}`);
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
    const data = `${timestamp}.${payload}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Truncate response for storage
   */
  private truncateResponse(response: unknown): string {
    if (!response) return '';

    const responseStr =
      typeof response === 'string' ? response : JSON.stringify(response);

    return responseStr.length > this.MAX_RESPONSE_LENGTH
      ? `${responseStr.substring(0, this.MAX_RESPONSE_LENGTH)}... [TRUNCATED]`
      : responseStr;
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: ErrorWithResponse): string {
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') return data;
      if (data && typeof data === 'object') {
        if ('message' in data && typeof data.message === 'string') {
          return data.message;
        }
        if ('error' in data && typeof data.error === 'string') {
          return data.error;
        }
        try {
          return JSON.stringify(data);
        } catch {
          return '[Unparseable error data]';
        }
      }
    }

    if (error.message) return error.message;
    if (error.code) return `Error code: ${error.code}`;

    return 'Unknown webhook delivery error';
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
      this.logger.warn(
        `Failed to fetch organization for webhook ${webhookId}: ${errorMessage}`,
      );
      return 'unknown';
    }
  }

  /**
   * Get actor email for audit logging
   */
  private getActorEmail(): string {
    return 'system@webhook-delivery';
  }
}
