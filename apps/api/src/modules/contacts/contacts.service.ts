import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { UpdateContactDto } from "./dto/update-contact.dto";
import { ContactRepository } from "./repositories/contact.repository";
import { TenantContextService } from "../../shared/tenant/context/tenant-context.service";
import { PermissionContextService } from "../../shared/permissions/context/permission-context.service";

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private contactRepository: ContactRepository,
    private tenantContext: TenantContextService,
    private permissionContext: PermissionContextService,
  ) {}

  async create(data: any) {
    // Permission check
    if (!this.permissionContext.hasPermission('contacts.create')) {
      this.logger.warn(`Permission denied: User ${this.permissionContext.getUserId()} lacks contacts.create permission`);
      throw new Error('Insufficient permissions to create contacts');
    }

    try {
      // Split name into firstName and lastName for Phase 3.4 compatibility
      const { name, ...restData } = data;
      
      // Split name: first word = firstName, rest = lastName
      const nameParts = name ? name.trim().split(/\s+/) : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const contact = await this.contactRepository.create({
        ...restData,
        firstName,
        lastName,
      });

      this.logger.log("Contact created", {
        contactId: contact.id,
        organizationId: this.tenantContext.getTenantId(),
        event: 'contact_created',
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to create contact", error.stack, {
        organizationId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

  async findAll({ page = 1, limit = 20, search }: FindAllOptions) {
    // Permission check
    if (!this.permissionContext.hasPermission('contacts.read')) {
      throw new Error('Insufficient permissions to view contacts');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: any = {};
    
    // Add search filter if provided
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [contacts, total] = await Promise.all([
        this.contactRepository.findAll({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.contactRepository.count(where),
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
        organizationId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

  async findOne(id: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('contacts.read')) {
      throw new Error('Insufficient permissions to view contact details');
    }

    const contact = await this.contactRepository.findById(id);

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    // Permission check
    if (!this.permissionContext.hasPermission('contacts.update')) {
      throw new Error('Insufficient permissions to update contacts');
    }

    try {
      // First verify contact exists in current tenant
      await this.findOne(id);

      // Handle name splitting if name is provided in update
      const { name, ...updateData } = updateContactDto as any;
      
      const updatePayload: any = { ...updateData };
      
      if (name !== undefined) {
        // Split name: first word = firstName, rest = lastName
        const nameParts = name.trim().split(/\s+/);
        updatePayload.firstName = nameParts[0] || '';
        updatePayload.lastName = nameParts.slice(1).join(' ') || '';
      }

      const contact = await this.contactRepository.update({
        where: { id },
        data: updatePayload,
      });

      this.logger.log("Contact updated", {
        contactId: contact.id,
        organizationId: this.tenantContext.getTenantId(),
        event: 'contact_updated',
      });

      return contact;
    } catch (error) {
      this.logger.error("Failed to update contact", error.stack, {
        contactId: id,
        organizationId: this.tenantContext.getTenantId(),
      });
      throw error;
    }
  }

async remove(id: string) {
  // Permission check
  if (!this.permissionContext.hasPermission('contacts.delete')) {
    throw new Error('Insufficient permissions to delete contacts');
  }

  try {
    // First verify contact exists in current tenant
    await this.findOne(id);

    const contact = await this.contactRepository.delete({
      id, // Changed from where: { id } to just id
    });

    this.logger.log("Contact deleted", {
      contactId: contact.id,
      organizationId: this.tenantContext.getTenantId(),
      event: 'contact_deleted',
    });

    return contact;
  } catch (error) {
    this.logger.error("Failed to delete contact", error.stack, {
      contactId: id,
      organizationId: this.tenantContext.getTenantId(),
    });
    throw error;
  }
}

  async search(searchTerm: string, limit: number = 20) {
    // Permission check
    if (!this.permissionContext.hasPermission('contacts.read')) {
      throw new Error('Insufficient permissions to search contacts');
    }

    return this.contactRepository.search(searchTerm, limit);
  }

  async archive(id: string) {
    // Permission check for soft delete
    if (!this.permissionContext.hasPermission('contacts.delete')) {
      throw new Error('Insufficient permissions to archive contacts');
    }

    const contact = await this.contactRepository.softDelete(id);

    this.logger.log("Contact archived", {
      contactId: contact.id,
      organizationId: this.tenantContext.getTenantId(),
      event: 'contact_archived',
    });

    return contact;
  }
}