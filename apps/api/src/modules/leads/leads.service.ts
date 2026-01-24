//D:\Projects-In-Hand\helixcrm\apps\api\src\modules\leads\leads.service.ts

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { CreateLeadDto, LeadStatus as DtoLeadStatus } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadStatus as PrismaLeadStatus } from "@prisma/client";

interface FindAllOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  status?: PrismaLeadStatus;
  search?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

async create(data: { organizationId: string } & CreateLeadDto) {
  try {
    // Extract source from data and store in metadata
    const { source, ...leadData } = data;
    
    const lead = await this.prisma.lead.create({
      data: {
        ...leadData,
        status: leadData.status || PrismaLeadStatus.new,
        metadata: source ? { source } : undefined,
      },
    });

    this.logger.log("Lead created", {
      leadId: lead.id,
      organizationId: data.organizationId,
      status: lead.status,
      source,
      event: 'lead_created',
    });

    return lead;
  } catch (error) {
    this.logger.error("Failed to create lead", error.stack, {
      organizationId: data.organizationId,
    });
    throw error;
  }
}

  async findAll({ 
    organizationId, 
    page = 1, 
    limit = 20,
    status,
    search 
  }: FindAllOptions) {
    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause with tenant isolation
    const where: any = { 
      organizationId,
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [leads, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.lead.count({ where }),
      ]);

      return {
        data: leads,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error("Failed to fetch leads", error.stack, {
        organizationId,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, organizationId: string) {
    try {
      // First verify lead belongs to organization
      await this.findOne(id, organizationId);

      const lead = await this.prisma.lead.update({
        where: { id },
        data: updateLeadDto,
      });

      this.logger.log("Lead updated", {
        leadId: lead.id,
        organizationId,
        status: lead.status,
        event: 'lead_updated',
      });

      return lead;
    } catch (error) {
      this.logger.error("Failed to update lead", error.stack, {
        leadId: id,
        organizationId,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    try {
      // First verify lead belongs to organization
      await this.findOne(id, organizationId);

      const lead = await this.prisma.lead.delete({
        where: { id },
      });

      this.logger.log("Lead deleted", {
        leadId: lead.id,
        organizationId,
        event: 'lead_deleted',
      });

      return lead;
    } catch (error) {
      this.logger.error("Failed to delete lead", error.stack, {
        leadId: id,
        organizationId,
      });
      throw error;
    }
  }

  async getStats(organizationId: string) {
    try {
      const stats = await this.prisma.lead.groupBy({
        by: ['status'],
        where: {
          organizationId,
        },
        _count: {
          id: true,
        },
      });

      // Convert to Record<string, number> with enum values as keys
      return stats.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<PrismaLeadStatus, number>);
    } catch (error) {
      this.logger.error("Failed to fetch lead stats", error.stack, {
        organizationId,
      });
      throw error;
    }
  }
}