import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactRepository } from './repositories/contact.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

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
    private permissionContext: PermissionContextService,
  ) {
    this.logger.log('ContactsService initialized');
  }

  private async checkPermission(permission: string): Promise<boolean> {
    try {
      return this.permissionContext.hasPermission(permission);
    } catch (error) {
      this.logger.debug(
        `Permission context not ready for ${permission}, relying on guard`,
      );
      return true;
    }
  }

  async create(data: any, tenantId: string) {
    this.logger.log('=== CREATE CONTACT START ===');
    this.logger.log(`Using tenant ID: ${tenantId}`);

    try {
      await this.checkPermission('contact:write');
      this.logger.log('Permission check passed');

      const { name, ...restData } = data;

      const nameParts = name ? name.trim().split(/\s+/) : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      this.logger.log(
        `Creating contact with firstName: ${firstName}, lastName: ${lastName}`,
      );

      const contact = await this.contactRepository.create(tenantId, {
        ...restData,
        firstName,
        lastName,
      });

      this.logger.log('Contact created successfully:', {
        contactId: contact.id,
        organizationId: contact.organizationId,
      });

      return contact;
    } catch (error) {
      this.logger.error('Failed to create contact', error.stack);
      throw error;
    }
  }

  async findAll(options: FindAllOptions, tenantId: string) {
    try {
      await this.checkPermission('contact:read');

      const { page = 1, limit = 20, search } = options;
      const skip = (page - 1) * limit;
      const take = limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [contacts, total] = await Promise.all([
        this.contactRepository.findAll(tenantId, {
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.contactRepository.count(tenantId, where),
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
      this.logger.error('Failed to fetch contacts', error.stack);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    try {
      await this.checkPermission('contact:read');

      const contact = await this.contactRepository.findById(id, tenantId);

      if (!contact) {
        throw new NotFoundException(`Contact ${id} not found`);
      }

      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch contact', error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
    tenantId: string,
  ) {
    try {
      await this.checkPermission('contact:write');

      await this.findOne(id, tenantId);

      const { name, ...updateData } = updateContactDto as any;

      const updatePayload: any = { ...updateData };

      if (name !== undefined) {
        const nameParts = name.trim().split(/\s+/);
        updatePayload.firstName = nameParts[0] || '';
        updatePayload.lastName = nameParts.slice(1).join(' ') || '';
      }

      const contact = await this.contactRepository.update(tenantId, {
        where: { id },
        data: updatePayload,
      });

      this.logger.log('Contact updated', {
        contactId: contact.id,
        organizationId: contact.organizationId,
      });

      return contact;
    } catch (error) {
      this.logger.error('Failed to update contact', error.stack);
      throw error;
    }
  }

  async remove(id: string, tenantId: string) {
    try {
      await this.checkPermission('contact:delete');

      await this.findOne(id, tenantId);

      const contact = await this.contactRepository.delete(tenantId, { id });

      this.logger.log('Contact deleted', {
        contactId: contact.id,
        organizationId: contact.organizationId,
      });

      return contact;
    } catch (error) {
      this.logger.error('Failed to delete contact', error.stack);
      throw error;
    }
  }
}
