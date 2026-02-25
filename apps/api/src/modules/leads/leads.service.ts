// apps/api/src/modules/leads/leads.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppLogger } from '../../shared/logging/logger.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';
import { LeadRepository } from './repositories/lead.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';

interface FindAllOptions {
  page?: number;
  limit?: number;
  status?: PrismaLeadStatus;
  search?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private leadRepository: LeadRepository,
    private permissionContext: PermissionContextService,
    private tenantContext: TenantContextService,
    private logger: AppLogger,
  ) {}

  async create(createLeadDto: CreateLeadDto, userId: string) {
    // Permission check - enterprise pattern
    if (!this.permissionContext.hasPermission('leads.write')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.write required',
      );
    }

    const startTime = Date.now();
    try {
      // Extract source from data and store in metadata
      const { source, ...leadData } = createLeadDto;

      const lead = await this.leadRepository.create({
        ...leadData,
        status: leadData.status || PrismaLeadStatus.new,
        metadata: source ? { source } : undefined,
      });

      // Audit logging (would be added in production)
      this.logger.log('Lead created', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        status: lead.status,
        source,
        event: 'lead_created',
      });

      return lead;
    } catch (error: any) {
      // Classify error types
      if (error.code === 'P2002') {
        // Prisma unique constraint
        throw new ConflictException(
          'Lead with this email or phone already exists',
        );
      }
      if (error.code === 'P2025') {
        // Prisma not found
        throw new NotFoundException('Referenced entity not found');
      }

      // Log with full context (CRITICAL for production debugging)
      this.logger.error(`Lead creation failed: ${error.message}`, error.stack, {
        tenantId: this.tenantContext.getTenantId(),
        userId,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
      });

      // Re-throw with sanitized message
      throw new BadRequestException(
        process.env.NODE_ENV === 'production'
          ? 'Lead creation failed. Contact support.'
          : error.message,
      );
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.create completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'create',
        tenantId: this.tenantContext.getTenantId(),
        performance:
          duration > 1000 ? 'slow' : duration > 500 ? 'warning' : 'normal',
      });
    }
  }

  async findAll(params: FindAllOptions) {
    // Permission check
    if (!this.permissionContext.hasPermission('leads.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.read required',
      );
    }

    const startTime = Date.now();
    try {
      const { data: leads, total } = await this.leadRepository.findAll(params);

      return {
        data: leads,
        meta: {
          page: params.page || 1,
          limit: params.limit || 20,
          total,
          pages: Math.ceil(total / (params.limit || 20)),
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch leads: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantContext.getTenantId(),
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.findAll completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'findAll',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }

  async findOne(id: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('leads.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.read required',
      );
    }

    const startTime = Date.now();
    try {
      const lead = await this.leadRepository.findByIdOrThrow(id);

      // Belt-and-suspenders tenant verification
      const tenantId = this.tenantContext.getTenantId();
      if (lead.organizationId !== tenantId) {
        throw new ForbiddenException('Cross-tenant access attempted');
      }

      return lead;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch lead ${id}: ${error.message}`,
        error.stack,
        {
          leadId: id,
          tenantId: this.tenantContext.getTenantId(),
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.findOne completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'findOne',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, userId: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('leads.write')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.write required',
      );
    }

    const startTime = Date.now();
    try {
      // First verify lead belongs to tenant
      await this.findOne(id);

      const lead = await this.leadRepository.update({
        id,
        data: updateLeadDto,
      });

      // Audit logging
      this.logger.log('Lead updated', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        status: lead.status,
        event: 'lead_updated',
      });

      return lead;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Prisma unique constraint
        throw new ConflictException(
          'Lead with this email or phone already exists',
        );
      }
      this.logger.error(
        `Failed to update lead ${id}: ${error.message}`,
        error.stack,
        {
          leadId: id,
          tenantId: this.tenantContext.getTenantId(),
          userId,
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.update completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'update',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }

  async remove(id: string, userId: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('leads.delete')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.delete required',
      );
    }

    const startTime = Date.now();
    try {
      // First verify lead belongs to tenant
      await this.findOne(id);

      const lead = await this.leadRepository.softDelete(id, userId);

      // Audit logging
      this.logger.log('Lead deleted', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        event: 'lead_deleted',
      });

      return lead;
    } catch (error: any) {
      this.logger.error(
        `Failed to delete lead ${id}: ${error.message}`,
        error.stack,
        {
          leadId: id,
          tenantId: this.tenantContext.getTenantId(),
          userId,
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.remove completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'remove',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }

  async getStats() {
    // Permission check
    if (!this.permissionContext.hasPermission('leads.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: leads.read required',
      );
    }

    const startTime = Date.now();
    try {
      const stats = await this.leadRepository.countByStatus();
      return stats;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch lead stats: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantContext.getTenantId(),
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.getStats completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'getStats',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }
}
