import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AuthGuard } from '../../../../shared/guards/auth.guard';
import { TenantGuard } from '../../../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../../../shared/guards/permission.guard';
import { RequirePermission } from "../../../../shared/decorators/require-permission.decorator';

import {
  AuditAction,
  AuditEntityType,
  ActorType,
  AuditSeverity,
  AuditLogTypes,
} from '../../domain';

import { AuditLogQueryService } from '../../application/services/audit-log-query.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller({ path: 'admin/audit-logs', version: '1' })
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogQueryService: AuditLogQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @RequirePermission('audit:read')
  async getAuditLogs(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('severity') severity?: string,
    @Query('actorType') actorType?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID not found in request');
    }

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

    if (startDateObj && endDateObj && startDateObj > endDateObj) {
      throw new BadRequestException('Start date must be before end date');
    }

    const query: any = {
      organizationId,
      page,
      limit,
      startDate: startDateObj,
      endDate: endDateObj,
      actorEmail,
      search,
    };

    if (action && AuditLogTypes.isAuditAction(action)) query.action = action;
    if (entityType && AuditLogTypes.isAuditEntityType(entityType))
      query.entityType = entityType;
    if (severity && AuditLogTypes.isAuditSeverity(severity))
      query.severity = severity;
    if (actorType && AuditLogTypes.isActorType(actorType))
      query.actorType = actorType;

    return this.auditLogQueryService.getAuditLogs(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @RequirePermission('audit:read')
  async getStats(@Request() req) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID not found in request');
    }

    return this.auditLogQueryService.getAuditStatistics(organizationId, 30);
  }

  @Get('available-filters')
  @ApiOperation({ summary: 'Get available filter options' })
  @RequirePermission('audit:read')
  async getAvailableFilters() {
    const [actions, entityTypes, severityLevels, actorTypes] =
      await Promise.all([
        this.auditLogQueryService.getAvailableActions(),
        this.auditLogQueryService.getAvailableEntityTypes(),
        this.auditLogQueryService.getAvailableSeverityLevels(),
        this.auditLogQueryService.getAvailableActorTypes(),
      ]);

    return {
      success: true,
      data: { actions, entityTypes, severityLevels, actorTypes },
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  @RequirePermission('audit:read')
  async exportAuditLogs(@Request() req, @Res() res: Response) {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID not found in request');
    }

    const csv =
      'Timestamp,Action,Entity Type,Entity ID,Actor Email,Actor Type,Severity,IP Address,User Agent,Request ID,Correlation ID,Metadata\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  }
}
