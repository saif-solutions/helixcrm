// apps/api/src/modules/contacts/repositories/contact.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Contact, Prisma } from '@prisma/client';

@Injectable()
export class ContactRepository extends TenantAwareRepository {
  // Remove "private" from constructor parameter
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find contact by ID within current tenant
   */
  async findById(id: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: this.withTenantFilter({ id }),
    });
  }

  /**
   * Find contact by email within current tenant
   */
  async findByEmail(email: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: this.withTenantFilter({ email }),
    });
  }

  /**
   * Find all contacts in current tenant with pagination
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ContactWhereInput;
    orderBy?: Prisma.ContactOrderByWithRelationInput;
  }): Promise<Contact[]> {
    const { skip, take, where, orderBy } = params;

    return this.prisma.contact.findMany({
      skip,
      take,
      where: this.withTenantFilter(where),
      orderBy,
    });
  }

  /**
   * Count contacts in current tenant
   */
  async count(where?: Prisma.ContactWhereInput): Promise<number> {
    return this.prisma.contact.count({
      where: this.withTenantFilter(where),
    });
  }

  /**
   * Create contact in current tenant
   */
  async create(data: Prisma.ContactCreateInput): Promise<Contact> {
    // Manually add tenant ID for Prisma's complex types
    const tenantId = this.tenantId;
    const tenantData = {
      ...data,
      organization: {
        connect: {
          id: tenantId,
        },
      },
    };

    return this.prisma.contact.create({
      data: tenantData,
    });
  }

  /**
   * Update contact in current tenant
   */
  async update(params: {
    where: Prisma.ContactWhereUniqueInput;
    data: Prisma.ContactUpdateInput;
  }): Promise<Contact> {
    const { where, data } = params;

    // First verify the contact belongs to current tenant
    const existingContact = await this.findById(where.id);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    // Manually add tenant filter for Prisma's complex types
    const tenantWhere = {
      ...where,
      organizationId: this.tenantId,
    };

    return this.prisma.contact.update({
      where: tenantWhere,
      data,
    });
  }

  /**
   * Delete contact in current tenant
   */
  async delete(where: Prisma.ContactWhereUniqueInput): Promise<Contact> {
    // First verify the contact belongs to current tenant
    const existingContact = await this.findById(where.id);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    // Manually add tenant filter
    const tenantWhere = {
      ...where,
      organizationId: this.tenantId,
    };

    return this.prisma.contact.delete({
      where: tenantWhere,
    });
  }

  /**
   * Soft delete contact in current tenant
   */
  async softDelete(id: string): Promise<Contact> {
    const existingContact = await this.findById(id);
    if (!existingContact) {
      throw new Error('Contact not found or does not belong to current tenant');
    }

    // Manually add tenant filter
    const tenantWhere = {
      id,
      organizationId: this.tenantId,
    };

    return this.prisma.contact.update({
      where: tenantWhere,
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Search contacts in current tenant
   */
  async search(searchTerm: string, limit: number = 20): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: this.withTenantFilter({
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { company: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
      take: limit,
    });
  }
}
