// src/modules/email-templates/repositories/email-template.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

interface CreateEmailTemplateData {
  name: string;
  subject: string;
  body: string;
  bodyText?: string;
  category?: string;
  variables?: string[];
  isActive?: boolean;
}

interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  body?: string;
  bodyText?: string;
  category?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class EmailTemplateRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new email template
   */
  async create(data: CreateEmailTemplateData) {
    return this.prisma.emailTemplate.create({
      data: {
        ...data,
        organizationId: this.tenantId,
        isActive: data.isActive ?? true,
        variables: data.variables || [],
      },
    });
  }

  /**
   * Find template by ID with tenant isolation
   */
  async findById(id: string) {
    return this.prisma.emailTemplate.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find template by name with tenant isolation
   */
  async findByName(name: string) {
    return this.prisma.emailTemplate.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find all templates for current tenant
   */
  async findAll(options?: {
    category?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: any = {
      organizationId: this.tenantId,
    };

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Count templates for current tenant
   */
  async count(options?: { category?: string; isActive?: boolean }) {
    const where: any = {
      organizationId: this.tenantId,
    };

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.emailTemplate.count({ where });
  }

  /**
   * Update template
   */
  async update(id: string, data: UpdateEmailTemplateData) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete template
   */
  async delete(id: string) {
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  /**
   * Find active templates by category
   */
  async findActiveByCategory(category?: string) {
    const where: any = {
      organizationId: this.tenantId,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Check if template name exists (excluding current template)
   */
  async nameExists(name: string, excludeId?: string) {
    const where: any = {
      name: { equals: name, mode: 'insensitive' },
      organizationId: this.tenantId,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await this.prisma.emailTemplate.count({ where });
    return count > 0;
  }
}
