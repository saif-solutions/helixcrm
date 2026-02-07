// File: src/modules/deals/deals.service.ts - FINAL VERSION
import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  ForbiddenException 
} from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { 
  AuditLogService, 
  AuditAction, 
  AuditSeverity, 
  AuditEntityType 
} from "../../shared/audit-log/audit-log.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { MoveDealStageDto } from "./dto/move-deal-stage.dto";
import { DealQueryDto } from "./dto/deal-query.dto";
import { CreateDealSimpleDto } from "./dto/create-deal-simple.dto";
import { DealRepository } from "./repositories/deal.repository";
import { PermissionContextService } from "../../shared/permissions/context/permission-context.service";
import { TenantContextService } from "../../shared/tenant/context/tenant-context.service";
import { DealStatus } from "@prisma/client";

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
        select: { email: true }
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(`Failed to fetch email for user ${userId}: ${error.message}`);
      return `user-${userId}@error.example.com`;
    }
  }

  private async getOrCreateDefaultPipeline(userId: string) {
    const organizationId = this.tenantContext.getTenantId();
    
    // Use transaction for atomic operation to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      // Try to find existing default pipeline
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

      // If no default pipeline exists, create one with default stages
      if (!pipeline) {
        pipeline = await tx.pipeline.create({
          data: {
            name: 'Default Sales Pipeline',
            description: 'Default pipeline created automatically for Phase 3.4 compatibility',
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

        // Log the creation but don't audit log system-created entities
        this.logger.log("Default pipeline created for Phase 3.4 compatibility", {
          pipelineId: pipeline.id,
          organizationId,
          userId,
          event: 'default_pipeline_created',
        });
      }

      return pipeline;
    });
  }

  // ==================== CRUD METHODS USING REPOSITORY ====================

  async createSimple(data: { userId: string } & CreateDealSimpleDto) {
    const { userId, ...dealData } = data;
    const organizationId = this.tenantContext.getTenantId();

    try {
      // ENTERPRISE: Permission check
      if (!this.permissionContext.hasPermission('deals.write')) {
        throw new ForbiddenException('Insufficient permissions to create deals');
      }

      // Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

      // Get or create default pipeline with transaction safety
      const defaultPipeline = await this.getOrCreateDefaultPipeline(userId);

      // Validate stage belongs to default pipeline AND organization
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: dealData.stageId,
          pipelineId: defaultPipeline.id,
          pipeline: {
            organizationId, // Extra security: ensure stage's pipeline belongs to org
          },
        },
      });

      if (!stage) {
        throw new BadRequestException(`Stage ${dealData.stageId} not found in organization's default pipeline`);
      }

      // Set owner to current user if not provided
      const ownerUserId = dealData.ownerUserId || userId;

      // Check for duplicate deal title in same pipeline (case-insensitive)
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
        throw new ConflictException(`Deal with title "${dealData.title}" already exists in this pipeline`);
      }

      // Create the deal with Phase 3.4 field mapping USING REPOSITORY
      const deal = await this.dealRepository.create({
        name: dealData.title, // Phase 3.4: title → name
        amount: dealData.value, // Phase 3.4: value → amount
        pipeline: { connect: { id: defaultPipeline.id } },
        stage: { connect: { id: dealData.stageId } },
        owner: { connect: { id: ownerUserId } },
        contact: dealData.contactId ? { connect: { id: dealData.contactId } } : undefined,
        account: dealData.accountId ? { connect: { id: dealData.accountId } } : undefined,
        currency: dealData.currency || 'USD',
        probability: stage.probability,
        status: 'open' as DealStatus,
      });

      // Audit logging
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
          source: 'phase_3_4_compatibility_layer',
          after: deal,
        },
      });

      this.logger.log("Deal created via Phase 3.4 simple API", {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_created_simple',
      });

      // Return with Phase 3.4 field names for backward compatibility
      const response = {
        ...deal,
        title: deal.name,
        value: Number(deal.amount), // Convert Decimal to number
      };
      
      // Remove original name/amount to avoid confusion
      delete (response as any).name;
      delete (response as any).amount;

      return response;
    } catch (error) {
      this.logger.error("Failed to create deal via Phase 3.4 simple API", error.stack, {
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        dealTitle: dealData.title,
        stageId: dealData.stageId,
      });
      throw error;
    }
  }

  async create(data: { userId: string } & CreateDealDto) {
    const { userId, ...dealData } = data;
    const organizationId = this.tenantContext.getTenantId();

    try {
      // ENTERPRISE: Permission check
      if (!this.permissionContext.hasPermission('deals.write')) {
        throw new ForbiddenException('Insufficient permissions to create deals');
      }

      // Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

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

      // Create deal USING REPOSITORY
      const deal = await this.dealRepository.create({
        ...dealData,
        pipeline: { connect: { id: dealData.pipelineId } },
        stage: { connect: { id: dealData.stageId } },
        owner: { connect: { id: ownerUserId } },
        contact: dealData.contactId ? { connect: { id: dealData.contactId } } : undefined,
        account: dealData.accountId ? { connect: { id: dealData.accountId } } : undefined,
        probability: dealData.probability || stage.probability,
        status: (dealData.status as DealStatus) || 'open',
        currency: dealData.currency || 'USD',
      });

      // Audit logging
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

      this.logger.log("Deal created successfully", {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_created',
      });

      return deal;
    } catch (error) {
      this.logger.error("Failed to create deal", error.stack, {
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        dealName: dealData.name,
      });
      throw error;
    }
  }

  async findAll(query: DealQueryDto) {
    const organizationId = this.tenantContext.getTenantId();
    
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.read')) {
      throw new ForbiddenException('Insufficient permissions to read deals');
    }

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

    // Build where clause
    const where: any = {};

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
      // USING REPOSITORY for both find and count
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
      this.logger.error("Failed to fetch deals", error.stack, {
        organizationId,
        tenantId: this.tenantContext.getTenantId(),
        query,
      });
      throw error;
    }
  }

  async findOne(id: string, includeDeleted = false) {
    const organizationId = this.tenantContext.getTenantId();
    
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.read')) {
      throw new ForbiddenException('Insufficient permissions to read deals');
    }

    // USING REPOSITORY
    const deal = await this.dealRepository.findById(id, includeDeleted);
    
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    // Additional tenant check (belt-and-suspenders approach)
    if (deal.organizationId !== organizationId) {
      throw new ForbiddenException(`Access to deal ${id} denied`);
    }

    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto, userId: string) {
    const organizationId = this.tenantContext.getTenantId();
    
    try {
      // ENTERPRISE: Permission check
      if (!this.permissionContext.hasPermission('deals.write')) {
        throw new ForbiddenException('Insufficient permissions to update deals');
      }

      // Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

      // First verify deal belongs to organization USING REPOSITORY
      const existingDeal = await this.dealRepository.findById(id);
      if (!existingDeal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      if (existingDeal.organizationId !== organizationId) {
        throw new ForbiddenException(`Access to deal ${id} denied`);
      }

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
        updateData.status = updateDealDto.status as DealStatus;
      }

      // Update USING REPOSITORY
      const deal = await this.dealRepository.update({
        id,
        data: updateData,
      });

      // Audit logging
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

      this.logger.log("Deal updated successfully", {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_updated',
      });

      return deal;
    } catch (error) {
      this.logger.error("Failed to update deal", error.stack, {
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
      // ENTERPRISE: Permission check
      if (!this.permissionContext.hasPermission('deals.delete')) {
        throw new ForbiddenException('Insufficient permissions to delete deals');
      }

      // Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

      // First verify deal belongs to organization USING REPOSITORY
      const deal = await this.dealRepository.findById(id);
      if (!deal) {
        throw new NotFoundException(`Deal ${id} not found`);
      }

      if (deal.organizationId !== organizationId) {
        throw new ForbiddenException(`Access to deal ${id} denied`);
      }

      // Soft delete USING REPOSITORY
      const deletedDeal = await this.dealRepository.softDelete(id);

      // Audit logging
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

      this.logger.log("Deal soft deleted", {
        dealId: deal.id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
        event: 'deal_deleted',
      });

      return { message: 'Deal deleted successfully' };
    } catch (error) {
      this.logger.error("Failed to delete deal", error.stack, {
        dealId: id,
        organizationId,
        userId,
        tenantId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

  // ==================== DEAL STAGE TRANSITION METHODS ====================

  async moveStage(id: string, moveData: MoveDealStageDto, userId: string) {
    const organizationId = this.tenantContext.getTenantId();
    
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.write')) {
      throw new ForbiddenException('Insufficient permissions to update deals');
    }

    // Use transaction for atomic update
    return this.prisma.$transaction(async (tx) => {
      // Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

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
        newStatus = 'won' as DealStatus;
      } else if (newStage.probability === 0) {
        newStatus = 'lost' as DealStatus;
      } else if (deal.status === 'lost') {
        newStatus = 'open' as DealStatus;
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

      this.logger.log("Deal stage moved", {
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
    
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.read')) {
      throw new ForbiddenException('Insufficient permissions to read deals');
    }

    // Verify deal belongs to organization
    const deal = await this.dealRepository.findById(dealId);
    if (!deal || deal.organizationId !== organizationId) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }

    // USING REPOSITORY
    const history = await this.dealRepository.getStageHistory(dealId);
    return history;
  }

  // ==================== ANALYTICS METHODS ====================

  async getDealStats(pipelineId?: string) {
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.read')) {
      throw new ForbiddenException('Insufficient permissions to read deals');
    }

    // USING REPOSITORY
    return this.dealRepository.getDealStats(pipelineId);
  }

  async getPipelinePerformance(pipelineId?: string) {
    // ENTERPRISE: Permission check
    if (!this.permissionContext.hasPermission('deals.read')) {
      throw new ForbiddenException('Insufficient permissions to read deals');
    }

    // USING REPOSITORY
    return this.dealRepository.getPipelinePerformance(pipelineId);
  }
}