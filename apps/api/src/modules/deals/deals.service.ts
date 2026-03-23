// apps/api/src/modules/deals/deals.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppLogger } from '../../shared/logging/logger.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '../../shared/audit-log/audit-log.constants';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { CreateDealSimpleDto } from './dto/create-deal-simple.dto';
import { DealRepository } from './repositories/deal.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import {
  DealStatus,
  Prisma,
  User,
  Pipeline,
  PipelineStage,
  Deal,
} from '@prisma/client';

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

// Type-safe JSON handling for Prisma
type JsonValue = Prisma.JsonValue;
type JsonObject = Record<string, unknown>;

// Helper function for runtime type safety
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Define types for better type safety
interface DealWithRelations extends Deal {
  pipeline: Pipeline;
  stage: PipelineStage;
  owner: User;
}

interface DealSimpleResponse {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  status: DealStatus;
  expectedCloseDate: Date | null;
  pipelineId: string;
  stageId: string;
  ownerUserId: string;
  contactId: string | null;
  accountId: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
  metadata: JsonObject;
}

interface BulkCreateError {
  index: number;
  message: string;
  data: unknown;
}

interface BulkUpdateError {
  id: string;
  message: string;
}

interface BulkDeleteResult {
  successful: string[];
  failed: Array<{ id: string; reason: string }>;
}

interface BulkMoveStageError {
  dealId: string;
  message: string;
}

