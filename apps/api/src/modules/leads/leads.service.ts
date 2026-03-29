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

// Helper functions for safe error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

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

  // Safe tenant ID extraction
  private getTenantId(): string {
    const id = this.tenantContext.getTenantId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  async create(createLeadDto: CreateLeadDto, userId: string) {
    const startTime = Date.now();
    const tenantId = this.getTenantId();

    try {
      const { source, ...leadData } = createLeadDto;

      const lead = await this.leadRepository.create({
        ...leadData,
        status: leadData.status ?? PrismaLeadStatus.new,
        metadata: source ? { source } : undefined,
      });

      this.logger.log('Lead created', {
        leadId: lead.id,
        tenantId,
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
        getErrorStack(error),
        {
          tenantId,
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
        tenantId,
      });
    }
  }

  async findAll(params: FindAllOptions) {
    const tenantId = this.getTenantId();
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
        getErrorStack(error),
        { tenantId, params },
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
    const tenantId = this.getTenantId();
    const startTime = Date.now();

    try {
      const lead = await this.leadRepository.findByIdOrThrow(id);

      // Extra tenant verification (belt‑and‑suspenders)
      if (lead.organizationId !== tenantId) {
        throw new ForbiddenException('Cross-tenant access attempted');
      }

      return lead;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch lead ${id}: ${errorMessage}`,
        getErrorStack(error),
        { leadId: id, tenantId },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.findOne completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'findOne',
        tenantId,
      });
    }
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, userId: string) {
    const tenantId = this.getTenantId();
    const startTime = Date.now();

    try {
      await this.findOne(id); // Verify ownership

      const lead = await this.leadRepository.update({
        id,
        data: updateLeadDto,
      });

      this.logger.log('Lead updated', {
        leadId: lead.id,
        tenantId,
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
        getErrorStack(error),
        { leadId: id, tenantId, userId },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.update completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'update',
        tenantId,
      });
    }
  }

  async remove(id: string, userId: string) {
    const tenantId = this.getTenantId();
    const startTime = Date.now();

    try {
      await this.findOne(id); // Verify ownership

      const lead = await this.leadRepository.softDelete(id, userId);

      this.logger.log('Lead deleted', {
        leadId: lead.id,
        tenantId,
        userId,
        event: 'lead_deleted',
      });

      return lead;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to delete lead ${id}: ${errorMessage}`,
        getErrorStack(error),
        { leadId: id, tenantId, userId },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.remove completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'remove',
        tenantId,
      });
    }
  }

  async getStats() {
    const tenantId = this.getTenantId();
    const startTime = Date.now();

    try {
      return await this.leadRepository.countByStatus();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch lead stats: ${errorMessage}`,
        getErrorStack(error),
        { tenantId },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Lead.getStats completed in ${duration}ms`, {
        duration,
        module: 'leads',
        method: 'getStats',
        tenantId,
      });
    }
  }
}
