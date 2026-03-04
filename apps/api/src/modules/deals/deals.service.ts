// apps/api/src/modules/deals/deals.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppLogger } from '../../shared/logging/logger.service';
import {
  AuditLogService,
  AuditAction,
  AuditSeverity,
  AuditEntityType,
} from '../../shared/audit-log/audit-log.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { CreateDealSimpleDto } from './dto/create-deal-simple.dto';
import { DealRepository } from './repositories/deal.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { DealStatus } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
    private auditLogService: AuditLogService,
    private dealRepository: DealRepository,
    private permissionContext: PermissionContextService,
    private tenantContext: TenantContextService,
  ) {}

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  private async getOrCreateDefaultPipeline(userId: string) {
    const organizationId = this.tenantContext.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      let pipeline = await tx.pipeline.findFirst({
        where: {
          organizationId,
          isDefault: true,
        },
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!pipeline) {
        pipeline = await tx.pipeline.create({
          data: {
            name: 'Default Sales Pipeline',
            description: 'Default pipeline created automatically',
            isDefault: true,
            organizationId,
            stages: {
              create: [
                { name: 'Qualification', order: 1, probability: 10 },
                { name: 'Needs Analysis', order: 2, probability: 20 },
                { name: 'Proposal', order: 3, probability: 50 },
                { name: 'Negotiation', order: 4, probability: 75 },
                { name: 'Closed Won', order: 5, probability: 100 },
                { name: 'Closed Lost', order: 6, probability: 0 },
              ],
            },
          },
          include: {
            stages: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        });

        this.logger.log('Default pipeline created', {
          pipelineId: pipeline.id,
          organizationId,
          userId,
          event: 'default_pipeline_created',
        });
      }

      return pipeline;
    });
  }

  async createSimple(data: { userId: string } & CreateDealSimpleDto) {
    const { userId, ...dealData } = data;
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);
      const defaultPipeline = await this.getOrCreateDefaultPipeline(userId);

      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: dealData.stageId,
          pipelineId: defaultPipeline.id,
          pipeline: {
            organizationId,
          },
        },
      });

      if (!stage) {
        throw new BadRequestException(
          `Stage ${dealData.stageId} not found in organization's default pipeline`,
        );
      }

      const ownerUserId = dealData.ownerUserId || userId;

      const existingDeal = await this.prisma.deal.findFirst({
        where: {
          organizationId,
          pipelineId: defaultPipeline.id,
          name: {
            equals: dealData.title,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
      });

      if (existingDeal) {
        throw new ConflictException(
          `Deal with title "${dealData.title}" already exists in this pipeline`,
        );
      }

      const deal = await this.dealRepository.create({
        name: dealData.title,
        amount: dealData.value,
        pipeline: { connect: { id: defaultPipeline.id } },
        stage: { connect: { id: dealData.stageId } },
        owner: { connect: { id: ownerUserId } },
        contact: dealData.contactId
          ? { connect: { id: dealData.contactId } }
          : undefined,
        account: dealData.accountId
          ? { connect: { id: dealData.accountId } }
          : undefined,
        currency: dealData.currency || 'USD',
        probability: stage.probability,
        status: 'open' as DealStatus,
      });

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_CREATED,
        entityId: deal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        severity: AuditSeverity.LOW,
        metadata: {
          createdVia: 'phase3.4_simple_api',
          after: deal,
        },
      });

      this.logger.log('Deal created via simple API', {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_created_simple',
      });

      const response = {
        ...deal,
        title: deal.name,
        value: Number(deal.amount),
      };

      delete (response as any).name;
      delete (response as any).amount;

      return response;
    } catch (error) {
      this.logger.error(
        'Failed to create deal via simple API',
        error.stack,
        {
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          dealTitle: dealData.title,
          stageId: dealData.stageId,
        },
      );
      throw error;
    }
  }

  async create(data: { userId: string } & CreateDealDto) {
    const { userId, ...dealData } = data;
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);

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
        throw new NotFoundException(
          `Pipeline ${dealData.pipelineId} not found`,
        );
      }

      const stage = pipeline.stages.find((s) => s.id === dealData.stageId);
      if (!stage) {
        throw new BadRequestException(
          `Stage ${dealData.stageId} does not belong to pipeline ${dealData.pipelineId}`,
        );
      }

      if (dealData.contactId) {
        const contact = await this.prisma.contact.findFirst({
          where: {
            id: dealData.contactId,
            organizationId,
          },
        });

        if (!contact) {
          throw new BadRequestException(
            `Contact ${dealData.contactId} not found in organization`,
          );
        }
      }

      const ownerUserId = dealData.ownerUserId || userId;

      const existingDeal = await this.prisma.deal.findFirst({
        where: {
          organizationId,
          pipelineId: dealData.pipelineId,
          name: dealData.name,
          deletedAt: null,
        },
      });

      if (existingDeal) {
        throw new ConflictException(
          `Deal with name "${dealData.name}" already exists in this pipeline`,
        );
      }

      const deal = await this.dealRepository.create({
        ...dealData,
        pipeline: { connect: { id: dealData.pipelineId } },
        stage: { connect: { id: dealData.stageId } },
        owner: { connect: { id: ownerUserId } },
        contact: dealData.contactId
          ? { connect: { id: dealData.contactId } }
          : undefined,
        account: dealData.accountId
          ? { connect: { id: dealData.accountId } }
          : undefined,
        probability: dealData.probability || stage.probability,
        status: (dealData.status as DealStatus) || 'open',
        currency: dealData.currency || 'USD',
      });

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_CREATED,
        entityId: deal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          after: deal,
        },
        severity: AuditSeverity.LOW,
      });

      this.logger.log('Deal created successfully', {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_created',
      });

      return deal;
    } catch (error) {
      this.logger.error('Failed to create deal', error.stack, {
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        dealName: dealData.name,
      });
      throw error;
    }
  }

