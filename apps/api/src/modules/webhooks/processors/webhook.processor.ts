// src/modules/webhooks/processors/webhook.processor.ts
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../../shared/audit-log/severity-mapper';
import axios, { AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';

interface WebhookDeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: any;
  event: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  isRetry?: boolean;
}

@Processor('webhook-queue', { concurrency: 5 }) // Process 5 webhooks concurrently
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookRepository: WebhookRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  // BullMQ will call this method for jobs in the queue
  async process(job: Job<WebhookDeliveryJobData>): Promise<any> {
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
      // 1. UPDATE DELIVERY STATUS TO PROCESSING
      await this.webhookRepository.updateDelivery(deliveryId, {
        status: 'processing',
      });

      // 2. PREPARE REQUEST
      const requestConfig = this.prepareRequestConfig(
        payload,
        secret,
        headers,
        timeoutMs,
      );

      // 3. SEND WEBHOOK REQUEST
      const response = await this.sendWebhookRequest(url, requestConfig);

      // 4. VALIDATE RESPONSE
      this.validateResponse(response);

      // 5. UPDATE DELIVERY AS SUCCESS
      await this.webhookRepository.updateDelivery(deliveryId, {
        status: 'success',
        statusCode: response.status,
        response: this.truncateResponse(response.data),
        completedAt: new Date(),
      });

      // 6. AUDIT LOG SUCCESS
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELIVERED' as any,
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY' as any,
        organizationId: await this.getOrganizationId(webhookId),
        actorUserId: await this.getUserIdFromDelivery(deliveryId),
        actorEmail: await this.getActorEmail(deliveryId),
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
    } catch (error: any) {
      // 7. HANDLE DELIVERY FAILURE
      const errorMessage = this.extractErrorMessage(error);
      const statusCode = error.response?.status || error.code;

      // 8. UPDATE DELIVERY AS FAILED
      await this.webhookRepository.updateDelivery(deliveryId, {
        status: 'failed',
        statusCode,
        error: errorMessage,
        completedAt: new Date(),
      });

      // 9. AUDIT LOG FAILURE
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELIVERY_FAILED' as any,
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY' as any,
        organizationId: await this.getOrganizationId(webhookId),
        actorUserId: await this.getUserIdFromDelivery(deliveryId),
        actorEmail: await this.getActorEmail(deliveryId),
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
        error.stack,
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

      // Re-throw for BullMQ retry logic
      throw error;
    }
  }

  /**
   * Prepare HTTP request configuration
   */
  private prepareRequestConfig(
    payload: any,
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
      'X-Webhook-Event': this.getEventHeader(),
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Signature': signature,
      'X-Webhook-Attempt': '1', // Will be updated by BullMQ retries
      ...customHeaders,
    };

    return {
      method: 'POST',
      url: '', // Will be set in sendWebhookRequest
      data: payload,
      headers,
      timeout: timeoutMs,
      maxRedirects: 2,
      validateStatus: (status) => status >= 200 && status < 300, // Only 2xx are successful
    };
  }

  /**
   * Send webhook HTTP request
   */
  private async sendWebhookRequest(url: string, config: AxiosRequestConfig) {
    const requestConfig = {
      ...config,
      url,
    };

    try {
      return await axios(requestConfig);
    } catch (error: any) {
      // Enhanced error handling for common webhook delivery issues
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused: ${url}`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Request timeout: ${url}`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed: ${url}`);
      } else if (error.response) {
        // Server responded with error status
        throw error;
      } else if (error.request) {
        // Request made but no response
        throw new Error(`No response received from webhook: ${url}`);
      } else {
        // Something else went wrong
        throw new Error(`Webhook delivery failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate webhook response
   */
  private validateResponse(response: any): void {
    // Basic validation - can be extended based on requirements
    if (!response) {
      throw new Error('Empty response from webhook');
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook returned non-2xx status: ${response.status}`);
    }

    // Optional: Validate response format if needed
    // if (!response.data || typeof response.data !== 'object') {
    //   throw new Error('Invalid response format from webhook');
    // }
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
  private truncateResponse(response: any, maxLength: number = 5000): string {
    if (!response) return '';

    const responseStr =
      typeof response === 'string' ? response : JSON.stringify(response);

    return responseStr.length > maxLength
      ? responseStr.substring(0, maxLength) + '... [TRUNCATED]'
      : responseStr;
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') return data;
      if (data.message) return data.message;
      if (data.error) return data.error;
      return JSON.stringify(data);
    }

    if (error.message) return error.message;
    if (error.code) return `Error code: ${error.code}`;

    return 'Unknown webhook delivery error';
  }

  /**
   * Get event header value
   */
  private getEventHeader(): string {
    // Can be customized based on requirements
    return 'webhook-event';
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
      return webhook?.organizationId || 'unknown';
    } catch (error) {
      this.logger.warn(
        `Failed to fetch organization for webhook ${webhookId}: ${error.message}`,
      );
      return 'unknown';
    }
  }

  /**
   * Get user ID from delivery (if available)
   */
  private async getUserIdFromDelivery(
    deliveryId: string,
  ): Promise<string | undefined> {
    try {
      // This would need to be stored in delivery metadata
      // For now, return undefined
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get actor email for audit logging
   */
  private async getActorEmail(deliveryId: string): Promise<string> {
    // In a real implementation, this would fetch from user context
    // For now, return a placeholder
    return 'system@webhook-delivery';
  }
}
