import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppLogger } from "../../shared/logging/logger.service";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  async create(data: any) {
    try {
      const contact = await this.prisma.contact.create({
        data: {
          ...data,
          // ✅ organizationId is REQUIRED here
        },
      });

      this.logger.log("Contact created", {
        contactId: contact.id,
        organizationId: data.organizationId,
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to create contact", error.stack, {
        organizationId: data.organizationId,
      });
      throw error;
    }
  }

  async findAll(organizationId: string) {
    // ✅ Application-level tenant enforcement
    return this.prisma.contact.findMany({
      where: { organizationId },
    });
  }

  async findOne(id: string, organizationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id,
        organizationId, // ✅ Application-level tenant enforcement
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
