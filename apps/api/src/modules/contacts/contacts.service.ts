//D:\Projects-In-Hand\helixcrm\apps\api\src\modules\contacts\contacts.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { UpdateContactDto } from "./dto/update-contact.dto";

interface FindAllOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  async create(data: any) {
    try {
      const contact = await this.prisma.contact.create({
        data,
      });

      this.logger.log("Contact created", {
        contactId: contact.id,
        organizationId: data.organizationId,
        event: 'contact_created',
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to create contact", error.stack, {
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  async findAll({ organizationId, page = 1, limit = 20, search }: FindAllOptions) {
    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause with tenant isolation
    const where: any = { 
      organizationId,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }, // Include new company field
      ];
    }

    try {
      const [contacts, total] = await Promise.all([
        this.prisma.contact.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.contact.count({ where }),
      ]);

      return {
        data: contacts,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error("Failed to fetch contacts", error.stack, {
        organizationId,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto, organizationId: string) {
    try {
      // First verify contact belongs to organization
      await this.findOne(id, organizationId);

      const contact = await this.prisma.contact.update({
        where: { id },
        data: updateContactDto,
      });

      this.logger.log("Contact updated", {
        contactId: contact.id,
        organizationId,
        event: 'contact_updated',
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to update contact", error.stack, {
        contactId: id,
        organizationId,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    try {
      // First verify contact belongs to organization
      await this.findOne(id, organizationId);

      const contact = await this.prisma.contact.delete({
        where: { id },
      });

      this.logger.log("Contact deleted", {
        contactId: contact.id,
        organizationId,
        event: 'contact_deleted',
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to delete contact", error.stack, {
        contactId: id,
        organizationId,
      });
      throw error;
    }
  }
}