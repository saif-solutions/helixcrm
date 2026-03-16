// src/modules/webhooks/webhooks.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { IsString, IsOptional, IsDate, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== DTOs ====================

class TriggerWebhookRequestDto {
  @IsString()
  event: string;

  data: unknown;

  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

interface CleanupResult {
  deleted: number;
}

// ==================== CONTROLLER ====================

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Webhook name already exists' })
  @ApiBody({ type: CreateWebhookDto })
  @RequirePermission('webhook:manage')
  async createWebhook(
    @Body(new ValidationPipe({ transform: true }))
    createWebhookDto: CreateWebhookDto,
  ) {
    return this.webhooksService.createWebhook(createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks for current organization' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @RequirePermission('webhook:read')
  async getAllWebhooks() {
    return this.webhooksService.getAllWebhooks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @RequirePermission('webhook:read')
  async getWebhookById(@Param('id', ParseUUIDPipe) webhookId: string) {
    return this.webhooksService.getWebhookById(webhookId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 409, description: 'Webhook name already exists' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiBody({ type: UpdateWebhookDto })
  @RequirePermission('webhook:manage')
  async updateWebhook(
    @Param('id', ParseUUIDPipe) webhookId: string,
    @Body(new ValidationPipe({ transform: true }))
    updateWebhookDto: UpdateWebhookDto,
  ) {
    return this.webhooksService.updateWebhook(webhookId, updateWebhookDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @RequirePermission('webhook:manage')
  async deleteWebhook(@Param('id', ParseUUIDPipe) webhookId: string) {
    return this.webhooksService.deleteWebhook(webhookId);
  }

  @Post(':id/trigger')
  @ApiOperation({ summary: 'Trigger a webhook delivery' })
  @ApiResponse({ status: 201, description: 'Webhook triggered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload or webhook not subscribed to event',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 409, description: 'Webhook is not active' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiBody({ type: TriggerWebhookRequestDto })
  @RequirePermission('webhook:trigger')
  async triggerWebhook(
    @Param('id', ParseUUIDPipe) webhookId: string,
    @Body(new ValidationPipe({ transform: true }))
    payload: TriggerWebhookRequestDto,
  ) {
    return this.webhooksService.triggerWebhook(webhookId, payload);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponse({ status: 200, description: 'Delivery history with pagination' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @RequirePermission('webhook:read')
  async getDeliveryHistory(
    @Param('id', ParseUUIDPipe) webhookId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    // Validate and clamp limits
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return this.webhooksService.getDeliveryHistory(
      webhookId,
      validatedPage,
      validatedLimit,
    );
  }

  @Get('deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get webhook delivery status' })
  @ApiResponse({ status: 200, description: 'Delivery status details' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @RequirePermission('webhook:read')
  async getDeliveryStatus(
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
  ) {
    return this.webhooksService.getDeliveryStatus(deliveryId);
  }

  @Post('deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiResponse({
    status: 200,
    description: 'Delivery retry queued successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or access denied',
  })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiResponse({ status: 409, description: 'Delivery cannot be retried' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery ID' })
  @RequirePermission('webhook:manage')
  async retryDelivery(@Param('deliveryId', ParseUUIDPipe) deliveryId: string) {
    return this.webhooksService.retryDelivery(deliveryId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get webhook delivery statistics' })
  @ApiResponse({ status: 200, description: 'Webhook statistics' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Timeframe for statistics (default: week)',
  })
  @RequirePermission('webhook:read')
  async getStatistics(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.webhooksService.getStatistics(timeframe);
  }

  @Delete('deliveries/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old delivery records (admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  @ApiResponse({ status: 403, description: 'Admin permission required' })
  @ApiQuery({
    name: 'daysToKeep',
    required: false,
    type: Number,
    description: 'Number of days to keep delivery records (default: 90)',
  })
  @RequirePermission('system:admin')
  async cleanupOldDeliveries(
    @Query('daysToKeep') daysToKeep: number = 90,
  ): Promise<CleanupResult> {
    return this.webhooksService.cleanupOldDeliveries(daysToKeep);
  }
}
