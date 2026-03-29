import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Prisma } from '@prisma/client';

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

interface FindAllOptions {
  category?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
}

@Injectable()
export class EmailTemplateRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

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

  async findById(id: string) {
    return this.prisma.emailTemplate.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.emailTemplate.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        organizationId: this.tenantId,
      },
    });
  }

  async findAll(options?: FindAllOptions) {
    const where: Prisma.EmailTemplateWhereInput = {
      organizationId: this.tenantId,
    };

    if (options?.category !== undefined) {
      where.category = options.category;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async count(options?: FindAllOptions) {
    const where: Prisma.EmailTemplateWhereInput = {
      organizationId: this.tenantId,
    };

    if (options?.category !== undefined) {
      where.category = options.category;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.emailTemplate.count({ where });
  }

  async update(id: string, data: UpdateEmailTemplateData) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  async findActiveByCategory(category?: string) {
    const where: Prisma.EmailTemplateWhereInput = {
      organizationId: this.tenantId,
      isActive: true,
    };

    if (category !== undefined) {
      where.category = category;
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async nameExists(name: string, excludeId?: string) {
    const where: Prisma.EmailTemplateWhereInput = {
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
