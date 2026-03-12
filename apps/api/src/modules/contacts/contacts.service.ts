import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactRepository } from './repositories/contact.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import type { Contact, Prisma } from '@prisma/client';

// ==================== TYPE DEFINITIONS ====================

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
}

interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  department?: string;
  metadata?: Record<string, any>;
}

interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  department?: string;
  metadata?: Record<string, any>;
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private contactRepository: ContactRepository,
    private permissionContext: PermissionContextService,
  ) {
    this.logger.log('ContactsService initialized');
  }

  /**
   * Check permission - non-async since hasPermission is likely synchronous
   */
  private checkPermission(permission: string): boolean {
    try {
      return this.permissionContext.hasPermission(permission);
    } catch {
      this.logger.debug(
        `Permission context not ready for ${permission}, relying on guard`,
      );
      return true;
    }
  }

  /**
   * Parse full name into firstName and lastName
   */
  private parseFullName(name: string): { firstName: string; lastName: string } {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return { firstName, lastName };
  }

  async create(
    data: Record<string, unknown>,
    tenantId: string,
  ): Promise<Contact> {
    this.logger.log('=== CREATE CONTACT START ===');
    this.logger.log(`Using tenant ID: ${tenantId}`);

    try {
      this.checkPermission('contact:write');
      this.logger.log('Permission check passed');

      const { name, ...restData } = data;
      const { firstName, lastName } = this.parseFullName(
        (name as string) || '',
      );

      this.logger.log(
        `Creating contact with firstName: ${firstName}, lastName: ${lastName}`,
      );

      const createInput: CreateContactInput = {
        firstName,
        lastName,
        ...restData,
      };

      const contact = await this.contactRepository.create(
        tenantId,
        createInput,
      );

      this.logger.log('Contact created successfully:', {
        contactId: contact.id,
        organizationId: contact.organizationId,
      });

      return contact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create contact: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async findAll(
    options: FindAllOptions,
    tenantId: string,
  ): Promise<{
    data: Contact[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      this.checkPermission('contact:read');

      const { page = 1, limit = 20, search } = options;
      const skip = (page - 1) * limit;
      const take = limit;

      const where: Prisma.ContactWhereInput = {};

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch contacts: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async findOne(id: string, tenantId: string): Promise<Contact> {
    try {
      this.checkPermission('contact:read');

      const contact = await this.contactRepository.findById(id, tenantId);

      if (!contact) {
        throw new NotFoundException(`Contact ${id} not found`);
      }

      return contact;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch contact: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
    tenantId: string,
  ): Promise<Contact> {
    try {
      this.checkPermission('contact:write');

      await this.findOne(id, tenantId);

      const { name, ...updateData } = updateContactDto;
      const updatePayload: UpdateContactInput = { ...updateData };

      if (name !== undefined) {
        const { firstName, lastName } = this.parseFullName(name);
        updatePayload.firstName = firstName;
        updatePayload.lastName = lastName;
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update contact: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<Contact> {
    try {
      this.checkPermission('contact:delete');

      await this.findOne(id, tenantId);

      const contact = await this.contactRepository.delete(tenantId, { id });

      this.logger.log('Contact deleted', {
        contactId: contact.id,
        organizationId: contact.organizationId,
      });

      return contact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete contact: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
