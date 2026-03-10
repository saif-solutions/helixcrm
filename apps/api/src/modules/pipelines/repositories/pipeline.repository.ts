// apps/api/src/modules/pipelines/repositories/pipeline.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Pipeline, PipelineStage, Prisma } from '@prisma/client';

@Injectable()
export class PipelineRepository extends TenantAwareRepository {
  private readonly logger = new Logger(PipelineRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find pipeline by ID
   */
  async findById(id: string, includeDeleted = false): Promise<Pipeline | null> {
    try {
      const where: any = this.withTenantFilter({ id });

      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const pipeline = await this.prisma.pipeline.findFirst({
        where,
        include: {
          stages: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { deals: true },
          },
        },
      });

      return pipeline;
    } catch (error) {
      this.logger.error(
        `Failed to find pipeline ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find first pipeline matching criteria
   */
  async findFirst(where: any): Promise<Pipeline | null> {
    try {
      const tenantWhere = this.withTenantFilter(where);

      return await this.prisma.pipeline.findFirst({
        where: tenantWhere,
      });
    } catch (error) {
      this.logger.error(
        `Failed to find pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find many pipelines with filters
   */
  async findMany(params: {
    where?: any;
    skip?: number;
    take?: number;
    includeStages?: boolean;
    includeDealCount?: boolean;
  }): Promise<any[]> {
    try {
      const {
        where,
        skip,
        take,
        includeStages = false,
        includeDealCount = false,
      } = params;

      const tenantWhere = this.withTenantFilter({
        ...where,
        deletedAt: null,
      });

      const include: any = {};

      if (includeStages) {
        include.stages = {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        };
      }

      if (includeDealCount) {
        include._count = {
          select: { deals: true },
        };
      }

      const pipelines = await this.prisma.pipeline.findMany({
        where: tenantWhere,
        skip,
        take,
        include,
        orderBy: { createdAt: 'desc' },
      });

      return pipelines;
    } catch (error) {
      this.logger.error(
        `Failed to find pipelines: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Count pipelines matching criteria
   */
  async count(where?: any): Promise<number> {
    try {
      const tenantWhere = this.withTenantFilter({
        ...where,
        deletedAt: null,
      });

      return await this.prisma.pipeline.count({
        where: tenantWhere,
      });
    } catch (error) {
      this.logger.error(
        `Failed to count pipelines: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new pipeline
   */
  async create(data: {
    name: string;
    description?: string;
    isDefault?: boolean;
  }): Promise<Pipeline> {
    try {
      const tenantId = this.tenantId;

      const pipeline = await this.prisma.pipeline.create({
        data: {
          ...data,
          organization: {
            connect: { id: tenantId },
          },
        },
      });

      this.logger.log(`Pipeline created: ${pipeline.id}`);
      return pipeline;
    } catch (error) {
      this.logger.error(
        `Failed to create pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update a pipeline
   */
  async update(id: string, data: any): Promise<Pipeline> {
    try {
      const tenantWhere = {
        id,
        organizationId: this.tenantId,
      };

      const pipeline = await this.prisma.pipeline.update({
        where: tenantWhere,
        data,
      });

      this.logger.log(`Pipeline updated: ${id}`);
      return pipeline;
    } catch (error) {
      this.logger.error(
        `Failed to update pipeline ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update many pipelines
   */
  async updateMany(where: any, data: any): Promise<void> {
    try {
      const tenantWhere = this.withTenantFilter(where);

      await this.prisma.pipeline.updateMany({
        where: tenantWhere,
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update pipelines: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a pipeline (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const tenantWhere = {
        id,
        organizationId: this.tenantId,
      };

      await this.prisma.pipeline.update({
        where: tenantWhere,
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Pipeline deleted: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete pipeline ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get default pipeline
   */
  async getDefaultPipeline(): Promise<Pipeline | null> {
    try {
      const tenantWhere = this.withTenantFilter({
        isDefault: true,
        deletedAt: null,
      });

      return await this.prisma.pipeline.findFirst({
        where: tenantWhere,
        include: {
          stages: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { deals: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get default pipeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== STAGE METHODS ====================

  /**
   * Find stage by ID
   */
  async findStageById(
    id: string,
    includePipeline = false,
  ): Promise<PipelineStage | null> {
    try {
      const include: any = {};
      if (includePipeline) {
        include.pipeline = true;
      }

      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id },
        include,
      });

      return stage;
    } catch (error) {
      this.logger.error(
        `Failed to find stage ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find stage by order in pipeline
   */
  async findStageByOrder(
    pipelineId: string,
    order: number,
  ): Promise<PipelineStage | null> {
    try {
      return await this.prisma.pipelineStage.findFirst({
        where: {
          pipelineId,
          order,
          deletedAt: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find stage by order: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find stages by pipeline
   */
  async findStagesByPipeline(pipelineId: string): Promise<PipelineStage[]> {
    try {
      return await this.prisma.pipelineStage.findMany({
        where: {
          pipelineId,
          deletedAt: null,
        },
        orderBy: { order: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find stages for pipeline ${pipelineId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new stage
   */
  async createStage(data: {
    name: string;
    order: number;
    probability?: number;
    pipelineId: string;
  }): Promise<PipelineStage> {
    try {
      const stage = await this.prisma.pipelineStage.create({
        data,
      });

      this.logger.log(`Stage created: ${stage.id}`);
      return stage;
    } catch (error) {
      this.logger.error(
        `Failed to create stage: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update a stage
   */
  async updateStage(id: string, data: any): Promise<PipelineStage> {
    try {
      const stage = await this.prisma.pipelineStage.update({
        where: { id },
        data,
      });

      this.logger.log(`Stage updated: ${id}`);
      return stage;
    } catch (error) {
      this.logger.error(
        `Failed to update stage ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a stage (soft delete)
   */
  async deleteStage(id: string): Promise<void> {
    try {
      await this.prisma.pipelineStage.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Stage deleted: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete stage ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
