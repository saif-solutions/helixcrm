// apps/api/src/modules/contacts/contacts.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactRepository } from './repositories/contact.repository';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { ContactResponseDto } from './dto/contact-response.dto';
import type { Contact, Prisma } from '@prisma/client';

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
  metadata?: Record<string, unknown>;
}

interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  department?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

// Helper function to wrap errors with cause
function wrapError(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

// Helper function for safe string conversion in CSV export
function safeToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

// Type guard for NestJS HTTP exceptions
function isNestHttpException(
  error: unknown,
): error is ConflictException | NotFoundException {
  return (
    error instanceof ConflictException || error instanceof NotFoundException
  );
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private contactRepository: ContactRepository,
    private permissionContext: PermissionContextService,
    private auditLogService: AuditLogService,
  ) {
    this.logger.log('ContactsService initialized');
  }

  // Safe permission check (no unsafe calls)
  private checkPermission(permission: string): boolean {
    // Cast to unknown first, then to a record to safely check for the method
    const ctx = this.permissionContext as unknown as Record<string, unknown>;
    const hasPermissionFn = ctx.hasPermission;
    if (typeof hasPermissionFn === 'function') {
      try {
        const result = (hasPermissionFn as (perm: string) => boolean)(
          permission,
        );
        return result === true;
      } catch {
        this.logger.debug(
          `Permission context not ready for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  private parseFullName(name: string): { firstName: string; lastName: string } {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return { firstName, lastName };
  }

  private mapToResponse(contact: Contact): ContactResponseDto {
    // Explicit boolean conversion to ensure type safety
    const isActive = Boolean(contact.isActive);

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email ?? undefined,
      phone: contact.phone ?? undefined,
      company: contact.company ?? undefined,
      title: contact.title ?? undefined,
      department: contact.department ?? undefined,
      isActive,
      organizationId: contact.organizationId,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      deletedAt: contact.deletedAt ?? undefined,
    };
  }

  async create(
    data: CreateContactDto,
    tenantId: string,
    userId?: string,
  ): Promise<ContactResponseDto> {
    this.logger.log(`Creating contact in tenant: ${tenantId}`);

    try {
      this.checkPermission('contact:write');

      const { name, ...restData } = data;
      const { firstName, lastName } = this.parseFullName(name || '');

      if (restData.email) {
        const existing = await this.contactRepository.findByEmail(
          restData.email,
          tenantId,
        );
        if (existing) {
          throw new ConflictException(
            `Contact with email ${restData.email} already exists`,
          );
        }
      }

      const createInput: CreateContactInput = {
        firstName,
        lastName,
        ...restData,
      };

      const contact = await this.contactRepository.create(
        tenantId,
        createInput as Prisma.ContactCreateInput,
      );

      // Audit log (fire and forget)
      void this.auditLogService
        .logEvent({
          organizationId: tenantId,
          actorUserId: userId,
          action: 'CONTACT_CREATED',
          entityType: 'CONTACT',
          entityId: contact.id,
          metadata: { contactData: createInput },
          severity: 'LOW',
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to log audit event: ${getErrorMessage(err)}`,
          );
        });

      this.logger.log(`Contact created successfully: ${contact.id}`);
      return this.mapToResponse(contact);
    } catch (error: unknown) {
      this.logger.error(`Failed to create contact: ${getErrorMessage(error)}`);

      if (isNestHttpException(error)) {
        throw error;
      }
      throw wrapError(error, 'Failed to create contact');
    }
  }

  async findAll(
    options: FindAllOptions,
    tenantId: string,
  ): Promise<{
    data: ContactResponseDto[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      this.checkPermission('contact:read');

      const { page = 1, limit = 20, search } = options;
      const skip = (page - 1) * limit;

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
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.contactRepository.count(tenantId, where),
      ]);

      return {
        data: contacts.map((contact) => this.mapToResponse(contact)),
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch contacts: ${getErrorMessage(error)}`);

      if (isNestHttpException(error)) {
        throw error;
      }
      throw wrapError(error, 'Failed to fetch contacts');
    }
  }

  async findOne(id: string, tenantId: string): Promise<ContactResponseDto> {
    try {
      this.checkPermission('contact:read');

      const contact = await this.contactRepository.findById(id, tenantId);

      if (!contact) {
        throw new NotFoundException(`Contact ${id} not found`);
      }

      return this.mapToResponse(contact);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch contact: ${getErrorMessage(error)}`);

      if (isNestHttpException(error)) {
        throw error;
      }
      throw wrapError(error, 'Failed to fetch contact');
    }
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
    tenantId: string,
    userId?: string,
  ): Promise<ContactResponseDto> {
    try {
      this.checkPermission('contact:write');

      const existing = await this.contactRepository.findById(id, tenantId);
      if (!existing) {
        throw new NotFoundException(`Contact ${id} not found`);
      }

      const { name, ...updateData } = updateContactDto;
      const updatePayload: UpdateContactInput = { ...updateData };

      if (name !== undefined) {
        const { firstName, lastName } = this.parseFullName(name);
        updatePayload.firstName = firstName;
        updatePayload.lastName = lastName;
      }

      if (updateData.email && updateData.email !== existing.email) {
        const duplicate = await this.contactRepository.findByEmail(
          updateData.email,
          tenantId,
        );
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException(
            `Contact with email ${updateData.email} already exists`,
          );
        }
      }

      const contact = await this.contactRepository.update(tenantId, {
        where: { id },
        data: updatePayload,
      });

      // Audit log (fire and forget)
      void this.auditLogService
        .logEvent({
          organizationId: tenantId,
          actorUserId: userId,
          action: 'CONTACT_UPDATED',
          entityType: 'CONTACT',
          entityId: contact.id,
          metadata: { before: existing, after: contact },
          severity: 'LOW',
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to log audit event: ${getErrorMessage(err)}`,
          );
        });

      this.logger.log(`Contact updated: ${contact.id}`);
      return this.mapToResponse(contact);
    } catch (error: unknown) {
      this.logger.error(`Failed to update contact: ${getErrorMessage(error)}`);

      if (isNestHttpException(error)) {
        throw error;
      }
      throw wrapError(error, 'Failed to update contact');
    }
  }

  async remove(
    id: string,
    tenantId: string,
    userId?: string,
    hardDelete: boolean = false,
  ): Promise<{ message: string }> {
    try {
      this.checkPermission('contact:delete');

      const existing = await this.contactRepository.findById(id, tenantId);
      if (!existing) {
        throw new NotFoundException(`Contact ${id} not found`);
      }

      if (hardDelete) {
        await this.contactRepository.hardDelete(tenantId, id);
      } else {
        await this.contactRepository.softDelete(tenantId, id);
      }

      // Audit log (fire and forget)
      void this.auditLogService
        .logEvent({
          organizationId: tenantId,
          actorUserId: userId,
          action: hardDelete
            ? 'CONTACT_PERMANENTLY_DELETED'
            : 'CONTACT_DELETED',
          entityType: 'CONTACT',
          entityId: id,
          metadata: { contact: existing, hardDelete },
          severity: 'MEDIUM',
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to log audit event: ${getErrorMessage(err)}`,
          );
        });

      this.logger.log(
        `Contact ${hardDelete ? 'permanently deleted' : 'soft deleted'}: ${id}`,
      );
      return {
        message: `Contact ${hardDelete ? 'permanently deleted' : 'deleted'} successfully`,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to delete contact: ${getErrorMessage(error)}`);

      if (isNestHttpException(error)) {
        throw error;
      }
      throw wrapError(error, 'Failed to delete contact');
    }
  }

  async bulkCreate(
    contacts: CreateContactDto[],
    tenantId: string,
    userId?: string,
  ): Promise<{
    successful: ContactResponseDto[];
    failed: Array<{ index: number; error: string; data: unknown }>;
  }> {
    const successful: ContactResponseDto[] = [];
    const failed: Array<{ index: number; error: string; data: unknown }> = [];

    for (let i = 0; i < contacts.length; i++) {
      try {
        const result = await this.create(contacts[i], tenantId, userId);
        successful.push(result);
      } catch (error: unknown) {
        failed.push({
          index: i,
          error: getErrorMessage(error),
          data: contacts[i],
        });
      }
    }

    this.logger.log(
      `Bulk create completed: ${successful.length} successful, ${failed.length} failed`,
    );
    return { successful, failed };
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: UpdateContactDto }>,
    tenantId: string,
    userId?: string,
  ): Promise<{
    successful: ContactResponseDto[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: ContactResponseDto[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      try {
        const result = await this.update(
          update.id,
          update.data,
          tenantId,
          userId,
        );
        successful.push(result);
      } catch (error: unknown) {
        failed.push({
          id: update.id,
          error: getErrorMessage(error),
        });
      }
    }

    this.logger.log(
      `Bulk update completed: ${successful.length} successful, ${failed.length} failed`,
    );
    return { successful, failed };
  }

  async bulkDelete(
    ids: string[],
    tenantId: string,
    userId?: string,
    hardDelete: boolean = false,
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.remove(id, tenantId, userId, hardDelete);
        successful.push(id);
      } catch (error: unknown) {
        failed.push({
          id,
          error: getErrorMessage(error),
        });
      }
    }

    this.logger.log(
      `Bulk delete completed: ${successful.length} successful, ${failed.length} failed`,
    );
    return { successful, failed };
  }

  async export(
    tenantId: string,
    options: { format?: 'csv' | 'json'; search?: string; limit?: number },
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const { format = 'csv', search, limit = 1000 } = options;

    const where: Prisma.ContactWhereInput = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contacts = await this.contactRepository.findAll(tenantId, {
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      const data = JSON.stringify(
        contacts.map((c) => this.mapToResponse(c)),
        null,
        2,
      );
      return {
        data,
        contentType: 'application/json',
        filename: `contacts-${new Date().toISOString().split('T')[0]}.json`,
      };
    }

    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Title',
      'Department',
      'Created At',
    ];
    const escapeCsvCell = (value: unknown): string => {
      const str = safeToString(value);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const rows = contacts.map((c) =>
      [
        c.id,
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.company,
        c.title,
        c.department,
        c.createdAt,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');

    return {
      data: csv,
      contentType: 'text/csv',
      filename: `contacts-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }
}
