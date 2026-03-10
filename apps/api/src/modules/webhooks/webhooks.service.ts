// src/modules/webhooks/webhooks.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
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

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
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

  /**
   * Create a new webhook
   */
  async createWebhook(createWebhookDto: CreateWebhookDto) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.manage' → 'webhook:manage'
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE WEBHOOK URL
      this.validateWebhookUrl(createWebhookDto.url);

      // 3. CHECK FOR DUPLICATE WEBHOOK NAME
      const existingWebhook = await this.webhookRepository.findByName(
        createWebhookDto.name,
      );
      if (existingWebhook) {
        throw new ConflictException(
          `Webhook with name "${createWebhookDto.name}" already exists`,
        );
      }

      // 4. CREATE WEBHOOK IN DATABASE
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

      // 5. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_CREATED' as any,
        entityId: webhook.id,
        entityType: 'WEBHOOK' as any,
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

      // 6. RETURN WITHOUT SENSITIVE DATA
      const { secret: _, ...webhookWithoutSecret } = webhook;
      return webhookWithoutSecret;
    } catch (error: any) {
      // 7. ERROR HANDLING
      this.logger.error(
        `Create webhook failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: createWebhookDto,
          method: 'createWebhook',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create webhook');
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(webhookId: string, updateWebhookDto: UpdateWebhookDto) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.manage' → 'webhook:manage'
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET EXISTING WEBHOOK
      const existingWebhook = await this.webhookRepository.findById(webhookId);
      if (!existingWebhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      // 3. VALIDATE URL IF PROVIDED
      if (updateWebhookDto.url) {
        this.validateWebhookUrl(updateWebhookDto.url);
      }

      // 4. CHECK FOR DUPLICATE NAME IF CHANGING
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

      // 5. UPDATE WEBHOOK
      const updatedWebhook = await this.webhookRepository.update(
        webhookId,
        updateWebhookDto,
      );

      // 6. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_UPDATED' as any,
        entityId: webhookId,
        entityType: 'WEBHOOK' as any,
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

      // 7. RETURN WITHOUT SENSITIVE DATA
      const { secret: _, ...webhookWithoutSecret } = updatedWebhook;
      return webhookWithoutSecret;
    } catch (error: any) {
      // 8. ERROR HANDLING
      this.logger.error(
        `Update webhook failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          webhookId,
          data: updateWebhookDto,
          method: 'updateWebhook',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update webhook');
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.manage' → 'webhook:manage'
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET EXISTING WEBHOOK
      const existingWebhook = await this.webhookRepository.findById(webhookId);
      if (!existingWebhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      // 3. DELETE WEBHOOK
      await this.webhookRepository.delete(webhookId);

      // 4. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_DELETED' as any,
        entityId: webhookId,
        entityType: 'WEBHOOK' as any,
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
    } catch (error: any) {
      // 5. ERROR HANDLING
      this.logger.error(
        `Delete webhook failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          webhookId,
          method: 'deleteWebhook',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to delete webhook');
    }
  }

  /**
   * Get all webhooks for current tenant
   */
  async getAllWebhooks() {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.read' → 'webhook:read'
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET WEBHOOKS FROM REPOSITORY
      const webhooks = await this.webhookRepository.findAll();

      // 3. REMOVE SENSITIVE DATA FROM ALL WEBHOOKS
      return webhooks.map(({ secret: _, ...webhook }) => webhook);
    } catch (error: any) {
      this.logger.error(
        `Get all webhooks failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          method: 'getAllWebhooks',
        },
      );
      throw new BadRequestException('Failed to fetch webhooks');
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(webhookId: string) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.read' → 'webhook:read'
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET WEBHOOK FROM REPOSITORY
      const webhook = await this.webhookRepository.findById(webhookId);

      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      // 3. RETURN WITHOUT SENSITIVE DATA
      const { secret: _, ...webhookWithoutSecret } = webhook;
      return webhookWithoutSecret;
    } catch (error: any) {
      this.logger.error(
        `Get webhook by ID failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          webhookId,
          method: 'getWebhookById',
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch webhook');
    }
  }

  /**
   * Trigger a webhook delivery
   */
  async triggerWebhook(webhookId: string, payload: WebhookPayload) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.trigger' → 'webhook:trigger'
    if (!this.permissionContext.hasPermission('webhook:trigger')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:trigger required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET WEBHOOK
      const webhook = await this.webhookRepository.findById(webhookId);
      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      // 3. CHECK IF WEBHOOK IS ACTIVE
      if (!webhook.isActive) {
        throw new ConflictException('Webhook is not active');
      }

      // 4. CHECK IF EVENT IS SUBSCRIBED
      if (
        !webhook.events.includes(payload.event) &&
        !webhook.events.includes('*')
      ) {
        throw new BadRequestException(
          `Webhook is not subscribed to event: ${payload.event}`,
        );
      }

      // 5. CREATE DELIVERY RECORD
      const delivery = await this.webhookRepository.createDelivery({
        webhookId,
        event: payload.event,
        payload: payload.data,
        status: 'pending',
        retryCount: 0,
        attemptedAt: new Date(),
      });

      // 6. QUEUE BACKGROUND DELIVERY JOB
      const jobOptions: JobsOptions = {
        jobId: delivery.id,
        attempts: webhook.retryCount + 1,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: false,
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

      // 7. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_TRIGGERED' as any,
        entityId: delivery.id,
        entityType: 'WEBHOOK_DELIVERY' as any,
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
    } catch (error: any) {
      // 8. ERROR HANDLING
      this.logger.error(
        `Trigger webhook failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          webhookId,
          payload,
          method: 'triggerWebhook',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to trigger webhook');
    }
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId: string, page = 1, limit = 20) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.read' → 'webhook:read'
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VERIFY WEBHOOK EXISTS
      const webhook = await this.webhookRepository.findById(webhookId);
      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }

      // 3. GET DELIVERY HISTORY
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
    } catch (error: any) {
      this.logger.error(
        `Get delivery history failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          webhookId,
          page,
          limit,
          method: 'getDeliveryHistory',
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch delivery history');
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(deliveryId: string) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.read' → 'webhook:read'
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET DELIVERY WITH WEBHOOK INFO
      const delivery =
        await this.webhookRepository.findDeliveryById(deliveryId);
      if (!delivery) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      return delivery;
    } catch (error: any) {
      this.logger.error(
        `Get delivery status failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          deliveryId,
          method: 'getDeliveryStatus',
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch delivery status');
    }
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string) {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.manage' → 'webhook:manage'
    if (!this.permissionContext.hasPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET DELIVERY WITH WEBHOOK
      const delivery =
        await this.webhookRepository.findDeliveryById(deliveryId);
      if (!delivery) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      // 3. CHECK IF DELIVERY CAN BE RETRIED
      if (delivery.status !== 'failed') {
        throw new ConflictException(
          `Cannot retry delivery with status: ${delivery.status}`,
        );
      }

      if (delivery.retryCount >= delivery.webhook.retryCount) {
        throw new ConflictException('Maximum retry attempts reached');
      }

      // 4. UPDATE DELIVERY STATUS
      const updatedDelivery = await this.webhookRepository.updateDelivery(
        deliveryId,
        {
          status: 'pending',
          retryCount: delivery.retryCount + 1,
          error: null,
          completedAt: null,
        },
      );

      // 5. QUEUE RETRY JOB
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

      // 6. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_RETRY' as any,
        entityId: deliveryId,
        entityType: 'WEBHOOK_DELIVERY' as any,
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
    } catch (error: any) {
      this.logger.error(
        `Retry delivery failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          deliveryId,
          method: 'retryDelivery',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retry delivery');
    }
  }

  // ==================== HELPER METHODS ====================

  private validateWebhookUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      // Validate protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          'Webhook URL must use HTTP or HTTPS protocol',
        );
      }

      // Validate localhost restrictions (optional - for production)
      if (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1'
      ) {
        this.logger.warn(`Webhook URL points to localhost: ${url}`);
      }
    } catch (error) {
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
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  async getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Promise<any> {
    // 1. PERMISSION CHECK - FIXED: 'webhooks.read' → 'webhook:read'
    if (!this.permissionContext.hasPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      return await this.webhookRepository.getStatistics(timeframe);
    } catch (error: any) {
      this.logger.error(
        `Get statistics failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          timeframe,
          method: 'getStatistics',
        },
      );
      throw new BadRequestException('Failed to get webhook statistics');
    }
  }

  async cleanupOldDeliveries(
    daysToKeep: number = 90,
  ): Promise<{ deleted: number; message: string }> {
    // 1. PERMISSION CHECK - SYSTEM ADMIN ONLY - FIXED: 'system.admin' → 'system:admin'
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

      // AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'WEBHOOK_CLEANUP' as any,
        entityType: 'SYSTEM' as any,
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
    } catch (error: any) {
      this.logger.error(
        `Cleanup old deliveries failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          daysToKeep,
          method: 'cleanupOldDeliveries',
        },
      );
      throw new BadRequestException('Failed to cleanup old webhook deliveries');
    }
  }
}
