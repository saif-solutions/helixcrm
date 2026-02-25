// File: src/modules/leads/repositories/lead.repository.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Lead, Prisma, LeadStatus } from '@prisma/client';

@Injectable()
export class LeadRepository extends TenantAwareRepository {
  private readonly logger = new Logger(LeadRepository.name);

  constructor(prisma: PrismaService) {
    // REMOVE "private"
    super(prisma); // PASS prisma to parent
  }

  /**
   * Find lead by ID
   */
  async findById(id: string, includeDeleted = false): Promise<Lead | null> {
    try {
      const where: any = this.withTenantFilter({ id });

      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const lead = await this.prisma.lead.findFirst({
        // ✅ Works - from parent
        where,
      });

      if (!lead) {
        this.logger.warn(`Lead not found: ${id} in tenant: ${this.tenantId}`);
      }

      return lead;
    } catch (error: any) {
      this.logger.error(
        `Failed to find lead ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find lead by ID or throw NotFoundException
   */
  async findByIdOrThrow(id: string, includeDeleted = false): Promise<Lead> {
    const lead = await this.findById(id, includeDeleted);
    if (!lead) {
      throw new NotFoundException(
        `Lead with ID ${id} not found in current tenant`,
      );
    }
    return lead;
  }

  /**
   * Create lead with tenant isolation
   */
  async create(
    data: Omit<Prisma.LeadCreateInput, 'organization'>,
  ): Promise<Lead> {
    try {
      const tenantId = this.tenantId;

      // Manually add organization connection
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
    } catch (error: any) {
      this.logger.error(`Failed to create lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update lead with tenant validation
   */
  async update(params: {
    id: string;
    data: Prisma.LeadUpdateInput;
  }): Promise<Lead> {
    try {
      // First verify lead belongs to tenant
      await this.findByIdOrThrow(params.id);

      const lead = await this.prisma.lead.update({
        where: { id: params.id },
        data: params.data,
      });

      this.logger.log(`Lead updated: ${params.id} in tenant: ${this.tenantId}`);
      return lead;
    } catch (error: any) {
      this.logger.error(
        `Failed to update lead ${params.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Soft delete lead
   */
  async softDelete(id: string, deletedBy?: string): Promise<Lead> {
    try {
      // First verify lead belongs to tenant
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
    } catch (error: any) {
      this.logger.error(
        `Failed to soft delete lead ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Hard delete lead
   */
  async hardDelete(id: string): Promise<Lead> {
    try {
      // First verify lead belongs to tenant
      await this.findByIdOrThrow(id, true); // Include deleted

      const lead = await this.prisma.lead.delete({
        where: { id },
      });

      this.logger.log(`Lead hard deleted: ${id} in tenant: ${this.tenantId}`);
      return lead;
    } catch (error: any) {
      this.logger.error(
        `Failed to hard delete lead ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find all leads with pagination and filtering
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: LeadStatus;
    search?: string;
  }): Promise<{ data: Lead[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, search } = params;
      const skip = (page - 1) * limit;

      // Build where clause with tenant isolation
      const where: any = this.withTenantFilter();

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

      // Exclude soft deleted records
      where.deletedAt = null;

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
    } catch (error: any) {
      this.logger.error(`Failed to find leads: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Count leads by status
   */
  async countByStatus(): Promise<Record<LeadStatus, number>> {
    try {
      const stats = await this.prisma.lead.groupBy({
        by: ['status'],
        where: this.withTenantFilter({ deletedAt: null }),
        _count: {
          id: true,
        },
      });

      // Convert to Record<LeadStatus, number> with enum values as keys
      return stats.reduce(
        (acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        },
        {} as Record<LeadStatus, number>,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to count leads by status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if email exists in tenant
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = this.withTenantFilter({ email });

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await this.prisma.lead.count({
        where,
      });

      return count > 0;
    } catch (error: any) {
      this.logger.error(
        `Failed to check email existence: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
