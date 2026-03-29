// apps/api/src/modules/webhooks/webhook-dead-letter.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, WebhookDelivery, Webhook } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { WebhookRepository } from './repositories/webhook.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

interface IAuditLogService {
  logEvent(event: AuditLogEvent): Promise<void>;
}

interface AuditLogEvent {
  action: string;
  entityId: string;
  entityType: string;
  organizationId: string | null;
  actorUserId: string;
  actorEmail: string;
  metadata: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

type WebhookDeliveryWithWebhook = WebhookDelivery & {
  webhook: Webhook;
};

@Injectable()
export class WebhookDeadLetterService {
  private readonly logger = new Logger(WebhookDeadLetterService.name);
  private readonly prismaClient: PrismaClient;
  private readonly auditLogger: IAuditLogService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookRepository: WebhookRepository,
    auditLogService: AuditLogService,
  ) {
    this.prismaClient = this.prisma as unknown as PrismaClient;
    this.auditLogger = auditLogService as unknown as IAuditLogService;
  }

  async handleDeadLetter(deliveryId: string): Promise<void> {
    try {
      const delivery = (await this.webhookRepository.findDeliveryById(
        deliveryId,
      )) as WebhookDeliveryWithWebhook | null;
      if (!delivery) {
        this.logger.warn(
          `Delivery ${deliveryId} not found for dead letter processing`,
        );
        return;
      }

      const auditEvent: AuditLogEvent = {
        action: 'WEBHOOK_DEAD_LETTER',
        entityId: delivery.id,
        entityType: 'WEBHOOK_DELIVERY',
        organizationId: delivery.organizationId,
        actorUserId: 'system',
        actorEmail: 'system@webhook-dead-letter',
        metadata: {
          webhookId: delivery.webhookId,
          webhookName: delivery.webhook.name,
          event: delivery.event,
          attempts: delivery.retryCount,
          error: delivery.error,
          statusCode: delivery.statusCode,
        },
        severity: 'error',
      };

      await this.auditLogger.logEvent(auditEvent);

      const logMetadata: Record<string, unknown> = {
        webhookId: delivery.webhookId,
        webhookName: delivery.webhook.name,
        attempts: delivery.retryCount,
        error: delivery.error,
      };
      this.logger.warn(
        `Delivery moved to dead letter queue: ${deliveryId}`,
        logMetadata,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process dead letter for ${deliveryId}: ${getErrorMessage(error)}`,
      );
    }
  }

  async getDeadLetterDeliveries(
    webhookId?: string,
  ): Promise<WebhookDeliveryWithWebhook[]> {
    try {
      const where: { status: string; webhookId?: string } = {
        status: 'failed',
      };
      if (webhookId) {
        where.webhookId = webhookId;
      }

      const deliveries = (await this.prismaClient.webhookDelivery.findMany({
        where,
        include: { webhook: true },
        orderBy: { completedAt: 'desc' },
        take: 100,
      })) as WebhookDeliveryWithWebhook[];

      const deadLetters = deliveries.filter((delivery) => {
        const maxRetries = delivery.webhook.retryCount ?? 3;
        return delivery.retryCount >= maxRetries;
      });

      return deadLetters;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to get dead letter deliveries: ${getErrorMessage(error)}`,
      );
      return [];
    }
  }

  async replayDeadLetter(deliveryId: string): Promise<void> {
    try {
      const delivery = (await this.prismaClient.webhookDelivery.findUnique({
        where: { id: deliveryId },
        include: { webhook: true },
      })) as WebhookDeliveryWithWebhook | null;

      if (!delivery) {
        throw new Error(`Delivery ${deliveryId} not found`);
      }

      if (delivery.status !== 'failed') {
        throw new Error(
          `Delivery ${deliveryId} is not failed (status: ${delivery.status})`,
        );
      }

      await this.prismaClient.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'pending',
          error: null,
          completedAt: null,
        },
      });

      this.logger.log(`Replayed dead letter delivery: ${deliveryId}`);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to replay dead letter ${deliveryId}: ${errorMessage}`,
      );
      const newError = new Error(
        `Failed to replay dead letter: ${errorMessage}`,
      );
      if (error instanceof Error && error.cause) {
        newError.cause = error.cause;
      }
      throw newError;
    }
  }
}
