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
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';

interface FindAllOptions {
  page?: number;
  limit?: number;
  status?: PrismaLeadStatus;
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

// Helper function to check for Prisma error codes
interface PrismaError {
  code?: string;
  message?: string;
  stack?: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string'
  );
}

@Injectable()
export class LeadsService {
  constructor(
    private leadRepository: LeadRepository,
    private tenantContext: TenantContextService,
    private logger: AppLogger,
  ) {}

  async create(createLeadDto: CreateLeadDto, userId: string) {
    const startTime = Date.now();
    try {
      const { source, ...leadData } = createLeadDto;

      const lead = await this.leadRepository.create({
        ...leadData,
        status: leadData.status || PrismaLeadStatus.new,
        metadata: source ? { source } : undefined,
      });

      this.logger.log('Lead created', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        status: lead.status,
        source,
        event: 'lead_created',
      });

      return lead;
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === 'P2002') {
        throw new ConflictException(
          'Lead with this email or phone already exists',
        );
      }
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Referenced entity not found');
      }

      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Lead creation failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId: this.tenantContext.getTenantId(),
          userId,
          errorCode: isPrismaError(error) ? error.code : undefined,
        },
      );

      throw new BadRequestException(
        process.env.NODE_ENV === 'production'
          ? 'Lead creation failed. Contact support.'
          : errorMessage,
      );
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.create completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'create',
        tenantId: this.tenantContext.getTenantId(),
      });
    }
  }

  async findAll(params: FindAllOptions) {
    const tenantId = this.tenantContext.getTenantId();

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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch leads: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          params,
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.findAll completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'findAll',
        tenantId,
      });
    }
  }

  async findOne(id: string) {
    const startTime = Date.now();
    try {
      const lead = await this.leadRepository.findByIdOrThrow(id);

      // Belt-and-suspenders tenant verification
      const tenantId = this.tenantContext.getTenantId();
      if (lead.organizationId !== tenantId) {
        throw new ForbiddenException('Cross-tenant access attempted');
      }

      return lead;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
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
    const startTime = Date.now();
    try {
      // First verify lead belongs to tenant
      await this.findOne(id);

      const lead = await this.leadRepository.update({
        id,
        data: updateLeadDto,
      });

      this.logger.log('Lead updated', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        status: lead.status,
        event: 'lead_updated',
      });

      return lead;
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === 'P2002') {
        throw new ConflictException(
          'Lead with this email or phone already exists',
        );
      }
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
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
    const startTime = Date.now();
    try {
      // First verify lead belongs to tenant
      await this.findOne(id);

      const lead = await this.leadRepository.softDelete(id, userId);

      this.logger.log('Lead deleted', {
        leadId: lead.id,
        tenantId: this.tenantContext.getTenantId(),
        userId,
        event: 'lead_deleted',
      });

      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to delete lead ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
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
    const startTime = Date.now();
    try {
      const stats = await this.leadRepository.countByStatus();
      return stats;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch lead stats: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
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
