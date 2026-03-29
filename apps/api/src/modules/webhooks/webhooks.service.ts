// apps/api/src/modules/webhooks/webhooks.service.ts

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
import { StatisticsResult } from './repositories/webhook.repository';
import { Webhook, WebhookDelivery } from '@helixcrm/prisma-types';

// ==================== HELPER FUNCTIONS ====================

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

// Permission context type guard
interface PermissionContextWithHasPermission {
  hasPermission(permission: string): boolean;
}

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
  data: WebhookDelivery[];
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

export interface DeliveryStatusResponse {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'processing' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  error?: string;
  attemptedAt: Date;
  completedAt?: Date;
  retryCount: number;
}

export interface WebhookStatistics {
  timeframe: 'day' | 'week' | 'month';
  total: number;
  success: number;
  failed: number;
  pending: number;
  avgResponseTime: number;
  successRate: number;
}

function hasErrorMessage(
  delivery: unknown,
): delivery is { errorMessage: string | null } {
  return (
    typeof delivery === 'object' &&
    delivery !== null &&
    'errorMessage' in delivery
  );
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
    private readonly webhookRepository: WebhookRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== PERMISSION & CONTEXT HELPERS ====================

  private checkPermission(permission: string): boolean {
    const context: unknown = this.permissionContext;
    if (this.isPermissionContext(context)) {
      try {
        return context.hasPermission(permission) === true;
      } catch {
        this.logger.debug(
          `Permission check failed for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  private isPermissionContext(
    context: unknown,
  ): context is PermissionContextWithHasPermission {
    return (
      typeof context === 'object' &&
      context !== null &&
      typeof (context as PermissionContextWithHasPermission).hasPermission ===
        'function'
    );
  }

  private getTenantId(): string {
    const id = this.tenantContext.getTenantId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private getUserId(): string {
    const id = this.tenantContext.getUserId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private handleError(
    error: unknown,
    context: string,
    metadata: Record<string, unknown>,
  ): never {
    const errorMessage = getErrorMessage(error);
    const errorStack = getErrorStack(error);

    this.logger.error(
      `${context} failed: ${errorMessage}`,
      errorStack,
      JSON.stringify(metadata),
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

  private removeSecret(webhook: Webhook): WebhookWithoutSecret {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeoutMs: webhook.timeoutMs,
      headers: webhook.headers as Record<string, string>,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  // ==================== CRUD METHODS ====================

  async createWebhook(
    createWebhookDto: CreateWebhookDto,
  ): Promise<WebhookWithoutSecret> {
    if (!this.checkPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        severity: getSeverity('info'),
      });

      this.logger.log(`Webhook created successfully`, {
        webhookId: webhook.id,
        tenantId,
        userId: this.maskUserId(userId),
        name: webhook.name,
        url: webhook.url,
        eventType: 'webhook_created',
        processingTime: Date.now() - startTime,
      });

      return this.removeSecret(webhook);
    } catch (error) {
      this.handleError(error, 'create webhook', {
        tenantId,
        userId: this.maskUserId(userId),
        data: createWebhookDto,
        method: 'createWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  async updateWebhook(
    webhookId: string,
    updateWebhookDto: UpdateWebhookDto,
  ): Promise<WebhookWithoutSecret> {
    if (!this.checkPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        severity: getSeverity('info'),
      });

      this.logger.log(`Webhook updated successfully`, {
        webhookId,
        tenantId,
        userId: this.maskUserId(userId),
        updatedFields: Object.keys(updateWebhookDto),
        eventType: 'webhook_updated',
        processingTime: Date.now() - startTime,
      });

      return this.removeSecret(updatedWebhook);
    } catch (error) {
      this.handleError(error, 'update webhook', {
        tenantId,
        userId: this.maskUserId(userId),
        webhookId,
        data: updateWebhookDto,
        method: 'updateWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  async deleteWebhook(webhookId: string): Promise<{ message: string }> {
    if (!this.checkPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        severity: getSeverity('warning'),
      });

      this.logger.log(`Webhook deleted successfully`, {
        webhookId,
        tenantId,
        userId: this.maskUserId(userId),
        name: existingWebhook.name,
        eventType: 'webhook_deleted',
        processingTime: Date.now() - startTime,
      });

      return { message: 'Webhook deleted successfully' };
    } catch (error) {
      this.handleError(error, 'delete webhook', {
        tenantId,
        userId: this.maskUserId(userId),
        webhookId,
        method: 'deleteWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  async getAllWebhooks(): Promise<WebhookWithoutSecret[]> {
    if (!this.checkPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const webhooks = await this.webhookRepository.findAll();
      return webhooks.map((webhook) => this.removeSecret(webhook));
    } catch (error) {
      this.handleError(error, 'get all webhooks', {
        tenantId,
        userId: this.maskUserId(userId),
        method: 'getAllWebhooks',
      });
    }
  }

  async getWebhookById(webhookId: string): Promise<WebhookWithoutSecret> {
    if (!this.checkPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const webhook = await this.webhookRepository.findById(webhookId);
      if (!webhook) {
        throw new NotFoundException(`Webhook ${webhookId} not found`);
      }
      return this.removeSecret(webhook);
    } catch (error) {
      this.handleError(error, 'get webhook by ID', {
        tenantId,
        userId: this.maskUserId(userId),
        webhookId,
        method: 'getWebhookById',
      });
    }
  }

  // ==================== DELIVERY METHODS ====================

  async triggerWebhook(
    webhookId: string,
    payload: WebhookPayload,
  ): Promise<TriggerWebhookResponse> {
    if (!this.checkPermission('webhook:trigger')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:trigger required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        entityId: webhookId,
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
        severity: getSeverity('info'),
      });

      this.logger.log(`Webhook triggered successfully`, {
        webhookId,
        deliveryId: delivery.id,
        tenantId,
        userId: this.maskUserId(userId),
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
        userId: this.maskUserId(userId),
        webhookId,
        payload,
        method: 'triggerWebhook',
        processingTime: Date.now() - startTime,
      });
    }
  }

  async getDeliveryHistory(
    webhookId: string,
    page = 1,
    limit = 20,
  ): Promise<DeliveryHistoryResponse> {
    if (!this.checkPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        userId: this.maskUserId(userId),
        webhookId,
        page,
        limit,
        method: 'getDeliveryHistory',
      });
    }
  }

  async getDeliveryStatus(deliveryId: string): Promise<DeliveryStatusResponse> {
    if (!this.checkPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const delivery =
        await this.webhookRepository.findDeliveryById(deliveryId);
      if (!delivery) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      const validStatuses = [
        'pending',
        'processing',
        'success',
        'failed',
      ] as const;
      const status = delivery.status as (typeof validStatuses)[number];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid delivery status: ${delivery.status}`);
      }

      return {
        id: delivery.id,
        webhookId: delivery.webhookId,
        event: delivery.event,
        payload: delivery.payload,
        status,
        statusCode: delivery.statusCode ?? undefined,
        response: delivery.response ?? undefined,
        error: hasErrorMessage(delivery)
          ? (delivery.errorMessage ?? undefined)
          : undefined,
        attemptedAt: delivery.attemptedAt,
        completedAt: delivery.completedAt ?? undefined,
        retryCount: delivery.retryCount,
      };
    } catch (error) {
      this.handleError(error, 'get delivery status', {
        tenantId,
        userId: this.maskUserId(userId),
        deliveryId,
        method: 'getDeliveryStatus',
      });
    }
  }

  async retryDelivery(deliveryId: string): Promise<RetryDeliveryResponse> {
    if (!this.checkPermission('webhook:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

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
        severity: getSeverity('info'),
      });

      this.logger.log(`Delivery retry queued successfully`, {
        deliveryId,
        tenantId,
        userId: this.maskUserId(userId),
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
        userId: this.maskUserId(userId),
        deliveryId,
        method: 'retryDelivery',
        processingTime: Date.now() - startTime,
      });
    }
  }

  async getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Promise<WebhookStatistics> {
    if (!this.checkPermission('webhook:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: webhook:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const stats: StatisticsResult =
        await this.webhookRepository.getStatistics(timeframe);
      return {
        timeframe: stats.timeframe,
        total: stats.total,
        success: stats.byStatus.success,
        failed: stats.byStatus.failed,
        pending: stats.byStatus.pending,
        avgResponseTime: stats.avgResponseTime,
        successRate: stats.successRate,
      };
    } catch (error) {
      this.handleError(error, 'get statistics', {
        tenantId,
        userId: this.maskUserId(userId),
        timeframe,
        method: 'getStatistics',
      });
    }
  }

  async cleanupOldDeliveries(daysToKeep = 90): Promise<CleanupResponse> {
    if (!this.checkPermission('system:admin')) {
      throw new ForbiddenException(
        'Insufficient permissions: system:admin required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const result =
        await this.webhookRepository.cleanupOldDeliveries(daysToKeep);

      await this.auditLogService.logEvent({
        action: 'WEBHOOK_CLEANUP',
        entityType: 'WEBHOOK',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          daysToKeep,
          deletedCount: result.count,
          tenantId,
        },
        severity: getSeverity('info'),
      });

      this.logger.log(`Old webhook deliveries cleaned up`, {
        tenantId,
        userId: this.maskUserId(userId),
        deleted: result.count,
        daysToKeep,
        eventType: 'webhook_cleanup',
      });

      return {
        deleted: result.count,
        message: `Successfully deleted ${result.count} old webhook deliveries older than ${daysToKeep} days`,
      };
    } catch (error) {
      this.handleError(error, 'cleanup old deliveries', {
        tenantId,
        userId: this.maskUserId(userId),
        daysToKeep,
        method: 'cleanupOldDeliveries',
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
      return user?.email ?? `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${this.maskUserId(userId)}: ${getErrorMessage(error)}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  private maskUserId(userId: string): string {
    if (!userId || userId.length < 8) return '****';
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
}
