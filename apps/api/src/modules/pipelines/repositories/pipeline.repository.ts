// apps/api/src/modules/pipelines/repositories/pipeline.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Pipeline, PipelineStage, Prisma } from '@prisma/client';

// Define types for better type safety
interface PipelineWhereInput extends Prisma.PipelineWhereInput {
  organizationId?: string;
  deletedAt?: Date | null;
}

interface FindManyParams {
  where?: Prisma.PipelineWhereInput;
  skip?: number;
  take?: number;
  includeStages?: boolean;
  includeDealCount?: boolean;
}

interface CreatePipelineData {
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface CreateStageData {
  name: string;
  order: number;
  probability?: number;
  pipelineId: string;
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

@Injectable()
export class PipelineRepository extends TenantAwareRepository {
  private readonly logger = new Logger(PipelineRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, includeDeleted = false): Promise<Pipeline | null> {
    try {
      const where: PipelineWhereInput = this.withTenantFilter({ id });

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find pipeline ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findFirst(where: Prisma.PipelineWhereInput): Promise<Pipeline | null> {
    try {
      const tenantWhere: PipelineWhereInput = this.withTenantFilter(where);

      return await this.prisma.pipeline.findFirst({
        where: tenantWhere,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find pipeline: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findMany(params: FindManyParams): Promise<Pipeline[]> {
    try {
      const {
        where = {},
        skip,
        take,
        includeStages = false,
        includeDealCount = false,
      } = params;

      const tenantWhere: PipelineWhereInput = this.withTenantFilter({
        ...where,
        deletedAt: null,
      });

      const include: Prisma.PipelineInclude = {};

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find pipelines: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async count(where?: Prisma.PipelineWhereInput): Promise<number> {
    try {
      const tenantWhere: PipelineWhereInput = this.withTenantFilter({
        ...where,
        deletedAt: null,
      });

      return await this.prisma.pipeline.count({
        where: tenantWhere,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to count pipelines: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async create(data: CreatePipelineData): Promise<Pipeline> {
    try {
      const tenantId = this.tenantId;

      const pipeline = await this.prisma.pipeline.create({
        data: {
          name: data.name,
          description: data.description,
          isDefault: data.isDefault,
          organization: {
            connect: { id: tenantId },
          },
        },
      });

      this.logger.log(`Pipeline created: ${pipeline.id}`);
      return pipeline;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to create pipeline: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(
    id: string,
    data: Prisma.PipelineUpdateInput,
  ): Promise<Pipeline> {
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update pipeline ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateMany(
    where: Prisma.PipelineWhereInput,
    data: Prisma.PipelineUpdateInput,
  ): Promise<void> {
    try {
      const tenantWhere: PipelineWhereInput = this.withTenantFilter(where);

      await this.prisma.pipeline.updateMany({
        where: tenantWhere,
        data,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update pipelines: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to delete pipeline ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getDefaultPipeline(): Promise<Pipeline | null> {
    try {
      const tenantWhere: PipelineWhereInput = this.withTenantFilter({
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get default pipeline: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ==================== STAGE METHODS ====================

  async findStageById(
    id: string,
    includePipeline = false,
  ): Promise<PipelineStage | null> {
    try {
      const include: Prisma.PipelineStageInclude = {};
      if (includePipeline) {
        include.pipeline = true;
      }

      const stage = await this.prisma.pipelineStage.findFirst({
        where: { id },
        include,
      });

      return stage;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find stage ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find stage by order: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findStagesByPipeline(pipelineId: string): Promise<PipelineStage[]> {
    try {
      return await this.prisma.pipelineStage.findMany({
        where: {
          pipelineId,
          deletedAt: null,
        },
        orderBy: { order: 'asc' },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find stages for pipeline ${pipelineId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createStage(data: CreateStageData): Promise<PipelineStage> {
    try {
      const stage = await this.prisma.pipelineStage.create({
        data,
      });

      this.logger.log(`Stage created: ${stage.id}`);
      return stage;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to create stage: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateStage(
    id: string,
    data: Prisma.PipelineStageUpdateInput,
  ): Promise<PipelineStage> {
    try {
      const stage = await this.prisma.pipelineStage.update({
        where: { id },
        data,
      });

      this.logger.log(`Stage updated: ${id}`);
      return stage;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update stage ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteStage(id: string): Promise<void> {
    try {
      await this.prisma.pipelineStage.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Stage deleted: ${id}`);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to delete stage ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async transaction<T>(fn: (prisma: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
