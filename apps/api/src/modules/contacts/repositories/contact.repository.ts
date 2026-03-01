// apps/api/src/modules/contacts/repositories/contact.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Contact, Prisma } from '@prisma/client';

@Injectable()
export class ContactRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: {
        id,
        organizationId: tenantId,
      },
    });
  }

  async findByEmail(email: string, tenantId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: {
        email,
        organizationId: tenantId,
      },
    });
  }

  async findAll(
    tenantId: string,
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ContactWhereInput;
      orderBy?: Prisma.ContactOrderByWithRelationInput;
    }
  ): Promise<Contact[]> {
    const { skip, take, where, orderBy } = params;

    return this.prisma.contact.findMany({
      skip,
      take,
      where: {
        ...where,
        organizationId: tenantId,
      },
      orderBy,
    });
  }

  async count(tenantId: string, where?: Prisma.ContactWhereInput): Promise<number> {
    return this.prisma.contact.count({
      where: {
        ...where,
        organizationId: tenantId,
      },
    });
  }

  async create(tenantId: string, data: Prisma.ContactCreateInput): Promise<Contact> {
    return this.prisma.contact.create({
      data: {
        ...data,
        organization: {
          connect: {
            id: tenantId,
          },
        },
      },
    });
  }

  async update(
    tenantId: string,
    params: {
      where: Prisma.ContactWhereUniqueInput;
      data: Prisma.ContactUpdateInput;
    }
  ): Promise<Contact> {
    const { where, data } = params;

    const existingContact = await this.findById(where.id, tenantId);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    return this.prisma.contact.update({
      where: {
        id: where.id,
        organizationId: tenantId,
      },
      data,
    });
  }

  async delete(tenantId: string, where: Prisma.ContactWhereUniqueInput): Promise<Contact> {
    const existingContact = await this.findById(where.id, tenantId);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    return this.prisma.contact.delete({
      where: {
        id: where.id,
        organizationId: tenantId,
      },
    });
  }

  async softDelete(tenantId: string, id: string): Promise<Contact> {
    const existingContact = await this.findById(id, tenantId);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    return this.prisma.contact.update({
      where: {
        id,
        organizationId: tenantId,
      },
      data: { deletedAt: new Date() },
    });
  }

  async search(tenantId: string, searchTerm: string, limit: number = 20): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        organizationId: tenantId,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { company: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });
  }
}
