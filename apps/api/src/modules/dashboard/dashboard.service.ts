import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  async getStats(organizationId: string) {
    try {
      // Parallel queries for performance
      const [leads, contacts, deals, dealValue, defaultPipeline] = await Promise.all([
        // Count leads
        this.prisma.lead.count({ 
          where: { organizationId } 
        }),
        
        // Count contacts
        this.prisma.contact.count({ 
          where: { organizationId } 
        }),
        
        // Count active deals
        this.prisma.deal.count({ 
          where: { 
            organizationId,
            deletedAt: null
          } 
        }),
        
        // Sum of won deal values
        this.prisma.deal.aggregate({
          where: { 
            organizationId,
            deletedAt: null,
            status: 'won'
          },
          _sum: {
            amount: true
          }
        }),
        
        // Get default pipeline with stage statistics
        this.prisma.pipeline.findFirst({
          where: {
            organizationId,
            isDefault: true
          },
          include: {
            stages: {
              include: {
                _count: {
                  select: {
                    deals: {
                      where: {
                        organizationId,
                        deletedAt: null
                      }
                    }
                  }
                }
              },
              orderBy: {
                order: 'asc'
              }
            },
            _count: {
              select: {
                deals: {
                  where: {
                    organizationId,
                    deletedAt: null
                  }
                }
              }
            }
          }
        })
      ]);

      // Calculate statistics
      const totalWonValue = dealValue._sum.amount ? Number(dealValue._sum.amount) : 0;
      
      // Get deal stage distribution
      const stageStats = defaultPipeline ? defaultPipeline.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        dealCount: stage._count.deals
      })) : [];

      // Get deal status distribution
      const statusStats = await this.prisma.deal.groupBy({
        by: ['status'],
        where: {
          organizationId,
          deletedAt: null
        },
        _count: {
          id: true
        }
      });

      const stats = {
        summary: {
          leads,
          contacts,
          deals,
          totalWonValue,
          averageDealValue: deals > 0 ? totalWonValue / deals : 0
        },
        pipeline: defaultPipeline ? {
          id: defaultPipeline.id,
          name: defaultPipeline.name,
          totalDeals: defaultPipeline._count.deals,
          stages: stageStats
        } : null,
        dealStatus: statusStats.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>)
      };

      this.logger.log("Dashboard stats fetched", {
        organizationId,
        leads,
        contacts,
        deals,
        event: 'dashboard_stats_fetched',
      });

      return {
        data: stats,
      };
    } catch (error) {
      this.logger.error("Failed to fetch dashboard stats", error.stack, {
        organizationId,
      });
      throw error;
    }
  }
}