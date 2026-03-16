// src/modules/webhooks/repositories/webhook.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Webhook, WebhookDelivery, Prisma } from '@prisma/client';

// ==================== TYPE DEFINITIONS ====================

export interface CreateWebhookData {
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface CreateDeliveryData {
  webhookId: string;
  event: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  retryCount: number;
  attemptedAt: Date;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface UpdateDeliveryData {
  status?: WebhookDeliveryStatus;
  statusCode?: number;
  response?: string | null;
  error?: string | null;
  completedAt?: Date | null;
  retryCount?: number;
}

export interface WebhookWithDelivery extends Webhook {
  deliveries: WebhookDelivery[];
}

export interface DeliveryWithWebhook extends WebhookDelivery {
  webhook: Webhook;
}

export type WebhookDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed';

export interface StatisticsResult {
  timeframe: 'day' | 'week' | 'month';
  total: number;
  byStatus: Record<WebhookDeliveryStatus, number>;
  avgResponseTime: number;
  successRate: number;
}

export interface RetryableDelivery extends DeliveryWithWebhook {
  retryable: boolean;
  maxRetriesReached: boolean;
}

export interface CleanupResult {
  count: number;
}

// ==================== REPOSITORY IMPLEMENTATION ====================

@Injectable()
export class WebhookRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new webhook
   */
  async create(data: CreateWebhookData): Promise<Webhook> {
    return this.prisma.webhook.create({
      data: {
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret,
        organizationId: this.tenantId,
        isActive: data.isActive ?? true,
        retryCount: data.retryCount ?? 3,
        timeoutMs: data.timeoutMs ?? 10000,
        headers: data.headers || {},
      },
    });
  }

  /**
   * Find webhook by ID with tenant isolation
   */
  async findById(id: string): Promise<Webhook | null> {
    return this.prisma.webhook.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find webhook by name with tenant isolation
   */
  async findByName(name: string): Promise<Webhook | null> {
    return this.prisma.webhook.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find all webhooks for current tenant
   */
  async findAll(): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: {
        organizationId: this.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update webhook
   */
  async update(id: string, data: UpdateWebhookData): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<Webhook> {
    return this.prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * Create a webhook delivery record
   */
  async createDelivery(data: CreateDeliveryData): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.create({
      data: {
        webhookId: data.webhookId,
        event: data.event,
        payload: data.payload as Prisma.InputJsonValue,
        status: data.status,
        retryCount: data.retryCount,
        attemptedAt: data.attemptedAt,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find delivery by ID with webhook info
   */
  async findDeliveryById(id: string): Promise<DeliveryWithWebhook | null> {
    return this.prisma.webhookDelivery.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
      include: {
        webhook: true,
      },
    }) as Promise<DeliveryWithWebhook | null>;
  }

  /**
   * Find deliveries for a webhook with pagination
   */
  async findDeliveries(
    webhookId: string,
    page: number,
    limit: number,
  ): Promise<WebhookDelivery[]> {
    const skip = (page - 1) * limit;

    return this.prisma.webhookDelivery.findMany({
      where: {
        webhookId,
        organizationId: this.tenantId,
      },
      orderBy: {
        attemptedAt: 'desc',
      },
      skip,
      take: limit,
    });
  }

  /**
   * Count deliveries for a webhook
   */
  async countDeliveries(webhookId: string): Promise<number> {
    return this.prisma.webhookDelivery.count({
      where: {
        webhookId,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Update delivery record
   */
  async updateDelivery(
    id: string,
    data: UpdateDeliveryData,
  ): Promise<WebhookDelivery> {
    const updateData: Prisma.WebhookDeliveryUpdateInput = {
      ...(data.status && { status: data.status }),
      ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
      ...(data.response !== undefined && { response: data.response }),
      ...(data.error !== undefined && { error: data.error }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      ...(data.retryCount !== undefined && { retryCount: data.retryCount }),
      updatedAt: new Date(),
    };

    return this.prisma.webhookDelivery.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Find active webhooks subscribed to an event
   */
  async findActiveWebhooksByEvent(event: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: {
        organizationId: this.tenantId,
        isActive: true,
        OR: [
          { events: { has: event } },
          { events: { has: '*' } }, // Wildcard for all events
        ],
      },
    });
  }

  /**
   * Get webhook statistics
   */
  async getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Promise<StatisticsResult> {
    const now = new Date();
    const startDate = this.calculateStartDate(timeframe, now);

    // Get status counts
    const stats = await this.prisma.webhookDelivery.groupBy({
      by: ['status'],
      where: {
        organizationId: this.tenantId,
        attemptedAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get total count
    const total = await this.prisma.webhookDelivery.count({
      where: {
        organizationId: this.tenantId,
        attemptedAt: {
          gte: startDate,
        },
      },
    });

    // Get average response time for successful deliveries
    const avgResponseTimeResult = await this.prisma.$queryRaw<
      Array<{ avg_seconds: number | null }>
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM ("completedAt" - "attemptedAt"))
      ) as avg_seconds
      FROM "WebhookDelivery"
      WHERE "organizationId" = ${this.tenantId}
        AND "status" = 'success'
        AND "attemptedAt" IS NOT NULL
        AND "completedAt" IS NOT NULL
        AND "attemptedAt" >= ${startDate}
    `;

    // Initialize status counts with all possible statuses
    const byStatus: Record<WebhookDeliveryStatus, number> = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
    };

    // Populate with actual counts
    stats.forEach((stat) => {
      const status = stat.status as WebhookDeliveryStatus;
      if (status in byStatus) {
        byStatus[status] = stat._count.id;
      }
    });

    const avgResponseTime = Number(avgResponseTimeResult[0]?.avg_seconds) || 0;
    const successCount = byStatus.success;

    return {
      timeframe,
      total,
      byStatus,
      avgResponseTime,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
    };
  }

  /**
   * Calculate start date based on timeframe
   */
  private calculateStartDate(
    timeframe: 'day' | 'week' | 'month',
    now: Date,
  ): Date {
    const startDate = new Date(now);

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return startDate;
  }

  async findRetryableDeliveries(
    limit: number = 10,
  ): Promise<RetryableDelivery[]> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deliveries = (await this.prisma.webhookDelivery.findMany({
      where: {
        organizationId: this.tenantId,
        status: 'failed',
        errorMessage: { not: null },
        attemptedAt: {
          gte: cutoffDate,
        },
        webhook: {
          isActive: true,
        },
      },
      include: {
        webhook: true,
      },
      orderBy: {
        attemptedAt: 'asc',
      },
      take: limit,
    })) as DeliveryWithWebhook[];

    return deliveries.map((delivery) => {
      const maxRetries = delivery.webhook.retryCount ?? 3;
      const currentRetries = delivery.retryCount ?? 0;

      return {
        ...delivery,
        retryable: currentRetries < maxRetries,
        maxRetriesReached: currentRetries >= maxRetries,
      } as RetryableDelivery;
    });
  }

  /**
   * Clean up old delivery records
   */
  async cleanupOldDeliveries(daysToKeep: number): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.webhookDelivery.deleteMany({
      where: {
        organizationId: this.tenantId,
        attemptedAt: {
          lt: cutoffDate,
        },
        status: {
          in: ['success', 'failed'],
        },
      },
    });

    return { count: result.count };
  }

  /**
   * Count active webhooks
   */
  async countActiveWebhooks(): Promise<number> {
    return this.prisma.webhook.count({
      where: {
        organizationId: this.tenantId,
        isActive: true,
      },
    });
  }

  /**
   * Get webhook with recent deliveries
   */
  async findWebhookWithRecentDeliveries(
    id: string,
    deliveryLimit: number = 5,
  ): Promise<WebhookWithDelivery | null> {
    return this.prisma.webhook.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
      include: {
        deliveries: {
          orderBy: {
            attemptedAt: 'desc',
          },
          take: deliveryLimit,
        },
      },
    }) as Promise<WebhookWithDelivery | null>;
  }

  /**
   * Get delivery by ID with webhook info
   */
  async getDeliveryWithWebhook(
    id: string,
  ): Promise<DeliveryWithWebhook | null> {
    return this.prisma.webhookDelivery.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
      include: {
        webhook: true,
      },
    }) as Promise<DeliveryWithWebhook | null>;
  }

  /**
   * Bulk update deliveries (for admin operations)
   */
  async bulkUpdateDeliveries(
    where: Prisma.WebhookDeliveryWhereInput,
    data: UpdateDeliveryData,
  ): Promise<CleanupResult> {
    const result = await this.prisma.webhookDelivery.updateMany({
      where: {
        ...where,
        organizationId: this.tenantId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return { count: result.count };
  }
}
