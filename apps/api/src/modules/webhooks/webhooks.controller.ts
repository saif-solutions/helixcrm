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
import {
  WebhooksService,
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookPayload,
} from './webhooks.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TriggerWebhookDto } from './dto/trigger-webhook.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
interface CleanupResult {
  count: number;
}

class CreateWebhookRequestDto implements CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsUrl()
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

class UpdateWebhookRequestDto implements UpdateWebhookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

class TriggerWebhookRequestDto implements WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

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
  @ApiBody({ type: CreateWebhookRequestDto })
  @RequirePermission('webhooks.manage')
  async createWebhook(
    @Body(new ValidationPipe({ transform: true }))
    createWebhookDto: CreateWebhookRequestDto,
  ) {
    return this.webhooksService.createWebhook(createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks for current organization' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @RequirePermission('webhooks.read')
  async getAllWebhooks() {
    return this.webhooksService.getAllWebhooks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @RequirePermission('webhooks.read')
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
  @ApiBody({ type: UpdateWebhookRequestDto })
  @RequirePermission('webhooks.manage')
  async updateWebhook(
    @Param('id', ParseUUIDPipe) webhookId: string,
    @Body(new ValidationPipe({ transform: true }))
    updateWebhookDto: UpdateWebhookRequestDto,
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
  @RequirePermission('webhooks.manage')
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
  @RequirePermission('webhooks.trigger')
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
  @RequirePermission('webhooks.read')
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
  @RequirePermission('webhooks.read')
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
  @RequirePermission('webhooks.manage')
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
  @RequirePermission('webhooks.read')
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
  @RequirePermission('system.admin')
  async cleanupOldDeliveries(
    @Query('daysToKeep') daysToKeep: number = 90,
  ): Promise<CleanupResult> {
    return this.webhooksService.cleanupOldDeliveries(daysToKeep);
  }
}