interface DealFindAllResult {
  data: DealWithRelations[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface StageStats {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  averageProbability: number;
}

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
      return user?.email ?? `user-${userId}@unknown.example.com`;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${errorMessage}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  private async getOrCreateDefaultPipeline(
    userId: string,
  ): Promise<Pipeline & { stages: PipelineStage[] }> {
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

  async createSimple(
    data: { userId: string } & CreateDealSimpleDto,
  ): Promise<DealSimpleResponse> {
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

      const ownerUserId = dealData.ownerUserId ?? userId;

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

      const deal = await this.prisma.deal.create({
        data: {
          name: dealData.title,
          amount: dealData.value,
          pipelineId: defaultPipeline.id,
          stageId: dealData.stageId,
          ownerUserId: ownerUserId,
          contactId: dealData.contactId,
          accountId: dealData.accountId,
          currency: dealData.currency ?? 'USD',
          probability: stage.probability,
          status: 'open',
          organizationId,
        },
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

      // Type-safe metadata handling
      const safeMetadata: JsonObject = isJsonObject(deal.metadata)
        ? deal.metadata
        : {};

      // Transform response to match expected format
      const finalResponse: DealSimpleResponse = {
        id: deal.id,
        title: deal.name,
        value: Number(deal.amount),
        currency: deal.currency,
        probability: deal.probability,
        status: deal.status,
        expectedCloseDate: deal.expectedCloseDate,
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        ownerUserId: deal.ownerUserId,
        contactId: deal.contactId,
        accountId: deal.accountId,
        organizationId: deal.organizationId,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        deletedAt: deal.deletedAt,
        deletedBy: deal.deletedBy,
        metadata: safeMetadata,
      };

      return finalResponse;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to create deal via simple API',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          dealTitle: dealData.title,
          stageId: dealData.stageId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  async create(
    data: { userId: string } & CreateDealDto,
  ): Promise<DealWithRelations> {
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

      const ownerUserId = dealData.ownerUserId ?? userId;

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

      const deal = await this.prisma.deal.create({
        data: {
          name: dealData.name,
          amount: dealData.amount,
          currency: dealData.currency ?? 'USD',
          probability: dealData.probability ?? stage.probability,
          status: (dealData.status as DealStatus) ?? 'open',
          expectedCloseDate: dealData.expectedCloseDate,
          pipelineId: dealData.pipelineId,
          stageId: dealData.stageId,
          ownerUserId: ownerUserId,
          contactId: dealData.contactId,
          accountId: dealData.accountId,
          organizationId,
          metadata: dealData.metadata as JsonValue,
        },
        include: {
          pipeline: true,
          stage: true,
          owner: true,
        },
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to create deal',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          dealName: dealData.name,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  async findAll(query: DealQueryDto): Promise<DealFindAllResult> {
    const organizationId = this.tenantContext.getTenantId();
    this.logger.debug(`Deals findAll for tenant: ${organizationId}`);

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

    // Build where clause with proper typing
    const where: Prisma.DealWhereInput = {
      organizationId,
    };

    // Handle deleted filter
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Handle search with proper typing
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { metadata: { path: ['$'], string_contains: search } },
      ];
    }

    // Add filters with proper type checking
    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.stageId = stageId;
    if (status) where.status = status as DealStatus;
    if (ownerUserId) where.ownerUserId = ownerUserId;
    if (contactId) where.contactId = contactId;
    if (accountId) where.accountId = accountId;

    // Handle date range with proper typing
    if (expectedCloseDateFrom || expectedCloseDateTo) {
      const expectedCloseDateFilter: { gte?: Date; lte?: Date } = {};
      if (expectedCloseDateFrom) {
        expectedCloseDateFilter.gte = new Date(expectedCloseDateFrom);
      }
      if (expectedCloseDateTo) {
        expectedCloseDateFilter.lte = new Date(expectedCloseDateTo);
      }
      where.expectedCloseDate = expectedCloseDateFilter;
    }

    // Handle amount range with proper typing
    if (minAmount !== undefined || maxAmount !== undefined) {
      const amountFilter: { gte?: number; lte?: number } = {};
      if (minAmount !== undefined) {
        amountFilter.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        amountFilter.lte = maxAmount;
      }
      where.amount = amountFilter;
    }

    const validSortFields = [
      'name',
      'amount',
      'status',
      'probability',
      'expectedCloseDate',
      'createdAt',
      'updatedAt',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    try {
      const [deals, total] = await Promise.all([
        this.prisma.deal.findMany({
          skip,
          take,
          where,
          orderBy: { [sortField]: sortOrder },
          include: {
            pipeline: true,
            stage: true,
            owner: true,
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to fetch deals',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          query,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  async findOne(
    id: string,
    includeDeleted = false,
  ): Promise<DealWithRelations> {
    const organizationId = this.tenantContext.getTenantId();

    const where: Prisma.DealWhereInput = {
      id,
      organizationId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const deal = await this.prisma.deal.findFirst({
      where,
      include: {
        pipeline: true,
        stage: true,
        owner: true,
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    return deal;
  }

  async update(
    id: string,
    updateDealDto: UpdateDealDto,
    userId: string,
  ): Promise<DealWithRelations> {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);

      const existingDeal = await this.prisma.deal.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existingDeal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      // Validate pipeline and stage if they're being updated
      if (updateDealDto.pipelineId || updateDealDto.stageId) {
        const pipelineId = updateDealDto.pipelineId ?? existingDeal.pipelineId;

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

      // Check for duplicate name
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

      // Prepare update data with proper typing
      const updateData: Prisma.DealUpdateInput = {
        ...(updateDealDto as Prisma.DealUpdateInput),
        status: updateDealDto.status
          ? (updateDealDto.status as DealStatus)
          : undefined,
      };

      const deal = await this.prisma.deal.update({
        where: { id },
        data: updateData,
        include: {
          pipeline: true,
          stage: true,
          owner: true,
        },
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to update deal',
        error instanceof Error ? error.stack : undefined,
        {
          dealId: id,
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const actorEmail = await this.getUserEmail(userId);

      const existingDeal = await this.prisma.deal.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existingDeal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      await this.prisma.deal.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      await this.auditLogService.logEvent({
        action: AuditAction.DEAL_DELETED,
        entityId: existingDeal.id,
        entityType: AuditEntityType.DEAL,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          before: existingDeal,
        },
        severity: AuditSeverity.MEDIUM,
      });

      this.logger.log('Deal soft deleted', {
        dealId: existingDeal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_deleted',
      });

      return { message: 'Deal deleted successfully' };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to delete deal',
        error instanceof Error ? error.stack : undefined,
        {
          dealId: id,
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  async moveStage(
    id: string,
    moveData: MoveDealStageDto,
    userId: string,
  ): Promise<DealWithRelations> {
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
          owner: true,
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

      let newStatus: DealStatus = deal.status;
      if (newStage.probability === 100) {
        newStatus = 'won';
      } else if (newStage.probability === 0) {
        newStatus = 'lost';
      } else if (deal.status === 'lost') {
        newStatus = 'open';
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
          owner: true,
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

  async getStageHistory(dealId: string): Promise<any[]> {
    const organizationId = this.tenantContext.getTenantId();
    const deal = await this.prisma.deal.findFirst({
      where: {
        id: dealId,
        organizationId,
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }

    return this.prisma.dealStageHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDealStats(pipelineId?: string): Promise<{
    totalDeals: number;
    totalValue: number;
    averageValue: number;
    wonDeals: number;
    wonValue: number;
    lostDeals: number;
    lostValue: number;
    openDeals: number;
    openValue: number;
  }> {
    const organizationId = this.tenantContext.getTenantId();

    const where: Prisma.DealWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
      },
    });

    // Calculate stats with proper number conversion for Decimal
    const totalValue = deals.reduce(
      (sum, deal) => sum + Number(deal.amount),
      0,
    );
    const wonDeals = deals.filter((deal) => deal.status === 'won');
    const lostDeals = deals.filter((deal) => deal.status === 'lost');
    const openDeals = deals.filter((deal) => deal.status === 'open');

    return {
      totalDeals: deals.length,
      totalValue,
      averageValue: deals.length > 0 ? totalValue / deals.length : 0,
      wonDeals: wonDeals.length,
      wonValue: wonDeals.reduce((sum, deal) => sum + Number(deal.amount), 0),
      lostDeals: lostDeals.length,
      lostValue: lostDeals.reduce((sum, deal) => sum + Number(deal.amount), 0),
      openDeals: openDeals.length,
      openValue: openDeals.reduce((sum, deal) => sum + Number(deal.amount), 0),
    };
  }

  async getPipelinePerformance(pipelineId?: string): Promise<StageStats[]> {
    const organizationId = this.tenantContext.getTenantId();

    const where: Prisma.DealWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        pipeline: true,
      },
    });

    // Group by stage with proper typing
    const stageStatsMap = new Map<string, StageStats>();

    for (const deal of deals) {
      const stageName = deal.stage.name;
      const currentStats = stageStatsMap.get(stageName);

      if (!currentStats) {
        stageStatsMap.set(stageName, {
          stageId: deal.stageId,
          stageName,
          dealCount: 1,
          totalValue: Number(deal.amount),
          averageProbability: deal.probability,
        });
      } else {
        const updatedStats: StageStats = {
          ...currentStats,
          dealCount: currentStats.dealCount + 1,
          totalValue: currentStats.totalValue + Number(deal.amount),
          averageProbability:
            (currentStats.averageProbability + deal.probability) /
            (currentStats.dealCount + 1),
        };
        stageStatsMap.set(stageName, updatedStats);
      }
    }

    return Array.from(stageStatsMap.values());
  }

  /**
   * Bulk create deals
   * @param data Array of deals to create with user context
   * @returns Array of created deals
   */
  async bulkCreate(
    data: Array<{ userId: string } & CreateDealDto>,
  ): Promise<DealWithRelations[]> {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const results: DealWithRelations[] = [];
      const errors: BulkCreateError[] = [];

      // Process each deal creation in sequence to maintain data integrity
      for (let i = 0; i < data.length; i++) {
        try {
          const dealData = data[i];
          const result = await this.create(dealData);
          results.push(result);
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          const errorEntry: BulkCreateError = {
            index: i,
            message: errorMessage,
            data: data[i],
          };
          errors.push(errorEntry);

          this.logger.error(`Bulk create failed for deal at index ${i}`, {
            organizationId,
            tenantId: this.tenantContext.getTenantId(),
            error: errorMessage,
            dealData: data[i],
          });
        }
      }

      // Log summary of bulk operation
      this.logger.log('Bulk create completed', {
        organizationId,
        tenantId: this.tenantContext.getTenantId(),
        totalAttempted: data.length,
        successful: results.length,
        failed: errors.length,
        event: 'bulk_deal_created',
      });

      // If there were errors, throw with details
      if (errors.length > 0) {
        throw new BadRequestException({
          message: `Bulk create completed with ${errors.length} failures`,
          successful: results,
          errors: errors.map((e) => ({
            index: e.index,
            message: e.message,
            data: e.data,
          })),
        });
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to perform bulk create',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          batchSize: data.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Bulk update deals
   * @param updates Array of updates with deal IDs and update data
   * @returns Array of updated deals
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: UpdateDealDto; userId: string }>,
  ): Promise<DealWithRelations[]> {
    const organizationId = this.tenantContext.getTenantId();

    try {
      const results: DealWithRelations[] = [];
      const errors: BulkUpdateError[] = [];

      // Process each update in sequence
      for (const update of updates) {
        try {
          const result = await this.update(
            update.id,
            update.data,
            update.userId,
          );
          results.push(result);
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          const errorEntry: BulkUpdateError = {
            id: update.id,
            message: errorMessage,
          };
          errors.push(errorEntry);

          this.logger.error(`Bulk update failed for deal ${update.id}`, {
            organizationId,
            tenantId: this.tenantContext.getTenantId(),
            error: errorMessage,
            dealId: update.id,
          });
        }
      }

      // Log summary
      this.logger.log('Bulk update completed', {
        organizationId,
        tenantId: this.tenantContext.getTenantId(),
        totalAttempted: updates.length,
        successful: results.length,
        failed: errors.length,
        event: 'bulk_deal_updated',
      });

      if (errors.length > 0) {
        throw new BadRequestException({
          message: `Bulk update completed with ${errors.length} failures`,
          successful: results,
          errors,
        });
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to perform bulk update',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          batchSize: updates.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Bulk delete deals (soft delete)
   * @param ids Array of deal IDs to delete
   * @param userId User performing the deletion
   * @returns Object with deletion results
   */
  async bulkDelete(ids: string[], userId: string): Promise<BulkDeleteResult> {
    const organizationId = this.tenantContext.getTenantId();

    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    try {
      for (const id of ids) {
        try {
          await this.remove(id, userId);
          successful.push(id);
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          failed.push({
            id,
            reason: errorMessage,
          });

          this.logger.error(`Bulk delete failed for deal ${id}`, {
            organizationId,
            tenantId: this.tenantContext.getTenantId(),
            error: errorMessage,
            dealId: id,
          });
        }
      }

      // Log summary
      this.logger.log('Bulk delete completed', {
        organizationId,
        tenantId: this.tenantContext.getTenantId(),
        totalAttempted: ids.length,
        successful: successful.length,
        failed: failed.length,
        event: 'bulk_deal_deleted',
      });

      return { successful, failed };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to perform bulk delete',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          batchSize: ids.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Bulk restore soft-deleted deals
   * @param ids Array of deal IDs to restore
   * @param userId User performing the restore
   * @returns Array of restored deals
   */
  async bulkRestore(
    ids: string[],
    userId: string,
  ): Promise<DealWithRelations[]> {
    const organizationId = this.tenantContext.getTenantId();
    const restoredDeals: DealWithRelations[] = [];

    try {
      for (const id of ids) {
        // Check if deal exists and is deleted
        const deal = await this.prisma.deal.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: { not: null },
          },
        });

        if (!deal) {
          throw new NotFoundException(`Deal ${id} not found or not deleted`);
        }

        // Restore the deal
        const restoredDeal = await this.prisma.deal.update({
          where: { id },
          data: {
            deletedAt: null,
            deletedBy: null,
          },
          include: {
            pipeline: true,
            stage: true,
            owner: true,
          },
        });

        restoredDeals.push(restoredDeal);

        // Log restoration
        this.logger.log('Deal restored', {
          dealId: deal.id,
          organizationId,
          userId,
          tenantId: this.tenantContext.getTenantId(),
          event: 'deal_restored',
        });
      }

      return restoredDeals;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to perform bulk restore',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          batchSize: ids.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Bulk update deal stages (move multiple deals to a new stage)
   * @param updates Array of deal IDs and target stage IDs
   * @param userId User performing the update
   * @returns Array of updated deals
   */
  async bulkMoveStage(
    updates: Array<{ dealId: string; stageId: string; notes?: string }>,
    userId: string,
  ): Promise<DealWithRelations[]> {
    const organizationId = this.tenantContext.getTenantId();
    const results: DealWithRelations[] = [];
    const errors: BulkMoveStageError[] = [];

    try {
      for (const update of updates) {
        try {
          const result = await this.moveStage(
            update.dealId,
            { stageId: update.stageId, notes: update.notes },
            userId,
          );
          results.push(result);
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          const errorEntry: BulkMoveStageError = {
            dealId: update.dealId,
            message: errorMessage,
          };
          errors.push(errorEntry);

          this.logger.error(
            `Bulk stage move failed for deal ${update.dealId}`,
            {
              organizationId,
              tenantId: this.tenantContext.getTenantId(),
              error: errorMessage,
              dealId: update.dealId,
              targetStageId: update.stageId,
            },
          );
        }
      }

      // Log summary
      this.logger.log('Bulk stage move completed', {
        organizationId,
        tenantId: this.tenantContext.getTenantId(),
        totalAttempted: updates.length,
        successful: results.length,
        failed: errors.length,
        event: 'bulk_deal_stage_moved',
      });

      if (errors.length > 0) {
        throw new BadRequestException({
          message: `Bulk stage move completed with ${errors.length} failures`,
          successful: results,
          errors,
        });
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Failed to perform bulk stage move',
        error instanceof Error ? error.stack : undefined,
        {
          organizationId,
          tenantId: this.tenantContext.getTenantId(),
          batchSize: updates.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