// In deals.service.ts - REMOVE the permission check from findAll
async findAll(query: DealQueryDto) {
  const organizationId = this.tenantContext.getTenantId();
  this.logger.debug(`Deals findAll for tenant: ${organizationId}`);

  // ✅ REMOVED the permission check - it's handled in the controller

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
  const take = Math.min(limit, 100);

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { metadata: { path: ['$'], string_contains: search } },
    ];
  }

  if (pipelineId) where.pipelineId = pipelineId;
  if (stageId) where.stageId = stageId;
  if (status) where.status = status;
  if (ownerUserId) where.ownerUserId = ownerUserId;
  if (contactId) where.contactId = contactId;
  if (accountId) where.accountId = accountId;

  if (expectedCloseDateFrom || expectedCloseDateTo) {
    where.expectedCloseDate = {};
    if (expectedCloseDateFrom) where.expectedCloseDate.gte = new Date(expectedCloseDateFrom);
    if (expectedCloseDateTo) where.expectedCloseDate.lte = new Date(expectedCloseDateTo);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  const validSortFields = [
    'name', 'amount', 'status', 'probability',
    'expectedCloseDate', 'createdAt', 'updatedAt'
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  try {
    const [deals, total] = await Promise.all([
      this.dealRepository.findAll({
        skip,
        take,
        where,
        orderBy: { [sortField]: sortOrder },
        includeDeleted,
      }),
      this.dealRepository.count(where, includeDeleted),
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
    this.logger.error('Failed to fetch deals', error.stack, {
      organizationId,
      tenantId: this.tenantContext.getTenantId(),
      query,
    });
    throw error;
  }
}

  async findOne(id: string, includeDeleted = false) {
    const organizationId = this.tenantContext.getTenantId();
    const deal = await this.dealRepository.findById(id, includeDeleted);

    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    if (deal.organizationId !== organizationId) {
      throw new ForbiddenException(`Access to deal ${id} denied`);
    }

    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto, userId: string) {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);

      const existingDeal = await this.dealRepository.findById(id);
      if (!existingDeal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      if (existingDeal.organizationId !== organizationId) {
        throw new ForbiddenException(`Access to deal ${id} denied`);
      }

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

        if (updateDealDto.stageId) {
          const stage = pipeline.stages.find(
            (s) => s.id === updateDealDto.stageId,
          );
          if (!stage) {
            throw new BadRequestException(
              `Stage ${updateDealDto.stageId} does not belong to pipeline ${pipelineId}`,
            );
          }
        }
      }

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
          throw new ConflictException(
            `Deal with name "${updateDealDto.name}" already exists in this pipeline`,
          );
        }
      }

      const updateData: any = { ...updateDealDto };
      if (updateDealDto.status) {
        updateData.status = updateDealDto.status as DealStatus;
      }

      const deal = await this.dealRepository.update({
        id,
        data: updateData,
      });

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_UPDATED,
        entityId: deal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          before: existingDeal,
          after: deal,
        },
        severity: AuditSeverity.LOW,
      });

      this.logger.log('Deal updated successfully', {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_updated',
      });

      return deal;
    } catch (error) {
      this.logger.error('Failed to update deal', error.stack, {
        dealId: id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);

      const deal = await this.dealRepository.findById(id);
      if (!deal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      if (deal.organizationId !== organizationId) {
        throw new ForbiddenException(`Access to deal ${id} denied`);
      }

      const deletedDeal = await this.dealRepository.softDelete(id);

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_DELETED,
        entityId: deal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          before: deal,
          after: deletedDeal,
        },
        severity: AuditSeverity.MEDIUM,
      });

      this.logger.log('Deal soft deleted', {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_deleted',
      });

      return { message: 'Deal deleted successfully' };
    } catch (error) {
      this.logger.error('Failed to delete deal', error.stack, {
        dealId: id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

  async moveStage(id: string, moveData: MoveDealStageDto, userId: string) {
    const organizationId = this.tenantContext.getTenantId();
    return this.prisma.$transaction(async (tx) => {
      const actorEmail = await this.getUserEmail(userId);

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

      const newStage = deal.pipeline.stages.find(
        (s) => s.id === moveData.stageId,
      );
      if (!newStage) {
        throw new BadRequestException(
          `Stage ${moveData.stageId} does not belong to pipeline ${deal.pipelineId}`,
        );
      }

      if (deal.stageId === moveData.stageId) {
        throw new BadRequestException('Deal is already in this stage');
      }

      let newStatus = deal.status;
      if (newStage.probability === 100) {
        newStatus = 'won' as DealStatus;
      } else if (newStage.probability === 0) {
        newStatus = 'lost' as DealStatus;
      } else if (deal.status === 'lost') {
        newStatus = 'open' as DealStatus;
      }

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

      await tx.dealStageHistory.create({
        data: {
          dealId: id,
          fromStageId: deal.stageId,
          toStageId: moveData.stageId,
          changedByUserId: userId,
        },
      });

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_UPDATED,
        entityId: deal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        severity: AuditSeverity.LOW,
        metadata: {
          before: deal,
          after: updatedDeal,
          fromStage: deal.stage.name,
          toStage: newStage.name,
          notes: moveData.notes,
        },
      });

      this.logger.log('Deal stage moved', {
        dealId: deal.id,
        fromStageId: deal.stageId,
        toStageId: moveData.stageId,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_stage_moved',
      });

      return updatedDeal;
    });
  }

  async getStageHistory(dealId: string) {
    const organizationId = this.tenantContext.getTenantId();
    const deal = await this.dealRepository.findById(dealId);
    if (!deal || deal.organizationId !== organizationId) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }

    return this.dealRepository.getStageHistory(dealId);
  }

  async getDealStats(pipelineId?: string) {
    return this.dealRepository.getDealStats(pipelineId);
  }

  async getPipelinePerformance(pipelineId?: string) {
    return this.dealRepository.getPipelinePerformance(pipelineId);
  }
}