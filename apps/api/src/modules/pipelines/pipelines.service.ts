import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { CreatePipelineDto } from "./dto/create-pipeline.dto";
import { UpdatePipelineDto } from "./dto/update-pipeline.dto";
import { CreatePipelineStageDto } from "./dto/create-pipeline-stage.dto";
import { UpdatePipelineStageDto } from "./dto/update-pipeline-stage.dto";

interface FindAllOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class PipelinesService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  // ==================== PIPELINE METHODS ====================

  async create(data: { organizationId: string } & CreatePipelineDto) {
    try {
      // Check if pipeline with same name already exists in organization
      const existing = await this.prisma.pipeline.findFirst({
        where: {
          organizationId: data.organizationId,
          name: data.name,
        },
      });

      if (existing) {
        throw new ConflictException(`Pipeline with name "${data.name}" already exists`);
      }

      // If setting as default, unset any existing default
      if (data.isDefault) {
        await this.prisma.pipeline.updateMany({
          where: {
            organizationId: data.organizationId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const pipeline = await this.prisma.pipeline.create({
        data: {
          ...data,
          isDefault: data.isDefault || false,
        },
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log("Pipeline created", {
        pipelineId: pipeline.id,
        organizationId: data.organizationId,
        event: 'pipeline_created',
      });

      return pipeline;
    } catch (error) {
      this.logger.error("Failed to create pipeline", error.stack, {
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  async findAll({ organizationId, page = 1, limit = 20, search }: FindAllOptions) {
    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause with tenant isolation
    const where: any = { 
      organizationId,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [pipelines, total] = await Promise.all([
        this.prisma.pipeline.findMany({
          where,
          skip,
          take,
          include: {
            stages: {
              orderBy: {
                order: 'asc',
              },
            },
            _count: {
              select: {
                deals: true,
              },
            },
          },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        this.prisma.pipeline.count({ where }),
      ]);

      return {
        data: pipelines,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error("Failed to fetch pipelines", error.stack, {
        organizationId,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        stages: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            deals: true,
          },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${id} not found`);
    }

    return pipeline;
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto, organizationId: string) {
    try {
      // First verify pipeline belongs to organization
      await this.findOne(id, organizationId);

      // If setting as default, unset any existing default
      if (updatePipelineDto.isDefault === true) {
        await this.prisma.pipeline.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: id }, // Don't unset the current pipeline
          },
          data: {
            isDefault: false,
          },
        });
      }

      const pipeline = await this.prisma.pipeline.update({
        where: { id },
        data: updatePipelineDto,
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log("Pipeline updated", {
        pipelineId: pipeline.id,
        organizationId,
        event: 'pipeline_updated',
      });

      return pipeline;
    } catch (error) {
      this.logger.error("Failed to update pipeline", error.stack, {
        pipelineId: id,
        organizationId,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    try {
      // First verify pipeline belongs to organization
      const pipeline = await this.findOne(id, organizationId);

      // Check if pipeline has deals
      const dealCount = await this.prisma.deal.count({
        where: {
          pipelineId: id,
          organizationId,
        },
      });

      if (dealCount > 0) {
        throw new ConflictException(
          `Cannot delete pipeline with ${dealCount} deal(s). Move deals to another pipeline first.`
        );
      }

      // If deleting default pipeline, set another as default
      if (pipeline.isDefault) {
        const anotherPipeline = await this.prisma.pipeline.findFirst({
          where: {
            organizationId,
            id: { not: id },
          },
        });

        if (anotherPipeline) {
          await this.prisma.pipeline.update({
            where: { id: anotherPipeline.id },
            data: { isDefault: true },
          });
        }
      }

      await this.prisma.pipeline.delete({
        where: { id },
      });

      this.logger.log("Pipeline deleted", {
        pipelineId: pipeline.id,
        organizationId,
        event: 'pipeline_deleted',
      });

      return { message: 'Pipeline deleted successfully' };
    } catch (error) {
      this.logger.error("Failed to delete pipeline", error.stack, {
        pipelineId: id,
        organizationId,
      });
      throw error;
    }
  }

  async getDefaultPipeline(organizationId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
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
      throw new NotFoundException('No default pipeline found');
    }

    return pipeline;
  }

  // ==================== PIPELINE STAGE METHODS ====================

  async createStage(pipelineId: string, data: CreatePipelineStageDto, organizationId: string) {
    try {
      // Verify pipeline belongs to organization
      await this.findOne(pipelineId, organizationId);

      // Check if stage with same order already exists
      const existingStage = await this.prisma.pipelineStage.findFirst({
        where: {
          pipelineId,
          order: data.order,
        },
      });

      if (existingStage) {
        throw new ConflictException(`Stage with order ${data.order} already exists in this pipeline`);
      }

      const stage = await this.prisma.pipelineStage.create({
        data: {
          ...data,
          pipelineId,
        },
      });

      this.logger.log("Pipeline stage created", {
        stageId: stage.id,
        pipelineId,
        organizationId,
        event: 'pipeline_stage_created',
      });

      return stage;
    } catch (error) {
      this.logger.error("Failed to create pipeline stage", error.stack, {
        pipelineId,
        organizationId,
      });
      throw error;
    }
  }

  async updateStage(stageId: string, updateDto: UpdatePipelineStageDto, organizationId: string) {
    try {
      // First get the stage and verify it belongs to organization
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: stageId,
          pipeline: {
            organizationId,
          },
        },
        include: {
          pipeline: true,
        },
      });

      if (!stage) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      // If updating order, check for conflicts
      if (updateDto.order !== undefined && updateDto.order !== stage.order) {
        const existingStage = await this.prisma.pipelineStage.findFirst({
          where: {
            pipelineId: stage.pipelineId,
            order: updateDto.order,
            id: { not: stageId },
          },
        });

        if (existingStage) {
          throw new ConflictException(`Stage with order ${updateDto.order} already exists in this pipeline`);
        }
      }

      const updatedStage = await this.prisma.pipelineStage.update({
        where: { id: stageId },
        data: updateDto,
      });

      this.logger.log("Pipeline stage updated", {
        stageId: updatedStage.id,
        pipelineId: stage.pipelineId,
        organizationId,
        event: 'pipeline_stage_updated',
      });

      return updatedStage;
    } catch (error) {
      this.logger.error("Failed to update pipeline stage", error.stack, {
        stageId,
        organizationId,
      });
      throw error;
    }
  }

  async removeStage(stageId: string, organizationId: string) {
    try {
      // First get the stage and verify it belongs to organization
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: stageId,
          pipeline: {
            organizationId,
          },
        },
        include: {
          pipeline: true,
          _count: {
            select: {
              deals: true,
            },
          },
        },
      });

      if (!stage) {
        throw new NotFoundException(`Pipeline stage ${stageId} not found`);
      }

      // Check if stage has deals
      if (stage._count.deals > 0) {
        throw new ConflictException(
          `Cannot delete stage with ${stage._count.deals} deal(s). Move deals to another stage first.`
        );
      }

      await this.prisma.pipelineStage.delete({
        where: { id: stageId },
      });

      // Reorder remaining stages
      const remainingStages = await this.prisma.pipelineStage.findMany({
        where: {
          pipelineId: stage.pipelineId,
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Update orders to be sequential
      for (let i = 0; i < remainingStages.length; i++) {
        if (remainingStages[i].order !== i) {
          await this.prisma.pipelineStage.update({
            where: { id: remainingStages[i].id },
            data: { order: i },
          });
        }
      }

      this.logger.log("Pipeline stage deleted", {
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        organizationId,
        event: 'pipeline_stage_deleted',
      });

      return { message: 'Pipeline stage deleted successfully' };
    } catch (error) {
      this.logger.error("Failed to delete pipeline stage", error.stack, {
        stageId,
        organizationId,
      });
      throw error;
    }
  }

  async reorderStages(pipelineId: string, stageIds: string[], organizationId: string) {
    try {
      // Verify pipeline belongs to organization
      await this.findOne(pipelineId, organizationId);

      // Verify all stages belong to this pipeline
      const stages = await this.prisma.pipelineStage.findMany({
        where: {
          id: { in: stageIds },
          pipelineId,
        },
      });

      if (stages.length !== stageIds.length) {
        throw new NotFoundException('One or more stages not found in this pipeline');
      }

      // Update stages with new order
      const updates = stageIds.map((id, index) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { order: index },
        })
      );

      await this.prisma.$transaction(updates);

      this.logger.log("Pipeline stages reordered", {
        pipelineId,
        organizationId,
        stageCount: stageIds.length,
        event: 'pipeline_stages_reordered',
      });

      return { message: 'Stages reordered successfully' };
    } catch (error) {
      this.logger.error("Failed to reorder pipeline stages", error.stack, {
        pipelineId,
        organizationId,
      });
      throw error;
    }
  }
}