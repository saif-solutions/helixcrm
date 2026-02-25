// src/modules/webhooks/repositories/webhook.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

interface CreateWebhookData {
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

interface CreateDeliveryData {
  webhookId: string;
  event: string;
  payload: any;
  status: string;
  retryCount: number;
  attemptedAt: Date;
}

interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

interface UpdateDeliveryData {
  status?: string;
  statusCode?: number;
  response?: string;
  error?: string;
  completedAt?: Date;
  retryCount?: number;
}

@Injectable()
export class WebhookRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new webhook
   */
  async create(data: CreateWebhookData) {
    return this.prisma.webhook.create({
      data: {
        ...data,
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
  async findById(id: string) {
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
  async findByName(name: string) {
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
  async findAll() {
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
  async update(id: string, data: UpdateWebhookData) {
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
  async delete(id: string) {
    return this.prisma.webhook.delete({
      where: { id },
    });
  }

  /**
   * Create a webhook delivery record
   */
  async createDelivery(data: CreateDeliveryData) {
    return this.prisma.webhookDelivery.create({
      data: {
        ...data,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find delivery by ID with webhook info
   */
  async findDeliveryById(id: string) {
    return this.prisma.webhookDelivery.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
      include: {
        webhook: true,
      },
    });
  }

  /**
   * Find deliveries for a webhook with pagination
   */
  async findDeliveries(webhookId: string, page: number, limit: number) {
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
  async countDeliveries(webhookId: string) {
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
  async updateDelivery(id: string, data: UpdateDeliveryData) {
    return this.prisma.webhookDelivery.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find active webhooks subscribed to an event
   */
  async findActiveWebhooksByEvent(event: string) {
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
  async getStatistics(timeframe: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    const startDate = new Date();

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

    const stats = await this.prisma.webhookDelivery.groupBy({
      by: ['status', 'webhookId'],
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

    const total = await this.prisma.webhookDelivery.count({
      where: {
        organizationId: this.tenantId,
        attemptedAt: {
          gte: startDate,
        },
      },
    });

    const avgResponseTime = await this.prisma.$queryRaw`
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

    return {
      timeframe,
      total,
      byStatus: stats.reduce(
        (acc, stat) => {
          if (!acc[stat.status]) acc[stat.status] = 0;
          acc[stat.status] += stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      avgResponseTime: avgResponseTime[0]?.avg_seconds || 0,
      successRate:
        total > 0
          ? ((stats.find((s) => s.status === 'success')?._count.id || 0) /
              total) *
            100
          : 0,
    };
  }

  /**
   * Find failed deliveries that can be retried
   */
  async findRetryableDeliveries(limit: number = 10) {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Use a raw query or application logic to compare with webhook retryCount
    // For now, use a simpler approach
    return this.prisma.webhookDelivery.findMany({
      where: {
        organizationId: this.tenantId,
        status: 'failed',
        errorMessage: {
          not: null,
        },
        retryCount: {
          // Use a reasonable default - application logic will check actual webhook retryCount
          lt: 5,
        },
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
    });
  }

  /**
   * Clean up old delivery records
   */
  async cleanupOldDeliveries(daysToKeep: number = 90) {
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

    return result.count;
  }

  /**
   * Count active webhooks
   */
  async countActiveWebhooks() {
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
  async findWebhookWithRecentDeliveries(id: string, deliveryLimit: number = 5) {
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
    });
  }
}
