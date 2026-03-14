// src/modules/webhooks/webhooks.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { WebhookRepository } from './repositories/webhook.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as crypto from 'crypto';

// ==================== TYPE DEFINITIONS ====================

export interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  deliveryId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  error?: string;
  attemptedAt: Date;
  completedAt?: Date;
  retryCount: number;
}

export interface WebhookWithoutSecret {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  timeoutMs: number;
  headers: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryHistoryResponse {
  data: unknown[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface RetryDeliveryResponse {
  deliveryId: string;
  message: string;
  retryCount: number;
}

export interface CleanupResponse {
  deleted: number;
  message: string;
}

export interface TriggerWebhookResponse {
  deliveryId: string;
  message: string;
  estimatedDeliveryTime: string;
}

export interface WebhookDeliveryStatus {
  id: string;
  webhookId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  error?: string;
  attemptedAt: Date;
  completedAt?: Date;
  retryCount: number;
}

export interface WebhookStatistics {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
    private readonly webhookRepository: WebhookRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  private handleError(
    error: unknown,
    context: string,
    metadata: Record<string, unknown>,
  ): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `${context} failed: ${errorMessage}`,
      errorStack,
      metadata,
    );

    if (
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new BadRequestException(`Failed to ${context}`);
  }

  private removeSecret(
    webhook: { secret?: string } & Record<string, unknown>,
  ): WebhookWithoutSecret {
    const webhookWithoutSecret = { ...webhook };
    delete webhookWithoutSecret.secret;

    return webhookWithoutSecret as WebhookWithoutSecret;
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    createWebhookDto: CreateWebhookDto,
  ): Promise<WebhookWithoutSecret> {
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      this.validateWebhookUrl(createWebhookDto.url);

      const existingWebhook = await this.webhookRepository.findByName(
        createWebhookDto.name,
      );
      if (existingWebhook) {
        throw new ConflictException(
          `Webhook with name "${createWebhookDto.name}" already exists`,
        );
      }

      const webhook = await this.webhookRepository.create({
        name: createWebhookDto.name,
        url: createWebhookDto.url,
        events: createWebhookDto.events,
        secret: createWebhookDto.secret || this.generateSecret(),
        isActive: createWebhookDto.isActive ?? true,
        retryCount: createWebhookDto.retryCount ?? 3,
        timeoutMs: createWebhookDto.timeoutMs ?? 10000,
        headers: createWebhookDto.headers || {},
      });

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_CREATED',
        entityId: webhook.id,
        entityType: 'WEBHOOK',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          webhookId: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Webhook created successfully`, {
        webhookId: webhook.id,
        tenantId,
        userId,
        name: webhook.name,
        url: webhook.url,
        eventType: 'webhook_created',
        processingTime: Date.now() - startTime,
      });

      return this.removeSecret(webhook);
    } catch (error) {
      this.handleError(error, 'create webhook', {
        tenantId,
        userId,
        data: createWebhookDto,
        method: 'createWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(
    webhookId: string,
    updateWebhookDto: UpdateWebhookDto,
  ): Promise<WebhookWithoutSecret> {
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const existingWebhook = await this.webhookRepository.findById(webhookId);
      if (!existingWebhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      if (updateWebhookDto.url) {
        this.validateWebhookUrl(updateWebhookDto.url);
      }

      if (
        updateWebhookDto.name &&
        updateWebhookDto.name !== existingWebhook.name
      ) {
        const duplicateWebhook = await this.webhookRepository.findByName(
          updateWebhookDto.name,
        );
        if (duplicateWebhook && duplicateWebhook.id !== webhookId) {
          throw new ConflictException(
            `Webhook with name "${updateWebhookDto.name}" already exists`,
          );
        }
      }

      const updatedWebhook = await this.webhookRepository.update(
        webhookId,
        updateWebhookDto,
      );

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_UPDATED',
        entityId: webhookId,
        entityType: 'WEBHOOK',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          webhookId,
          updatedFields: Object.keys(updateWebhookDto),
          oldName: existingWebhook.name,
          newName: updatedWebhook.name,
          isActive: updatedWebhook.isActive,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Webhook updated successfully`, {
        webhookId,
        tenantId,
        userId,
        updatedFields: Object.keys(updateWebhookDto),
        eventType: 'webhook_updated',
        processingTime: Date.now() - startTime,
      });

      return this.removeSecret(updatedWebhook);
    } catch (error) {
      this.handleError(error, 'update webhook', {
        tenantId,
        userId,
        webhookId,
        data: updateWebhookDto,
        method: 'updateWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ message: string }> {
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const existingWebhook = await this.webhookRepository.findById(webhookId);
      if (!existingWebhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      await this.webhookRepository.delete(webhookId);

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELETED',
        entityId: webhookId,
        entityType: 'WEBHOOK',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          webhookId,
          name: existingWebhook.name,
          url: existingWebhook.url,
        },
        severity: SeverityMapper.forEventType('warning'),
      });

      this.logger.log(`Webhook deleted successfully`, {
        webhookId,
        tenantId,
        userId,
        name: existingWebhook.name,
        eventType: 'webhook_deleted',
        processingTime: Date.now() - startTime,
      });

      return { message: 'Webhook deleted successfully' };
    } catch (error) {
      this.handleError(error, 'delete webhook', {
        tenantId,
        userId,
        webhookId,
        method: 'deleteWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * Get all webhooks for current tenant
   */
  async getAllWebhooks(): Promise<WebhookWithoutSecret[]> {
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const webhooks = await this.webhookRepository.findAll();

      return webhooks.map((webhook) => this.removeSecret(webhook));
    } catch (error) {
      this.handleError(error, 'get all webhooks', {
        tenantId,
        userId,
        method: 'getAllWebhooks',
      });
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(webhookId: string): Promise<WebhookWithoutSecret> {
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const webhook = await this.webhookRepository.findById(webhookId);

      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      return this.removeSecret(webhook);
    } catch (error) {
      this.handleError(error, 'get webhook by ID', {
        tenantId,
        userId,
        webhookId,
        method: 'getWebhookById',
      });
    }
  }

  /**
   * Trigger a webhook delivery
   */
  async triggerWebhook(
    webhookId: string,
    payload: WebhookPayload,
  ): Promise<TriggerWebhookResponse> {
    if (!this.permissionContext.hasPermission('webhook:trigger')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:trigger required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const webhook = await this.webhookRepository.findById(webhookId);
      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      if (!webhook.isActive) {
        throw new ConflictException('Webhook is not active');
      }

      if (
        !webhook.events.includes(payload.event) &&
        !webhook.events.includes('*')
      ) {
        throw new BadRequestException(
          `Webhook is not subscribed to event: ${payload.event}`,
        );
      }

      const delivery = await this.webhookRepository.createDelivery({
        webhookId,
        event: payload.event,
        payload: payload.data,
        status: 'pending',
        retryCount: 0,
        attemptedAt: new Date(),
      });

      const jobOptions: JobsOptions = {
        jobId: delivery.id,
        attempts: webhook.retryCount + 1,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
        timeout: webhook.timeoutMs,
      };

      await this.webhookQueue.add(
        'deliver-webhook',
        {
          deliveryId: delivery.id,
          webhookId,
          url: webhook.url,
          secret: webhook.secret,
          payload: payload.data,
          event: payload.event,
          headers: webhook.headers,
          timeoutMs: webhook.timeoutMs,
        },
        jobOptions,
      );

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_TRIGGERED',
        entityId: delivery.id,
        entityType: 'WEBHOOK_DELIVERY',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          webhookId,
          deliveryId: delivery.id,
          event: payload.event,
          webhookUrl: webhook.url,
          retryCount: webhook.retryCount,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Webhook triggered successfully`, {
        webhookId,
        deliveryId: delivery.id,
        tenantId,
        userId,
        event: payload.event,
        eventType: 'webhook_triggered',
        processingTime: Date.now() - startTime,
      });

      return {
        deliveryId: delivery.id,
        message: 'Webhook delivery queued successfully',
        estimatedDeliveryTime: 'immediate',
      };
    } catch (error) {
      this.handleError(error, 'trigger webhook', {
        tenantId,
        userId,
        webhookId,
        payload,
        method: 'triggerWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(
    webhookId: string,
    page = 1,
    limit = 20,
  ): Promise<DeliveryHistoryResponse> {
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const webhook = await this.webhookRepository.findById(webhookId);
      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      const [deliveries, total] = await Promise.all([
        this.webhookRepository.findDeliveries(webhookId, page, limit),
        this.webhookRepository.countDeliveries(webhookId),
      ]);

      return {
        data: deliveries,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      this.handleError(error, 'get delivery history', {
        tenantId,
        userId,
        webhookId,
        page,
        limit,
        method: 'getDeliveryHistory',
      });
    }
  }

  /**
   * Get delivery status
   */

  async getDeliveryStatus(deliveryId: string): Promise<WebhookDeliveryStatus> {
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const delivery =
        await this.webhookRepository.findDeliveryById(deliveryId);
      if (!delivery) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      return delivery;
    } catch (error) {
      this.handleError(error, 'get delivery status', {
        tenantId,
        userId,
        deliveryId,
        method: 'getDeliveryStatus',
      });
    }
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<RetryDeliveryResponse> {
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const delivery =
        await this.webhookRepository.findDeliveryById(deliveryId);
      if (!delivery) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      if (delivery.status !== 'failed') {
        throw new ConflictException(
          `Cannot retry delivery with status: ${delivery.status}`,
        );
      }

      if (delivery.retryCount >= delivery.webhook.retryCount) {
        throw new ConflictException('Maximum retry attempts reached');
      }

      const updatedDelivery = await this.webhookRepository.updateDelivery(
        deliveryId,
        {
          status: 'pending',
          retryCount: delivery.retryCount + 1,
          error: null,
          completedAt: null,
        },
      );

      const jobOptions: JobsOptions = {
        jobId: `${deliveryId}_retry_${updatedDelivery.retryCount}`,
        attempts: delivery.webhook.retryCount - updatedDelivery.retryCount + 1,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      };

      await this.webhookQueue.add(
        'deliver-webhook',
        {
          deliveryId: updatedDelivery.id,
          webhookId: delivery.webhookId,
          url: delivery.webhook.url,
          secret: delivery.webhook.secret,
          payload: delivery.payload,
          event: delivery.event,
          headers: delivery.webhook.headers,
          timeoutMs: delivery.webhook.timeoutMs,
          isRetry: true,
        },
        jobOptions,
      );

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_RETRY',
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          deliveryId,
          webhookId: delivery.webhookId,
          previousStatus: delivery.status,
          retryCount: updatedDelivery.retryCount,
          event: delivery.event,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Delivery retry queued successfully`, {
        deliveryId,
        tenantId,
        userId,
        retryCount: updatedDelivery.retryCount,
        eventType: 'webhook_delivery_retry',
        processingTime: Date.now() - startTime,
      });

      return {
        deliveryId: updatedDelivery.id,
        message: 'Delivery retry queued successfully',
        retryCount: updatedDelivery.retryCount,
      };
    } catch (error) {
      this.handleError(error, 'retry delivery', {
        tenantId,
        userId,
        deliveryId,
        method: 'retryDelivery',
        processingTime: Date.now() - startTime,
      });
    }
  }

  // ==================== HELPER METHODS ====================

  private validateWebhookUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          'Webhook URL must use HTTP or HTTPS protocol',
        );
      }

      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1' ||
        parsedUrl.hostname.startsWith('192.168.') ||
        parsedUrl.hostname.startsWith('10.')
      ) {
        throw new BadRequestException(
          'Webhook URL cannot point to internal network',
        );
      }
    } catch {
      throw new BadRequestException('Invalid webhook URL');
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${errorMessage}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  async getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Promise<WebhookStatistics> {
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      return await this.webhookRepository.getStatistics(timeframe);
    } catch (error) {
      this.handleError(error, 'get statistics', {
        tenantId,
        userId,
        timeframe,
        method: 'getStatistics',
      });
    }
  }

  async cleanupOldDeliveries(
    daysToKeep: number = 90,
  ): Promise<CleanupResponse> {
    if (!this.permissionContext.hasPermission('system:admin')) {
      throw new ForbiddenException(
        'Insufficient permissions: system:admin required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const deleted =
        await this.webhookRepository.cleanupOldDeliveries(daysToKeep);

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_CLEANUP',
        entityType: 'SYSTEM',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          daysToKeep,
          deletedCount: deleted,
          tenantId,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Old webhook deliveries cleaned up`, {
        tenantId,
        userId,
        deleted,
        daysToKeep,
        eventType: 'webhook_cleanup',
      });

      return {
        deleted,
        message: `Successfully deleted ${deleted} old webhook deliveries older than ${daysToKeep} days`,
      };
    } catch (error) {
      this.handleError(error, 'cleanup old deliveries', {
        tenantId,
        userId,
        daysToKeep,
        method: 'cleanupOldDeliveries',
      });
    }
  }
}
