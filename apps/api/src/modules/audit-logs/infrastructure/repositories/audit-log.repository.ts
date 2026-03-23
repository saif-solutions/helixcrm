// apps/api/src/modules/audit-logs/infrastructure/repositories/audit-log.repository.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { IAuditLogRepository } from './audit-log.repository.interface';
import {
  AuditLog,
  AuditLogQuery,
  PaginatedAuditLogs,
  AuditStatistics,
  AuditLogEnumMapper,
  AuditLogTypes,
  fromPrismaAction,
} from '../../domain';
import { Prisma } from '@prisma/client';

// Define the where clause type for Prisma queries
type AuditLogWhereInput = Prisma.AuditLogWhereInput;

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    try {
      // Map domain enums to database enums
      const dbAction = AuditLogEnumMapper.toDatabaseAction(data.action);

      // Build metadata with extended action support
      const metadata: Record<string, unknown> = {
        ...data.metadata,
      };

      // Store extended action in metadata for retrieval
      if (!AuditLogTypes.isAuditAction(data.action)) {
        metadata._extendedAction = data.action;
        metadata._originalAction = data.action;
      }

      await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          actorUserId: data.actorUserId,
          actorEmail: data.actorEmail,
          actorType: data.actorType,
          action: dbAction,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: metadata as Prisma.JsonValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          correlationId: data.correlationId,
          requestId: data.requestId,
          severity: data.severity,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create audit log:', errorMessage);

      // Use NestJS exception with proper cause preservation
      throw new InternalServerErrorException(
        `Failed to create audit log: ${errorMessage}`,
        {
          cause: error instanceof Error ? error : undefined,
          description: 'Audit log creation failed',
        },
      );
    }
  }

  async findPaginated(query: AuditLogQuery): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 25), 100);
    const skip = (page - 1) * limit;

    const where: AuditLogWhereInput = {
      organizationId: query.organizationId,
    };

    // Apply date filters
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = query.startDate;
      if (query.endDate) where.createdAt.lte = query.endDate;
    }

    // Apply action filter (handle extended actions)
    if (query.action) {
      const dbAction = AuditLogEnumMapper.toDatabaseAction(query.action);
      where.action = dbAction;

      // For extended actions, also filter by metadata
      if (!AuditLogTypes.isAuditAction(query.action)) {
        where.AND = [
          {
            metadata: {
              path: ['_extendedAction'],
              equals: query.action,
            },
          },
        ];
      }
    }

    // Apply other filters
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorEmail) {
      where.actorEmail = { contains: query.actorEmail, mode: 'insensitive' };
    }
    if (query.severity) where.severity = query.severity;
    if (query.actorType) where.actorType = query.actorType;

    // Apply search filter
    if (query.search) {
      where.OR = [
        { actorEmail: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    try {
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            organizationId: true,
            action: true,
            entityType: true,
            entityId: true,
            actorEmail: true,
            actorUserId: true,
            actorType: true,
            ipAddress: true,
            userAgent: true,
            metadata: true,
            correlationId: true,
            requestId: true,
            severity: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      // Transform logs to use domain actions
      const transformedLogs = logs.map((log) => {
        const metadata = log.metadata as Record<string, unknown> | null;
        const extendedAction = metadata?._extendedAction;

        return {
          ...log,
          // Use extended action from metadata if available
          action: (extendedAction as string) || log.action,
        } as AuditLog;
      });

      return {
        data: transformedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch audit logs:', errorMessage);

      // Use NestJS exception with proper cause preservation
      throw new InternalServerErrorException(
        `Unable to retrieve audit logs: ${errorMessage}`,
        {
          cause: error instanceof Error ? error : undefined,
          description: 'Audit log query failed',
        },
      );
    }
  }

  async getStatistics(
    organizationId: string,
    days: number = 30,
  ): Promise<AuditStatistics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [totalLogs, logsBySeverity, topActions] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['severity'],
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              action: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      // For statistics, we'll use the raw actions (can't access metadata in groupBy)
      // In a production app, you might need a separate query for extended actions
      const transformedActions = topActions.map((item) => ({
        action: fromPrismaAction(item.action),
        count: item._count,
      }));

      return {
        totalLogs,
        logsBySeverity: logsBySeverity.map((item) => ({
          severity: item.severity,
          count: item._count,
        })),
        topActions: transformedActions,
        timeRange: {
          start: startDate,
          end: new Date(),
          days,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch audit statistics:', errorMessage);

      // Return empty statistics instead of throwing to preserve functionality
      return {
        totalLogs: 0,
        logsBySeverity: [],
        topActions: [],
        timeRange: { start: startDate, end: new Date(), days },
      };
    }
  }

  async getAvailableActions(): Promise<
    Array<{ value: string; count: number }>
  > {
    try {
      const actions = await this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
      });

      return actions.map((item) => ({
        value: item.action,
        count: item._count,
      }));
    } catch (error: unknown) {
      console.error('Failed to get available actions:', error);
      return [];
    }
  }

  async getAvailableEntityTypes(): Promise<
    Array<{ value: string; count: number }>
  > {
    try {
      const entityTypes = await this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: true,
      });

      return entityTypes.map((item) => ({
        value: item.entityType,
        count: item._count,
      }));
    } catch (error: unknown) {
      console.error('Failed to get available entity types:', error);
      return [];
    }
  }

  async getAvailableSeverityLevels(): Promise<
    Array<{ value: string; count: number }>
  > {
    try {
      const severityLevels = await this.prisma.auditLog.groupBy({
        by: ['severity'],
        _count: true,
      });

      return severityLevels.map((item) => ({
        value: item.severity,
        count: item._count,
      }));
    } catch (error: unknown) {
      console.error('Failed to get available severity levels:', error);
      return [];
    }
  }

  async getAvailableActorTypes(): Promise<
    Array<{ value: string; count: number }>
  > {
    try {
      const actorTypes = await this.prisma.auditLog.groupBy({
        by: ['actorType'],
        _count: true,
      });

      return actorTypes.map((item) => ({
        value: item.actorType,
        count: item._count,
      }));
    } catch (error: unknown) {
      console.error('Failed to get available actor types:', error);
      return [];
    }
  }

  async cleanupOldLogs(
    daysToKeep: number = 90,
  ): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      return { deletedCount: result.count };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to cleanup old audit logs:', errorMessage);
      return { deletedCount: 0 };
    }
  }
}
