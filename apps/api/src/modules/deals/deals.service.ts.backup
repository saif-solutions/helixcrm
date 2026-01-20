import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { AuditLogService } from "../../shared/audit-log/audit-log.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { MoveDealStageDto } from "./dto/move-deal-stage.dto";
import { DealQueryDto } from "./dto/deal-query.dto";

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
    private auditLogService: AuditLogService,
  ) {}

  // ==================== CRUD METHODS ====================

  async create(data: { organizationId: string; userId: string } & CreateDealDto) {
    const { organizationId, userId, ...dealData } = data;

    try {
      // Validate pipeline and stage belong to organization
      const pipeline = await this.prisma.pipeline.findFirst({
        where: {
          id: dealData.pipelineId,
          organizationId,
        },
        include: {
          stages: true,
        },
      });

      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${dealData.pipelineId} not found`);
      }

      // Validate stage belongs to pipeline
      const stage = pipeline.stages.find(s => s.id === dealData.stageId);
      if (!stage) {
        throw new BadRequestException(`Stage ${dealData.stageId} does not belong to pipeline ${dealData.pipelineId}`);
      }

      // Validate contact belongs to organization if provided
      if (dealData.contactId) {
        const contact = await this.prisma.contact.findFirst({
          where: {
            id: dealData.contactId,
            organizationId,
          },
        });

        if (!contact) {
          throw new BadRequestException(`Contact ${dealData.contactId} not found in organization`);
        }
      }

      // Set owner to current user if not provided
      const ownerUserId = dealData.ownerUserId || userId;

      // Check for duplicate deal name in same pipeline
      const existingDeal = await this.prisma.deal.findFirst({
        where: {
          organizationId,
          pipelineId: dealData.pipelineId,
          name: dealData.name,
          deletedAt: null,
        },
      });

      if (existingDeal) {
        throw new ConflictException(`Deal with name "${dealData.name}" already exists in this pipeline`);
      }

      const deal = await this.prisma.deal.create({
        data: {
          ...dealData,
          organizationId,
          ownerUserId,
          probability: dealData.probability || stage.probability,
          status: (dealData.status as any) || 'open', // Cast to any for Prisma enum
          currency: dealData.currency || 'USD',
        },
        include: {
          pipeline: true,
          stage: true,
          contact: true,
          account: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'deal.created',
        entity: 'Deal',
        entityId: deal.id,
        organizationId,
        userId,
        after: deal,
        severity: 'info',
      });

      this.logger.log("Deal created successfully", {
        dealId: deal.id,
        organizationId,
        userId,
        event: 'deal_created',
      });

      return deal;
    } catch (error) {
      this.logger.error("Failed to create deal", error.stack, {
        organizationId,
        userId,
        dealName: dealData.name,
      });
      throw error;
    }
  }

  async findAll(organizationId: string, query: DealQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      pipelineId,
      stageId,
      status,
      ownerUserId,
      contactId,
      accountId,
      expectedCloseDateFrom,
      expectedCloseDateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = query;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // Cap at 100

    // Build where clause with tenant isolation
    const where: any = { 
      organizationId,
    };

    // Add soft delete filter
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['$'], string_contains: search } },
      ];
    }

    // Add pipeline filter
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Add stage filter
    if (stageId) {
      where.stageId = stageId;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add owner filter
    if (ownerUserId) {
      where.ownerUserId = ownerUserId;
    }

    // Add contact filter
    if (contactId) {
      where.contactId = contactId;
    }

    // Add account filter
    if (accountId) {
      where.accountId = accountId;
    }

    // Add expected close date range filter
    if (expectedCloseDateFrom || expectedCloseDateTo) {
      where.expectedCloseDate = {};
      
      if (expectedCloseDateFrom) {
        where.expectedCloseDate.gte = new Date(expectedCloseDateFrom);
      }
      
      if (expectedCloseDateTo) {
        where.expectedCloseDate.lte = new Date(expectedCloseDateTo);
      }
    }

    // Add amount range filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    // Validate sort field
    const validSortFields = [
      'name', 'amount', 'status', 'probability', 
      'expectedCloseDate', 'createdAt', 'updatedAt'
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    try {
      const [deals, total] = await Promise.all([
        this.prisma.deal.findMany({
          where,
          skip,
          take,
          include: {
            pipeline: {
              select: {
                id: true,
                name: true,
              },
            },
            stage: {
              select: {
                id: true,
                name: true,
                order: true,
                probability: true,
              },
            },
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            account: {
              select: {
                id: true,
                name: true,
              },
            },
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            [sortField]: sortOrder,
          },
        }),
        this.prisma.deal.count({ where }),
      ]);

      return {
        data: deals,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error("Failed to fetch deals", error.stack, {
        organizationId,
        query,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string, includeDeleted = false) {
    const where: any = {
      id,
      organizationId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const deal = await this.prisma.deal.findFirst({
      where,
      include: {
        pipeline: {
          include: {
            stages: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        stage: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto, organizationId: string, userId: string) {
    try {
      // First verify deal belongs to organization
      const existingDeal = await this.findOne(id, organizationId);

      // If updating pipeline or stage, validate they belong to organization
      if (updateDealDto.pipelineId || updateDealDto.stageId) {
        const pipelineId = updateDealDto.pipelineId || existingDeal.pipelineId;
        
        const pipeline = await this.prisma.pipeline.findFirst({
          where: {
            id: pipelineId,
            organizationId,
          },
          include: {
            stages: true,
          },
        });

        if (!pipeline) {
          throw new NotFoundException(`Pipeline ${pipelineId} not found`);
        }

        // If updating stage, validate it belongs to the pipeline
        if (updateDealDto.stageId) {
          const stage = pipeline.stages.find(s => s.id === updateDealDto.stageId);
          if (!stage) {
            throw new BadRequestException(`Stage ${updateDealDto.stageId} does not belong to pipeline ${pipelineId}`);
          }
        }
      }

      // Check for duplicate name if updating name
      if (updateDealDto.name && updateDealDto.name !== existingDeal.name) {
        const duplicateDeal = await this.prisma.deal.findFirst({
          where: {
            organizationId,
            pipelineId: existingDeal.pipelineId,
            name: updateDealDto.name,
            id: { not: id },
            deletedAt: null,
          },
        });

        if (duplicateDeal) {
          throw new ConflictException(`Deal with name "${updateDealDto.name}" already exists in this pipeline`);
        }
      }

      // Prepare update data
      const updateData: any = { ...updateDealDto };
      
      // Handle status enum type
      if (updateDealDto.status) {
        updateData.status = updateDealDto.status as any;
      }

      const deal = await this.prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          pipeline: true,
          stage: true,
          contact: true,
          account: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'deal.updated',
        entity: 'Deal',
        entityId: deal.id,
        organizationId,
        userId,
        before: existingDeal,
        after: deal,
        severity: 'info',
      });

      this.logger.log("Deal updated successfully", {
        dealId: deal.id,
        organizationId,
        userId,
        event: 'deal_updated',
      });

      return deal;
    } catch (error) {
      this.logger.error("Failed to update deal", error.stack, {
        dealId: id,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string, userId: string) {
    try {
      // First verify deal belongs to organization
      const deal = await this.findOne(id, organizationId);

      // Soft delete: set deletedAt timestamp
      const deletedDeal = await this.prisma.deal.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'deal.deleted',
        entity: 'Deal',
        entityId: deal.id,
        organizationId,
        userId,
        before: deal,
        after: deletedDeal,
        severity: 'warning',
      });

      this.logger.log("Deal soft deleted", {
        dealId: deal.id,
        organizationId,
        userId,
        event: 'deal_deleted',
      });

      return { message: 'Deal deleted successfully' };
    } catch (error) {
      this.logger.error("Failed to delete deal", error.stack, {
        dealId: id,
        organizationId,
        userId,
      });
      throw error;
    }
  }

  // ==================== DEAL STAGE TRANSITION METHODS ====================

  async moveStage(id: string, moveData: MoveDealStageDto, organizationId: string, userId: string) {
    // Use transaction for atomic update
    return this.prisma.$transaction(async (tx) => {
      // Get current deal with pipeline info
      const deal = await tx.deal.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          pipeline: {
            include: {
              stages: true,
            },
          },
          stage: true,
        },
      });

      if (!deal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      // Validate new stage belongs to same pipeline
      const newStage = deal.pipeline.stages.find(s => s.id === moveData.stageId);
      if (!newStage) {
        throw new BadRequestException(`Stage ${moveData.stageId} does not belong to pipeline ${deal.pipelineId}`);
      }

      // Don't allow moving to same stage
      if (deal.stageId === moveData.stageId) {
        throw new BadRequestException('Deal is already in this stage');
      }

      // Auto-update status based on stage probability
      let newStatus = deal.status;
      if (newStage.probability === 100) {
        newStatus = 'won' as any;
      } else if (newStage.probability === 0) {
        newStatus = 'lost' as any;
      } else if (deal.status === 'lost') {
        newStatus = 'open' as any;
      }

      // Update deal with new stage and probability
      const updatedDeal = await tx.deal.update({
        where: { id },
        data: {
          stageId: moveData.stageId,
          probability: moveData.probability ?? newStage.probability,
          status: newStatus,
        },
        include: {
          stage: true,
          pipeline: true,
        },
      });

      // Record stage history
      await tx.dealStageHistory.create({
        data: {
          dealId: id,
          fromStageId: deal.stageId,
          toStageId: moveData.stageId,
          changedByUserId: userId,
        },
      });

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'deal.stage_changed',
        entity: 'Deal',
        entityId: deal.id,
        organizationId,
        userId,
        before: deal,
        after: updatedDeal,
        severity: 'info',
        metadata: {
          fromStage: deal.stage.name,
          toStage: newStage.name,
          notes: moveData.notes,
        },
      });

      this.logger.log("Deal stage moved", {
        dealId: deal.id,
        fromStageId: deal.stageId,
        toStageId: moveData.stageId,
        organizationId,
        userId,
        event: 'deal_stage_moved',
      });

      return updatedDeal;
    });
  }

  async getStageHistory(dealId: string, organizationId: string) {
    // Verify deal belongs to organization
    await this.findOne(dealId, organizationId);

    const history = await this.prisma.dealStageHistory.findMany({
      where: {
        dealId,
        deal: {
          organizationId,
        },
      },
      include: {
        fromStage: {
          select: {
            id: true,
            name: true,
            order: true,
          },
        },
        toStage: {
          select: {
            id: true,
            name: true,
            order: true,
            probability: true,
          },
        },
        changedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });

    return history;
  }

  // ==================== ANALYTICS METHODS ====================

  async getDealStats(organizationId: string, pipelineId?: string) {
    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    const [
      totalCount,
      totalValue,
      wonCount,
      wonValue,
      lostCount,
      openCount,
    ] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.deal.count({ where: { ...where, status: 'won' } }),
      this.prisma.deal.aggregate({
        where: { ...where, status: 'won' },
        _sum: { amount: true },
      }),
      this.prisma.deal.count({ where: { ...where, status: 'lost' } }),
      this.prisma.deal.count({ where: { ...where, status: 'open' } }),
    ]);

    // Convert Decimal to number for calculations
    const totalAmount = totalValue._sum.amount ? Number(totalValue._sum.amount) : 0;
    const wonAmount = wonValue._sum.amount ? Number(wonValue._sum.amount) : 0;

    const averageDealValue = totalCount > 0 
      ? totalAmount / totalCount 
      : 0;

    const winRate = totalCount > 0 
      ? (wonCount / totalCount) * 100 
      : 0;

    return {
      totalCount,
      totalValue: totalAmount,
      wonCount,
      wonValue: wonAmount,
      lostCount,
      openCount,
      averageDealValue,
      winRate,
    };
  }

  async getPipelinePerformance(organizationId: string, pipelineId?: string) {
    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Get deals grouped by stage
    const stageStats = await this.prisma.deal.groupBy({
      by: ['stageId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    // Get stage details
    const stageDetails = await this.prisma.pipelineStage.findMany({
      where: {
        pipeline: {
          organizationId,
        },
      },
      select: {
        id: true,
        name: true,
        order: true,
        probability: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Map stats to stages
    const stages = stageDetails.map(stage => {
      const stat = stageStats.find(s => s.stageId === stage.id);
      const totalValue = stat?._sum.amount ? Number(stat._sum.amount) : 0;
      
      return {
        id: stage.id,
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        dealCount: stat?._count.id || 0,
        totalValue,
      };
    });

    return stages;
  }
}