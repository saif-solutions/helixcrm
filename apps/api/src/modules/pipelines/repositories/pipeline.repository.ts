import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Pipeline, PipelineStage, Prisma } from '@prisma/client';

@Injectable()
export class PipelineRepository extends TenantAwareRepository {
  // Constructor will be handled by base class

  // ==================== PIPELINE METHODS ====================

  async create(
    data: Omit<Prisma.PipelineUncheckedCreateInput, 'organizationId'>,
  ) {
    return this.prisma.pipeline.create({
      data: {
        ...data,
        organizationId: this.tenantId,
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findMany(options: {
    skip?: number;
    take?: number;
    where?: Prisma.PipelineWhereInput;
    includeStages?: boolean;
    includeDealCount?: boolean;
  }) {
    const {
      skip,
      take,
      where,
      includeStages = true,
      includeDealCount = false,
    } = options;

    const include: any = {};
    if (includeStages) {
      include.stages = { orderBy: { order: 'asc' } };
    }
    if (includeDealCount) {
      include._count = { select: { deals: true } };
    }

    return this.prisma.pipeline.findMany({
      where: {
        ...where,
        organizationId: this.tenantId,
      },
      skip,
      take,
      include,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async count(where?: Prisma.PipelineWhereInput) {
    return this.prisma.pipeline.count({
      where: {
        ...where,
        organizationId: this.tenantId,
      },
    });
  }

  async findById(id: string, includeStages: boolean = true) {
    const include: any = {};
    if (includeStages) {
      include.stages = { orderBy: { order: 'asc' } };
    }
    include._count = { select: { deals: true } };

    return this.prisma.pipeline.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
      include,
    });
  }

  async update(id: string, data: Prisma.PipelineUpdateInput) {
    return this.prisma.pipeline.update({
      where: { id },
      data,
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateMany(
    where: Prisma.PipelineWhereInput,
    data: Prisma.PipelineUpdateInput,
  ) {
    return this.prisma.pipeline.updateMany({
      where: {
        ...where,
        organizationId: this.tenantId,
      },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.pipeline.delete({
      where: { id },
    });
  }

  async findFirst(where: Prisma.PipelineWhereInput) {
    return this.prisma.pipeline.findFirst({
      where: {
        ...where,
        organizationId: this.tenantId,
      },
    });
  }

  async getDefaultPipeline() {
    return this.prisma.pipeline.findFirst({
      where: {
        organizationId: this.tenantId,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  // ==================== PIPELINE STAGE METHODS ====================

  async createStage(data: Prisma.PipelineStageUncheckedCreateInput) {
    return this.prisma.pipelineStage.create({
      data,
    });
  }

  async findStageById(id: string, includePipeline: boolean = true) {
    const include: any = {};
    if (includePipeline) {
      include.pipeline = true;
    }
    include._count = { select: { deals: true } };

    return this.prisma.pipelineStage.findFirst({
      where: { id },
      include,
    });
  }

  async findStagesByPipeline(pipelineId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { order: 'asc' },
    });
  }

  async findStageByOrder(pipelineId: string, order: number) {
    return this.prisma.pipelineStage.findFirst({
      where: {
        pipelineId,
        order,
      },
    });
  }

  async updateStage(id: string, data: Prisma.PipelineStageUpdateInput) {
    return this.prisma.pipelineStage.update({
      where: { id },
      data,
    });
  }

  async deleteStage(id: string) {
    return this.prisma.pipelineStage.delete({
      where: { id },
    });
  }

  async deleteManyStages(where: Prisma.PipelineStageWhereInput) {
    return this.prisma.pipelineStage.deleteMany({ where });
  }

  async countDealsInStage(stageId: string) {
    return this.prisma.deal.count({
      where: {
        stageId,
        organizationId: this.tenantId,
      },
    });
  }

  async transaction<T>(fn: (prisma: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
