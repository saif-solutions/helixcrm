import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppLogger } from '../../shared/logging/logger.service';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { PipelineRepository } from './repositories/pipeline.repository';
import type { CreatePipelineDto } from './dto/create-pipeline.dto';
import type { UpdatePipelineDto } from './dto/update-pipeline.dto';
import type { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import type { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';

// ==================== TYPE DEFINITIONS ====================

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
}

interface PipelineWithStages {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  stages?: Array<{
    id: string;
    name: string;
    description: string | null;
    order: number;
    probability: number;
  }>;
  _count?: {
    deals: number;
  };
}

interface StageWithPipeline {
  id: string;
  name: string;
  description: string | null;
  order: number;
  probability: number;
  pipelineId: string;
  pipeline: {
    id: string;
    organizationId: string;
    name: string;
  };
  _count?: {
    deals: number;
  };
}

// ==================== SERVICE IMPLEMENTATION ====================

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

  // ==================== HELPER METHODS ====================

  private handleError(error: unknown, context: string): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(`${context}: ${errorMessage}`, errorStack);

    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof ForbiddenException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new BadRequestException(context);
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || 'system@unknown';
    } catch {
      return 'system@unknown';
    }
  }

  private logPerformance(method: string, duration: number, tenantId: string) {
    this.logger.log(`Pipeline.${method} completed in ${duration}ms`, {
      duration,
      tenantId,
      performance: duration > 2000 ? 'slow' : 'normal',
    });
  }

  // ==================== PIPELINE METHODS ====================

  async create(data: CreatePipelineDto) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // Check for existing pipeline with same name
      const existing = await this.pipelineRepository.findFirst({
        name: data.name,
      });

      if (existing) {
        throw new ConflictException(
          `Pipeline with name "${data.name}" already exists`,
        );
      }

      // If setting as default, unset any existing default
      if (data.isDefault) {
        await this.pipelineRepository.updateMany(
          { isDefault: true },
          { isDefault: false },
        );
      }

      // Create pipeline using repository
      const pipeline = await this.pipelineRepository.create({
        name: data.name,
        description: data.description,
        isDefault: data.isDefault || false,
      });

      // Audit log
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
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline created', {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_created',
      });

      return pipeline;
    } catch (error) {
      this.logger.error('Failed to create pipeline', {
        tenantId,
        userId,
        method: 'create',
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to create pipeline');
    } finally {
      this.logPerformance('create', Date.now() - startTime, tenantId);
    }
  }

  async findAll({ page = 1, limit = 20, search, isDefault }: FindAllOptions) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();

    try {
      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100);

      // Build where clause with proper typing
      const where: Prisma.PipelineWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isDefault !== undefined) {
        where.isDefault = isDefault;
      }

      // Get pipelines and total count
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

      return {
        data: pipelines,
        meta: {
          page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error('findAll failed', {
        tenantId,
        method: 'findAll',
        page,
        limit,
        search,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to fetch pipelines');
    } finally {
      this.logPerformance('findAll', Date.now() - startTime, tenantId);
    }
  }

  async findOne(id: string): Promise<PipelineWithStages> {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();

    try {
      const pipeline = await this.pipelineRepository.findById(id, true);

      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      return pipeline as PipelineWithStages;
    } catch (error) {
      this.logger.error(`findOne failed`, {
        tenantId,
        method: 'findOne',
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to fetch pipeline');
    } finally {
      this.logPerformance('findOne', Date.now() - startTime, tenantId);
    }
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const existingPipeline = await this.pipelineRepository.findById(
        id,
        false,
      );
      if (!existingPipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      if (updatePipelineDto.isDefault === true) {
        await this.pipelineRepository.updateMany(
          { isDefault: true },
          { isDefault: false },
        );
      }

      const pipeline = await this.pipelineRepository.update(
        id,
        updatePipelineDto,
      );

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
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline updated', {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_updated',
      });

      return pipeline;
    } catch (error) {
      this.logger.error(`update failed`, {
        tenantId,
        userId,
        method: 'update',
        id,
        data: updatePipelineDto,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to update pipeline');
    } finally {
      this.logPerformance('update', Date.now() - startTime, tenantId);
    }
  }

  async remove(id: string) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const pipeline = await this.pipelineRepository.findById(id, true);
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${id} not found`);
      }

      const pipelineWithCount = pipeline as PipelineWithStages;
      const dealCount = pipelineWithCount._count?.deals || 0;

      if (dealCount > 0) {
        throw new ConflictException(
          `Cannot delete pipeline with ${dealCount} deal(s). Move deals to another pipeline first.`,
        );
      }

      if (pipeline.isDefault) {
        const anotherPipeline = await this.pipelineRepository.findFirst({
          id: { not: id },
        });

        if (anotherPipeline) {
          await this.pipelineRepository.update(anotherPipeline.id, {
            isDefault: true,
          });
        }
      }

      await this.pipelineRepository.delete(id);

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
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline deleted', {
        pipelineId: pipeline.id,
        tenantId,
        event: 'pipeline_deleted',
      });

      return { message: 'Pipeline deleted successfully' };
    } catch (error) {
      this.logger.error(`remove failed`, {
        tenantId,
        userId,
        method: 'remove',
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to delete pipeline');
    } finally {
      this.logPerformance('remove', Date.now() - startTime, tenantId);
    }
  }

  async getDefaultPipeline() {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();

    try {
      const pipeline = await this.pipelineRepository.getDefaultPipeline();

      if (!pipeline) {
        throw new NotFoundException('No default pipeline found');
      }

      return pipeline;
    } catch (error) {
      this.logger.error(`getDefaultPipeline failed`, {
        tenantId,
        method: 'getDefaultPipeline',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to fetch default pipeline');
    } finally {
      this.logPerformance(
        'getDefaultPipeline',
        Date.now() - startTime,
        tenantId,
      );
    }
  }

  // ==================== PIPELINE STAGE METHODS ====================

  async createStage(pipelineId: string, data: CreatePipelineStageDto) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const pipeline = await this.pipelineRepository.findById(
        pipelineId,
        false,
      );
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${pipelineId} not found`);
      }

      const existingStage = await this.pipelineRepository.findStageByOrder(
        pipelineId,
        data.order,
      );
      if (existingStage) {
        throw new ConflictException(
          `Stage with order ${data.order} already exists in this pipeline`,
        );
      }

      const stage = await this.pipelineRepository.createStage({
        ...data,
        pipelineId,
      });

      await this.auditLogService.logEvent({
        action: 'PIPELINE_UPDATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: pipelineId,
        metadata: {
          stageName: stage.name,
          stageId: stage.id,
          pipelineId,
          order: stage.order,
          action: 'stage_created',
        },
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline stage created', {
        stageId: stage.id,
        pipelineId,
        tenantId,
        event: 'pipeline_stage_created',
      });

      return stage;
    } catch (error) {
      this.logger.error(`createStage failed`, {
        tenantId,
        userId,
        method: 'createStage',
        pipelineId,
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to create pipeline stage');
    } finally {
      this.logPerformance('createStage', Date.now() - startTime, tenantId);
    }
  }

  async updateStage(stageId: string, updateDto: UpdatePipelineStageDto) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const stage = await this.pipelineRepository.findStageById(stageId, true);
      if (!stage) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      const stageWithPipeline = stage as StageWithPipeline;
      const pipeline = stageWithPipeline.pipeline;

      if (pipeline.organizationId !== tenantId) {
        throw new ForbiddenException(
          'Stage does not belong to your organization',
        );
      }

      if (updateDto.order !== undefined && updateDto.order !== stage.order) {
        const existingStage = await this.pipelineRepository.findStageByOrder(
          stage.pipelineId,
          updateDto.order,
        );

        if (existingStage && existingStage.id !== stageId) {
          throw new ConflictException(
            `Stage with order ${updateDto.order} already exists in this pipeline`,
          );
        }
      }

      const updatedStage = await this.pipelineRepository.updateStage(
        stageId,
        updateDto,
      );

      await this.auditLogService.logEvent({
        action: 'PIPELINE_UPDATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: stage.pipelineId,
        metadata: {
          stageName: updatedStage.name,
          stageId: updatedStage.id,
          pipelineId: stage.pipelineId,
          order: updatedStage.order,
          action: 'stage_updated',
        },
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline stage updated', {
        stageId: updatedStage.id,
        pipelineId: stage.pipelineId,
        tenantId,
        event: 'pipeline_stage_updated',
      });

      return updatedStage;
    } catch (error) {
      this.logger.error(`updateStage failed`, {
        tenantId,
        userId,
        method: 'updateStage',
        stageId,
        data: updateDto,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to update pipeline stage');
    } finally {
      this.logPerformance('updateStage', Date.now() - startTime, tenantId);
    }
  }

  async removeStage(stageId: string) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const stage = await this.pipelineRepository.findStageById(stageId, true);
      if (!stage) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      const stageWithPipeline = stage as StageWithPipeline;
      const pipeline = stageWithPipeline.pipeline;

      if (pipeline.organizationId !== tenantId) {
        throw new ForbiddenException(
          'Stage does not belong to your organization',
        );
      }

      const dealCount = stageWithPipeline._count?.deals || 0;
      if (dealCount > 0) {
        throw new ConflictException(
          `Cannot delete stage with ${dealCount} deal(s). Move deals to another stage first.`,
        );
      }

      await this.pipelineRepository.deleteStage(stageId);

      const remainingStages =
        await this.pipelineRepository.findStagesByPipeline(stage.pipelineId);

      for (let i = 0; i < remainingStages.length; i++) {
        if (remainingStages[i].order !== i) {
          await this.pipelineRepository.updateStage(remainingStages[i].id, {
            order: i,
          });
        }
      }

      await this.auditLogService.logEvent({
        action: 'PIPELINE_UPDATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: stage.pipelineId,
        metadata: {
          stageName: stage.name,
          stageId: stageId,
          pipelineId: stage.pipelineId,
          reorderedStages: remainingStages.length,
          action: 'stage_deleted',
        },
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline stage deleted', {
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        tenantId,
        event: 'pipeline_stage_deleted',
      });

      return { message: 'Pipeline stage deleted successfully' };
    } catch (error) {
      this.logger.error(`removeStage failed`, {
        tenantId,
        userId,
        method: 'removeStage',
        stageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to delete pipeline stage');
    } finally {
      this.logPerformance('removeStage', Date.now() - startTime, tenantId);
    }
  }

  async reorderStages(pipelineId: string, stageIds: string[]) {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const pipeline = await this.pipelineRepository.findById(
        pipelineId,
        false,
      );
      if (!pipeline) {
        throw new NotFoundException(`Pipeline ${pipelineId} not found`);
      }

      const stages =
        await this.pipelineRepository.findStagesByPipeline(pipelineId);
      const stageMap = new Map(stages.map((stage) => [stage.id, stage]));

      const invalidStages = stageIds.filter((id) => !stageMap.has(id));
      if (invalidStages.length > 0) {
        throw new NotFoundException(
          `One or more stages not found in this pipeline: ${invalidStages.join(', ')}`,
        );
      }
      await this.pipelineRepository.transaction(
        async (tx: Prisma.TransactionClient) => {
          const updates = stageIds.map((id, index) =>
            tx.pipelineStage.update({
              where: { id },
              data: { order: index },
            }),
          );

          await Promise.all(updates);
        },
      );

      await this.auditLogService.logEvent({
        action: 'PIPELINE_UPDATED',
        entityType: 'PIPELINE',
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: pipelineId,
        metadata: {
          pipelineName: pipeline.name,
          stageCount: stageIds.length,
          newOrder: stageIds,
          action: 'stages_reordered',
        },
        severity: 'INFO',
        organizationId: tenantId,
      });

      this.logger.log('Pipeline stages reordered', {
        pipelineId,
        tenantId,
        stageCount: stageIds.length,
        event: 'pipeline_stages_reordered',
      });

      return { message: 'Stages reordered successfully' };
    } catch (error) {
      this.logger.error(`reorderStages failed`, {
        tenantId,
        userId,
        method: 'reorderStages',
        pipelineId,
        stageIds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.handleError(error, 'Failed to reorder stages');
    } finally {
      this.logPerformance('reorderStages', Date.now() - startTime, tenantId);
    }
  }
}
