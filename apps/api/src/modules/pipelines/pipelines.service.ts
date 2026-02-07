import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  ForbiddenException,
  BadRequestException 
} from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { TenantContextService } from "../../shared/tenant/context/tenant-context.service";
import { PermissionContextService } from "../../shared/permissions/context/permission-context.service";
import { AuditLogService } from "../../shared/audit-log/audit-log.service";
import { PipelineRepository } from "./repositories/pipeline.repository";
import type { CreatePipelineDto } from "./dto/create-pipeline.dto";
import type { UpdatePipelineDto } from "./dto/update-pipeline.dto";
import type { CreatePipelineStageDto } from "./dto/create-pipeline-stage.dto";
import type { UpdatePipelineStageDto } from "./dto/update-pipeline-stage.dto";

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
}

@Injectable()
export class PipelinesService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly pipelineRepository: PipelineRepository,
  ) {}

  // ==================== PIPELINE METHODS ====================

  async create(data: CreatePipelineDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.write')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.write required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. CHECK FOR EXISTING PIPELINE WITH SAME NAME
      const existing = await this.pipelineRepository.findFirst({
        name: data.name,
      });

      if (existing) {
        throw new ConflictException(`Pipeline with name "${data.name}" already exists`);
      }

      // 3. IF SETTING AS DEFAULT, UNSET ANY EXISTING DEFAULT
      if (data.isDefault) {
        await this.pipelineRepository.updateMany(
          { isDefault: true },
          { isDefault: false }
        );
      }

      // 4. CREATE PIPELINE USING REPOSITORY
      const pipeline = await this.pipelineRepository.create({
        name: data.name,
        description: data.description,
        isDefault: data.isDefault || false,
      });

      // 5. AUDIT LOG
      await this.auditLogService.logEvent({
        action: 'PIPELINE_CREATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: pipeline.id,
        metadata: {
          pipelineName: pipeline.name,
          isDefault: pipeline.isDefault,
        },
        severity: 'INFO' as any,
        organizationId: tenantId,
      });

      this.logger.log("Pipeline created", {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_created',
      });

      return pipeline;
      
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error("Failed to create pipeline", error.stack, {
        tenantId,
        userId,
        method: 'create',
        data
      });
      
      if (error instanceof ConflictException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to create pipeline');
      
    } finally {
      // 7. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.create completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async findAll({ page = 1, limit = 20, search, sortBy, sortOrder, isDefault }: FindAllOptions) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.read')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.read required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100);

      // Build where clause
      const where: any = {};
      
      // Add search filter if provided
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add isDefault filter if provided
      if (isDefault !== undefined) {
        where.isDefault = isDefault;
      }

      // 2. BUSINESS LOGIC USING REPOSITORY
      const [pipelines, total] = await Promise.all([
        this.pipelineRepository.findMany({
          where,
          skip,
          take,
          includeStages: true,
          includeDealCount: true,
        }),
        this.pipelineRepository.count(where),
      ]);

      const result = {
        data: pipelines,
        meta: {
          page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      };

      return result;
      
    } catch (error: any) {
      // 3. ERROR HANDLING
      this.logger.error("findAll failed", error.stack, {
        tenantId,
        userId,
        method: 'findAll',
        page,
        limit,
        search
      });
      
      throw new BadRequestException('Failed to fetch pipelines');
      
    } finally {
      // 4. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.findAll completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async findOne(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.read')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.read required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC USING REPOSITORY
      const pipeline = await this.pipelineRepository.findById(id, true);
      
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      return pipeline;
      
    } catch (error: any) {
      // 3. ENTERPRISE ERROR HANDLING
      this.logger.error(`findOne failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'findOne',
        id
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to fetch pipeline');
      
    } finally {
      // 4. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.findOne completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.write')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.write required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VERIFY PIPELINE EXISTS AND BELONGS TO TENANT
      const existingPipeline = await this.pipelineRepository.findById(id, false);
      if (!existingPipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      // 3. PRESERVE BUSINESS LOGIC: DEFAULT PIPELINE HANDLING
      if (updatePipelineDto.isDefault === true) {
        await this.pipelineRepository.updateMany(
          { isDefault: true },
          { isDefault: false }
        );
      }

      // 4. UPDATE PIPELINE
      const pipeline = await this.pipelineRepository.update(id, updatePipelineDto);

      // 5. AUDIT LOG
      await this.auditLogService.logEvent({
        action: 'PIPELINE_UPDATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: pipeline.id,
        metadata: {
          pipelineName: pipeline.name,
          isDefault: pipeline.isDefault,
        },
        severity: 'INFO' as any,
        organizationId: tenantId,
      });

      this.logger.log("Pipeline updated", {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_updated',
      });

      return pipeline;
      
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(`update failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'update',
        id,
        data: updatePipelineDto
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to update pipeline');
      
    } finally {
      // 7. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.update completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async remove(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.manage')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.manage required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET PIPELINE WITH DEAL COUNT
      const pipeline = await this.pipelineRepository.findById(id, false);
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      // 3. PRESERVE BUSINESS LOGIC: DEAL COUNT VALIDATION
      // Type assertion to access deal count
      const pipelineWithCount = pipeline as any;
      const dealCount = pipelineWithCount._count?.deals || 0;
      
      if (dealCount > 0) {
        throw new ConflictException(
          `Cannot delete pipeline with ${dealCount} deal(s). Move deals to another pipeline first.`
        );
      }

      // 4. PRESERVE BUSINESS LOGIC: DEFAULT PIPELINE REASSIGNMENT
      if (pipeline.isDefault) {
        const anotherPipeline = await this.pipelineRepository.findFirst({
          id: { not: id }
        });

        if (anotherPipeline) {
          await this.pipelineRepository.update(anotherPipeline.id, { isDefault: true });
        }
      }

      // 5. DELETE PIPELINE
      await this.pipelineRepository.delete(id);

      // 6. AUDIT LOG
      await this.auditLogService.logEvent({
        action: 'PIPELINE_DELETED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: id,
        metadata: {
          pipelineName: pipeline.name,
          wasDefault: pipeline.isDefault,
        },
        severity: 'INFO' as any,
        organizationId: tenantId,
      });

      this.logger.log("Pipeline deleted", {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_deleted',
      });

      return { message: 'Pipeline deleted successfully' };
      
    } catch (error: any) {
      // 7. ERROR HANDLING
      this.logger.error(`remove failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'remove',
        id
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to delete pipeline');
      
    } finally {
      // 8. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.remove completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async getDefaultPipeline() {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.read')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.read required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC USING REPOSITORY
      const pipeline = await this.pipelineRepository.getDefaultPipeline();
      
      if (!pipeline) {
        throw new NotFoundException('No default pipeline found');
      }

      return pipeline;
      
    } catch (error: any) {
      // 3. ERROR HANDLING
      this.logger.error(`getDefaultPipeline failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'getDefaultPipeline'
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to fetch default pipeline');
      
    } finally {
      // 4. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.getDefaultPipeline completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  // ==================== PIPELINE STAGE METHODS ====================

  async createStage(pipelineId: string, data: CreatePipelineStageDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.write')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.write required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VERIFY PIPELINE EXISTS
      const pipeline = await this.pipelineRepository.findById(pipelineId, false);
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${pipelineId} not found`);
      }

      // 3. CHECK FOR EXISTING STAGE WITH SAME ORDER
      const existingStage = await this.pipelineRepository.findStageByOrder(pipelineId, data.order);
      if (existingStage) {
        throw new ConflictException(`Stage with order ${data.order} already exists in this pipeline`);
      }

      // 4. CREATE STAGE
      const stage = await this.pipelineRepository.createStage({
        ...data,
        pipelineId,
      });

      // 5. AUDIT LOG - Use pipeline audit actions since stage-specific ones don't exist
await this.auditLogService.logEvent({
  action: 'PIPELINE_UPDATED', // Revert to original
  entityType: 'PIPELINE', // Revert to original
  actorEmail: await this.getUserEmail(userId),
  actorUserId: userId,
  entityId: pipelineId, // Pipeline ID (not stage ID)
  metadata: {
    stageName: stage.name,
    stageId: stage.id, // Add stage ID to metadata
    pipelineId,
    order: stage.order,
    action: 'stage_created' // Add action type to metadata
  },
  severity: 'INFO' as any,
  organizationId: tenantId,
});

      this.logger.log("Pipeline stage created", {
        stageId: stage.id,
        pipelineId,
        tenantId,
        event: 'pipeline_stage_created',
      });

      return stage;
      
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(`createStage failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'createStage',
        pipelineId,
        data
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to create pipeline stage');
      
    } finally {
      // 7. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.createStage completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async updateStage(stageId: string, updateDto: UpdatePipelineStageDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.write')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.write required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET STAGE WITH PIPELINE INFO
      const stage = await this.pipelineRepository.findStageById(stageId, true);
      if (!stage || !(stage as any).pipeline) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      const stageWithPipeline = stage as any;
      const pipeline = stageWithPipeline.pipeline;

      // 3. CHECK TENANT OWNERSHIP
      if (pipeline.organizationId !== tenantId) {
        throw new ForbiddenException('Stage does not belong to your organization');
      }

      // 4. CHECK FOR ORDER CONFLICT IF ORDER IS CHANGING
      if (updateDto.order !== undefined && updateDto.order !== stage.order) {
        const existingStage = await this.pipelineRepository.findStageByOrder(
          stage.pipelineId,
          updateDto.order
        );
        
        if (existingStage && existingStage.id !== stageId) {
          throw new ConflictException(`Stage with order ${updateDto.order} already exists in this pipeline`);
        }
      }

      // 5. UPDATE STAGE
      const updatedStage = await this.pipelineRepository.updateStage(stageId, updateDto);

      // 6. AUDIT LOG - Use pipeline audit actions
await this.auditLogService.logEvent({
  action: 'PIPELINE_UPDATED', // Revert to original
  entityType: 'PIPELINE', // Revert to original
  actorEmail: await this.getUserEmail(userId),
  actorUserId: userId,
  entityId: stage.pipelineId, // Pipeline ID
  metadata: {
    stageName: updatedStage.name,
    stageId: updatedStage.id,
    pipelineId: stage.pipelineId,
    order: updatedStage.order,
    action: 'stage_updated'
  },
  severity: 'INFO' as any,
  organizationId: tenantId,
});

      this.logger.log("Pipeline stage updated", {
        stageId: updatedStage.id,
        pipelineId: stage.pipelineId,
        tenantId,
        event: 'pipeline_stage_updated',
      });

      return updatedStage;
      
    } catch (error: any) {
      // 7. ERROR HANDLING
      this.logger.error(`updateStage failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'updateStage',
        stageId,
        data: updateDto
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to update pipeline stage');
      
    } finally {
      // 8. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.updateStage completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async removeStage(stageId: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.manage')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.manage required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET STAGE WITH DEAL COUNT
      const stage = await this.pipelineRepository.findStageById(stageId, true);
      if (!stage || !(stage as any).pipeline) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      const stageWithPipeline = stage as any;
      const pipeline = stageWithPipeline.pipeline;

      // 3. CHECK TENANT OWNERSHIP
      if (pipeline.organizationId !== tenantId) {
        throw new ForbiddenException('Stage does not belong to your organization');
      }

      // 4. CHECK FOR ACTIVE DEALS
      const dealCount = stageWithPipeline._count?.deals || 0;
      if (dealCount > 0) {
        throw new ConflictException(
          `Cannot delete stage with ${dealCount} deal(s). Move deals to another stage first.`
        );
      }

      // 5. DELETE STAGE
      await this.pipelineRepository.deleteStage(stageId);

      // 6. PRESERVE BUSINESS LOGIC: REORDER REMAINING STAGES
      const remainingStages = await this.pipelineRepository.findStagesByPipeline(stage.pipelineId);
      
      // Update orders to be sequential
      for (let i = 0; i < remainingStages.length; i++) {
        if (remainingStages[i].order !== i) {
          await this.pipelineRepository.updateStage(remainingStages[i].id, { order: i });
        }
      }

      // 7. AUDIT LOG - Use pipeline audit actions
await this.auditLogService.logEvent({
  action: 'PIPELINE_UPDATED', // Revert to original
  entityType: 'PIPELINE', // Revert to original
  actorEmail: await this.getUserEmail(userId),
  actorUserId: userId,
  entityId: stage.pipelineId, // Pipeline ID
  metadata: {
    stageName: stage.name,
    stageId: stageId,
    pipelineId: stage.pipelineId,
    reorderedStages: remainingStages.length,
    action: 'stage_deleted'
  },
  severity: 'INFO' as any,
  organizationId: tenantId,
});

      this.logger.log("Pipeline stage deleted", {
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        tenantId,
        event: 'pipeline_stage_deleted',
      });

      return { message: 'Pipeline stage deleted successfully' };
      
    } catch (error: any) {
      // 8. ERROR HANDLING
      this.logger.error(`removeStage failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'removeStage',
        stageId
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to delete pipeline stage');
      
    } finally {
      // 9. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.removeStage completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  async reorderStages(pipelineId: string, stageIds: string[]) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('pipelines.manage')) {
      throw new ForbiddenException('Insufficient permissions: pipelines.manage required');
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VERIFY PIPELINE EXISTS AND BELONGS TO TENANT
      const pipeline = await this.pipelineRepository.findById(pipelineId, false);
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${pipelineId} not found`);
      }

      // 3. VERIFY ALL STAGES BELONG TO THIS PIPELINE
      const stages = await this.pipelineRepository.findStagesByPipeline(pipelineId);
      const stageMap = new Map(stages.map(stage => [stage.id, stage]));
      
      const invalidStages = stageIds.filter(id => !stageMap.has(id));
      if (invalidStages.length > 0) {
        throw new NotFoundException(`One or more stages not found in this pipeline: ${invalidStages.join(', ')}`);
      }

      // 4. REORDER STAGES USING TRANSACTION
      await this.pipelineRepository.transaction(async (prisma) => {
        const updates = stageIds.map((id, index) => 
          prisma.pipelineStage.update({
            where: { id },
            data: { order: index },
          })
        );
        
        await Promise.all(updates);
      });

      // 5. AUDIT LOG
await this.auditLogService.logEvent({
  action: 'PIPELINE_UPDATED', // Revert to original (not PIPELINE_STAGE_REORDERED)
  entityType: 'PIPELINE',
  actorEmail: await this.getUserEmail(userId),
  actorUserId: userId,
  entityId: pipelineId,
  metadata: {
    pipelineName: pipeline.name,
    stageCount: stageIds.length,
    newOrder: stageIds,
    action: 'stages_reordered'
  },
  severity: 'INFO' as any,
  organizationId: tenantId,
});

      this.logger.log("Pipeline stages reordered", {
        pipelineId,
        tenantId,
        stageCount: stageIds.length,
        event: 'pipeline_stages_reordered',
      });

      return { message: 'Stages reordered successfully' };
      
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(`reorderStages failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        method: 'reorderStages',
        pipelineId,
        stageIds
      });
      
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to reorder stages');
      
    } finally {
      // 7. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      this.logger.log(`Pipeline.reorderStages completed in ${duration}ms`, {
        duration,
        tenantId,
        performance: duration > 2000 ? 'slow' : 'normal'
      });
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      return user?.email || 'system@unknown';
    } catch (error) {
      this.logger.warn(`Failed to fetch user email for ${userId}: ${error.message}`);
      return 'system@unknown';
    }
  }
}