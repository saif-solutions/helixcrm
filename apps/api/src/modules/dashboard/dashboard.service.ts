import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppLogger } from '../../shared/logging/logger.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
    private readonly dashboardRepository: DashboardRepository, // ✅ ADDED
    private readonly tenantContext: TenantContextService, // ✅ ADDED
    private readonly permissionContext: PermissionContextService, // ✅ ADDED
    private readonly auditLogService: AuditLogService, // ✅ ADDED
  ) {}

  async getStats() {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('dashboard.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: dashboard.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. PARALLEL QUERIES USING REPOSITORY (PRESERVE PERFORMANCE PATTERN)
      const [leads, contacts, deals, dealValue, defaultPipeline] =
        await Promise.all([
          this.dashboardRepository.getLeadCount(),
          this.dashboardRepository.getContactCount(),
          this.dashboardRepository.getDealCount(),
          this.dashboardRepository.getDealValueSum(),
          this.dashboardRepository.getDefaultPipelineWithStats(),
        ]);

      // 3. GET DEAL STATUS DISTRIBUTION
      const statusStats =
        await this.dashboardRepository.getDealStatusDistribution();

      // 4. CALCULATE STATISTICS (PRESERVE ORIGINAL BUSINESS LOGIC)
      const totalWonValue = dealValue._sum.amount
        ? Number(dealValue._sum.amount)
        : 0;

      // 5. GET DEAL STAGE DISTRIBUTION
      const stageStats = defaultPipeline
        ? defaultPipeline.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            order: stage.order,
            probability: stage.probability,
            dealCount: stage._count.deals,
          }))
        : [];

      // 6. BUILD STATS RESPONSE (PRESERVE ORIGINAL STRUCTURE)
      const stats = {
        summary: {
          leads,
          contacts,
          deals,
          totalWonValue,
          averageDealValue: deals > 0 ? totalWonValue / deals : 0,
        },
        pipeline: defaultPipeline
          ? {
              id: defaultPipeline.id,
              name: defaultPipeline.name,
              totalDeals: defaultPipeline._count.deals,
              stages: stageStats,
            }
          : null,
        dealStatus: statusStats.reduce(
          (acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };

      this.logger.log('Dashboard stats fetched', {
        organizationId: tenantId,
        leads,
        contacts,
        deals,
        event: 'dashboard_stats_fetched',
      });

      return {
        data: stats,
      };
    } catch (error: any) {
      // 7. ENTERPRISE ERROR HANDLING
      this.logger.error(
        `Dashboard.getStats failed: ${error.message}`,
        error.stack,
        {
          organizationId: tenantId,
          userId,
          method: 'getStats',
        },
      );

      // 8. PRESERVE EXISTING ERROR TYPES
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch dashboard stats');
    } finally {
      // 9. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Dashboard.getStats completed in ${duration}ms`, {
        duration,
        organizationId: tenantId,
        userId,
        performance: duration > 2000 ? 'slow' : 'normal',
      });
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || 'system@unknown';
    } catch (error) {
      this.logger.warn(
        `Failed to fetch user email for ${userId}: ${error.message}`,
      );
      return 'system@unknown';
    }
  }
}
