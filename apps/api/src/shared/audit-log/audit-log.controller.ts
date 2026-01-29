import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService, AuditAction, AuditEntityType } from './audit-log.service';
import { AuthGuard } from '../guards/auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction, description: 'Filter by action' })
  @ApiQuery({ name: 'entityType', required: false, enum: AuditEntityType, description: 'Filter by entity type' })
  @ApiQuery({ name: 'actorEmail', required: false, type: String, description: 'Filter by actor email' })
  @RequirePermission('audit.read')
  async getAuditLogs(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorEmail') actorEmail?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    // Validate date range
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;
    
    if (startDate) {
      startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
    }
    
    if (endDate) {
      endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
    }
    
    // Validate date range order
    if (startDateObj && endDateObj && startDateObj > endDateObj) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Parse enums if provided
    const parsedAction = action ? AuditAction[action as keyof typeof AuditAction] : undefined;
    const parsedEntityType = entityType ? AuditEntityType[entityType as keyof typeof AuditEntityType] : undefined;

    return this.auditLogService.getAuditLogs({
      organizationId,
      page,
      limit,
      startDate: startDateObj,
      endDate: endDateObj,
      action: parsedAction,
      entityType: parsedEntityType,
      actorEmail,
    });
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get all available audit actions' })
  @RequirePermission('audit.read')
  async getAuditActions() {
    return {
      actions: Object.values(AuditAction),
    };
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Get all available entity types' })
  @RequirePermission('audit.read')
  async getEntityTypes() {
    return {
      entityTypes: Object.values(AuditEntityType),
    };
  }
}