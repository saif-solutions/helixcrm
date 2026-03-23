// apps/api/src/modules/leads/repositories/lead.repository.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Lead, Prisma, LeadStatus } from '@prisma/client';

// Define types for better type safety
interface LeadWhereInput extends Prisma.LeadWhereInput {
  organizationId?: string;
  deletedAt?: Date | null;
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    email?: { contains: string; mode: 'insensitive' };
    phone?: { contains: string; mode: 'insensitive' };
  }>;
}

interface FindAllParams {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
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
export class LeadRepository extends TenantAwareRepository {
  private readonly logger = new Logger(LeadRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, includeDeleted = false): Promise<Lead | null> {
    try {
      const where: LeadWhereInput = this.withTenantFilter({ id });

      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const lead = await this.prisma.lead.findFirst({
        where,
      });

      if (!lead) {
        this.logger.warn(`Lead not found: ${id} in tenant: ${this.tenantId}`);
      }

      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByIdOrThrow(id: string, includeDeleted = false): Promise<Lead> {
    const lead = await this.findById(id, includeDeleted);
    if (!lead) {
      throw new NotFoundException(
        `Lead with ID ${id} not found in current tenant`,
      );
    }
    return lead;
  }

  async create(
    data: Omit<Prisma.LeadCreateInput, 'organization'>,
  ): Promise<Lead> {
    try {
      const tenantId = this.tenantId;

      const tenantData: Prisma.LeadCreateInput = {
        ...data,
        organization: {
          connect: { id: tenantId },
        },
      };

      const lead = await this.prisma.lead.create({
        data: tenantData,
      });

      this.logger.log(`Lead created: ${lead.id} in tenant: ${tenantId}`);
      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to create lead: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(params: {
    id: string;
    data: Prisma.LeadUpdateInput;
  }): Promise<Lead> {
    try {
      await this.findByIdOrThrow(params.id);

      const lead = await this.prisma.lead.update({
        where: { id: params.id },
        data: params.data,
      });

      this.logger.log(`Lead updated: ${params.id} in tenant: ${this.tenantId}`);
      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update lead ${params.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async softDelete(id: string, deletedBy?: string): Promise<Lead> {
    try {
      await this.findByIdOrThrow(id);

      const lead = await this.prisma.lead.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy,
        },
      });

      this.logger.log(`Lead soft deleted: ${id} in tenant: ${this.tenantId}`);
      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to soft delete lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async hardDelete(id: string): Promise<Lead> {
    try {
      await this.findByIdOrThrow(id, true);

      const lead = await this.prisma.lead.delete({
        where: { id },
      });

      this.logger.log(`Lead hard deleted: ${id} in tenant: ${this.tenantId}`);
      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to hard delete lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findAll(
    params: FindAllParams,
  ): Promise<{ data: Lead[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, search } = params;
      const skip = (page - 1) * limit;

      const where: LeadWhereInput = this.withTenantFilter({ deletedAt: null });

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.lead.count({ where }),
      ]);

      return { data, total };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find leads: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async countByStatus(): Promise<Record<LeadStatus, number>> {
    try {
      const stats = await this.prisma.lead.groupBy({
        by: ['status'],
        where: this.withTenantFilter({ deletedAt: null }),
        _count: {
          id: true,
        },
      });

      return stats.reduce(
        (acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        },
        {} as Record<LeadStatus, number>,
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to count leads by status: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const where: LeadWhereInput = this.withTenantFilter({ email });

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await this.prisma.lead.count({
        where,
      });

      return count > 0;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to check email existence: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
