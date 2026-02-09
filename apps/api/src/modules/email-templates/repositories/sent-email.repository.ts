import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

interface CreateSentEmailData {
  templateId?: string;
  to: string;
  toName?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyText?: string;
  status?: string;
  campaignId?: string;
  contactId?: string;
  userId?: string;
}

interface UpdateSentEmailData {
  status?: string;
  error?: string;
  sentAt?: Date;
}

@Injectable()
export class SentEmailRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a sent email record
   */
  async create(data: CreateSentEmailData) {
    return this.prisma.sentEmail.create({
      data: {
        ...data,
        organizationId: this.tenantId,
        status: data.status || 'pending',
        cc: data.cc || [],
        bcc: data.bcc || [],
      },
    });
  }

  /**
   * Update sent email record
   */
  async update(id: string, data: UpdateSentEmailData) {
    return this.prisma.sentEmail.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count sent emails for a template
   */
  async countByTemplate(templateId: string) {
    return this.prisma.sentEmail.count({
      where: {
        templateId,
        organizationId: this.tenantId,
      },
    });
  }
}
