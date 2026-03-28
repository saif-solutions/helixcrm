// apps/api/src/modules/dashboard/repositories/dashboard.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { DealStatus } from '@prisma/client';

// Define interfaces for better type safety
// Note: DealValueSumResult removed - not used in this file

interface StageWithDealCount {
  id: string;
  name: string;
  order: number;
  probability: number;
  _count: {
    deals: number;
  };
}

interface PipelineWithStats {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  stages: StageWithDealCount[];
  _count: {
    deals: number;
  };
}

interface DealStatusDistributionItem {
  status: DealStatus;
  _count: {
    id: number;
  };
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

// Helper function to normalize any thrown value to an Error object with cause
function normalizeError(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

@Injectable()
export class DashboardRepository extends TenantAwareRepository {
  private readonly logger = new Logger(DashboardRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get total count of leads in the current tenant
   * @returns Promise with the number of leads
   */
  async getLeadCount(): Promise<number> {
    try {
      return await this.prisma.lead.count({
        where: {
          organizationId: this.tenantId,
          deletedAt: null,
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get lead count: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get lead count');
    }
  }

  /**
   * Get total count of contacts in the current tenant
   * @returns Promise with the number of contacts
   */
  async getContactCount(): Promise<number> {
    try {
      return await this.prisma.contact.count({
        where: {
          organizationId: this.tenantId,
          deletedAt: null,
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get contact count: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get contact count');
    }
  }

  /**
   * Get total count of deals in the current tenant (excluding soft-deleted)
   * @returns Promise with the number of deals
   */
  async getDealCount(): Promise<number> {
    try {
      return await this.prisma.deal.count({
        where: {
          organizationId: this.tenantId,
          deletedAt: null,
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get deal count: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get deal count');
    }
  }

  /**
   * Get sum of won deal values in the current tenant
   * @returns Promise with the total won deal value
   */
  async getDealValueSum(): Promise<number> {
    try {
      const result = await this.prisma.deal.aggregate({
        where: {
          organizationId: this.tenantId,
          deletedAt: null,
          status: 'won',
        },
        _sum: { amount: true },
      });

      return result._sum.amount ? Number(result._sum.amount) : 0;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get deal value sum: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get deal value sum');
    }
  }

  /**
   * Get the default pipeline with stage statistics
   * @returns Promise with pipeline details and stage statistics
   */
  async getDefaultPipelineWithStats(): Promise<PipelineWithStats | null> {
    try {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: {
          organizationId: this.tenantId,
          isDefault: true,
          deletedAt: null,
        },
        include: {
          stages: {
            where: {
              deletedAt: null,
            },
            include: {
              _count: {
                select: {
                  deals: {
                    where: {
                      organizationId: this.tenantId,
                      deletedAt: null,
                    },
                  },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              deals: {
                where: {
                  organizationId: this.tenantId,
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      return pipeline as PipelineWithStats | null;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get default pipeline: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get default pipeline');
    }
  }

  /**
   * Get deal distribution by status
   * @returns Promise with status distribution array
   */
  async getDealStatusDistribution(): Promise<DealStatusDistributionItem[]> {
    try {
      const result = await this.prisma.deal.groupBy({
        by: ['status'],
        where: {
          organizationId: this.tenantId,
          deletedAt: null,
        },
        _count: { id: true },
      });

      return result as DealStatusDistributionItem[];
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get deal status distribution: ${errorMessage}`,
      );
      throw normalizeError(error, 'Failed to get deal status distribution');
    }
  }

  /**
   * Get recent activities (deals, contacts, leads) for dashboard timeline
   * @param limit Maximum number of activities to return
   * @returns Promise with recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<{
    deals: Array<{
      id: string;
      name: string;
      createdAt: Date;
      status: DealStatus;
    }>;
    contacts: Array<{
      id: string;
      firstName: string;
      lastName: string;
      createdAt: Date;
    }>;
    leads: Array<{ id: string; name: string; createdAt: Date; status: string }>;
  }> {
    try {
      const [recentDeals, recentContacts, recentLeads] = await Promise.all([
        this.prisma.deal.findMany({
          where: {
            organizationId: this.tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.contact.findMany({
          where: {
            organizationId: this.tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.lead.findMany({
          where: {
            organizationId: this.tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

      return {
        deals: recentDeals,
        contacts: recentContacts,
        leads: recentLeads,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get recent activities: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get recent activities');
    }
  }

  /**
   * Get pipeline performance metrics
   * @returns Promise with pipeline performance data
   */
  async getPipelinePerformance(): Promise<{
    stages: Array<{
      id: string;
      name: string;
      order: number;
      dealCount: number;
      conversionRate: number;
    }>;
    totalDeals: number;
    conversionToWon: number;
  }> {
    try {
      const pipeline = await this.getDefaultPipelineWithStats();

      if (!pipeline) {
        return {
          stages: [],
          totalDeals: 0,
          conversionToWon: 0,
        };
      }

      const totalDeals = pipeline._count.deals;
      const stages = pipeline.stages.map((stage, index) => {
        const previousStageDeals =
          index > 0 ? pipeline.stages[index - 1]._count.deals : totalDeals;
        const conversionRate =
          previousStageDeals > 0
            ? (stage._count.deals / previousStageDeals) * 100
            : 0;

        return {
          id: stage.id,
          name: stage.name,
          order: stage.order,
          dealCount: stage._count.deals,
          conversionRate: Math.round(conversionRate * 100) / 100,
        };
      });

      // Find won stage (usually probability 100)
      const wonStage = pipeline.stages.find(
        (stage) => stage.probability === 100,
      );
      const conversionToWon =
        wonStage && totalDeals > 0
          ? (wonStage._count.deals / totalDeals) * 100
          : 0;

      return {
        stages,
        totalDeals,
        conversionToWon: Math.round(conversionToWon * 100) / 100,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to get pipeline performance: ${errorMessage}`);
      throw normalizeError(error, 'Failed to get pipeline performance');
    }
  }
}
