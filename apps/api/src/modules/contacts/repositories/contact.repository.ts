// apps/api/src/modules/contacts/repositories/contact.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Contact, Prisma } from '@prisma/client';

interface FindAllParams {
  skip?: number;
  take?: number;
  where?: Prisma.ContactWhereInput;
  orderBy?: Prisma.ContactOrderByWithRelationInput;
}

// Type guard to validate Contact object
function isContact(value: unknown): value is Contact {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'firstName' in value &&
    'lastName' in value &&
    'organizationId' in value &&
    'isActive' in value
  );
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

// Helper function to normalize any thrown value to an Error object with cause
function normalizeError(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

@Injectable()
export class ContactRepository {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_KEY_PREFIX = 'contact:';

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKey(id: string, tenantId: string): string {
    return `${this.CACHE_KEY_PREFIX}${tenantId}:${id}`;
  }

  async findById(id: string, tenantId: string): Promise<Contact | null> {
    const cacheKey = this.getCacheKey(id, tenantId);

    // Try cache first with type-safe retrieval
    const cached = await this.cacheManager.get(cacheKey);
    if (isContact(cached)) {
      return cached;
    }

    try {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id,
          organizationId: tenantId,
          deletedAt: null,
        },
      });
      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to find contact by ID: ${id}`);
    }
  }

  async findByEmail(email: string, tenantId: string): Promise<Contact | null> {
    try {
      const contact = await this.prisma.contact.findFirst({
        where: {
          email: email.toLowerCase(),
          organizationId: tenantId,
          deletedAt: null,
        },
      });
      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to find contact by email: ${email}`);
    }
  }

  async findAll(tenantId: string, params: FindAllParams): Promise<Contact[]> {
    const { skip, take, where, orderBy } = params;

    try {
      const contacts = await this.prisma.contact.findMany({
        skip,
        take,
        where: {
          ...where,
          organizationId: tenantId,
          deletedAt: null,
        },
        orderBy,
      });
      return contacts;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to find contacts');
    }
  }

  async count(
    tenantId: string,
    where?: Prisma.ContactWhereInput,
  ): Promise<number> {
    try {
      return await this.prisma.contact.count({
        where: {
          ...where,
          organizationId: tenantId,
          deletedAt: null,
        },
      });
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to count contacts');
    }
  }

  async create(
    tenantId: string,
    data: Prisma.ContactCreateInput,
  ): Promise<Contact> {
    try {
      const contact = await this.prisma.contact.create({
        data: {
          ...data,
          organization: {
            connect: { id: tenantId },
          },
        },
      });

      // Invalidate list cache
      await this.invalidateListCache(tenantId);

      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to create contact');
    }
  }

  async update(
    tenantId: string,
    params: {
      where: Prisma.ContactWhereUniqueInput;
      data: Prisma.ContactUpdateInput;
    },
  ): Promise<Contact> {
    const { where, data } = params;

    try {
      const contact = await this.prisma.contact.update({
        where: {
          id: where.id,
          organizationId: tenantId,
        },
        data,
      });

      // Update cache
      const cacheKey = this.getCacheKey(where.id, tenantId);
      await this.cacheManager.set(cacheKey, contact, this.CACHE_TTL);
      await this.invalidateListCache(tenantId);

      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to update contact: ${where.id}`);
    }
  }

  async softDelete(tenantId: string, id: string): Promise<Contact> {
    try {
      const contact = await this.prisma.contact.update({
        where: {
          id,
          organizationId: tenantId,
        },
        data: { deletedAt: new Date() },
      });

      // Invalidate cache
      const cacheKey = this.getCacheKey(id, tenantId);
      await this.cacheManager.del(cacheKey);
      await this.invalidateListCache(tenantId);

      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to soft delete contact: ${id}`);
    }
  }

  async hardDelete(tenantId: string, id: string): Promise<Contact> {
    try {
      const contact = await this.prisma.contact.delete({
        where: {
          id,
          organizationId: tenantId,
        },
      });

      // Invalidate cache
      const cacheKey = this.getCacheKey(id, tenantId);
      await this.cacheManager.del(cacheKey);
      await this.invalidateListCache(tenantId);

      return contact;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to hard delete contact: ${id}`);
    }
  }

  async bulkCreate(
    tenantId: string,
    contacts: Prisma.ContactCreateInput[],
  ): Promise<Contact[]> {
    try {
      const results = await this.prisma.$transaction(
        contacts.map((contact) =>
          this.prisma.contact.create({
            data: {
              ...contact,
              organization: { connect: { id: tenantId } },
            },
          }),
        ),
      );

      await this.invalidateListCache(tenantId);
      return results;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to bulk create contacts');
    }
  }

  async bulkUpdate(
    tenantId: string,
    updates: Array<{ id: string; data: Prisma.ContactUpdateInput }>,
  ): Promise<Contact[]> {
    try {
      const results = await this.prisma.$transaction(
        updates.map(({ id, data }) =>
          this.prisma.contact.update({
            where: { id, organizationId: tenantId },
            data,
          }),
        ),
      );

      // Invalidate individual caches
      for (const result of results) {
        const cacheKey = this.getCacheKey(result.id, tenantId);
        await this.cacheManager.del(cacheKey);
      }
      await this.invalidateListCache(tenantId);

      return results;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to bulk update contacts');
    }
  }

  async bulkSoftDelete(tenantId: string, ids: string[]): Promise<number> {
    try {
      const result = await this.prisma.contact.updateMany({
        where: {
          id: { in: ids },
          organizationId: tenantId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      // Invalidate individual caches
      for (const id of ids) {
        const cacheKey = this.getCacheKey(id, tenantId);
        await this.cacheManager.del(cacheKey);
      }
      await this.invalidateListCache(tenantId);

      return result.count;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to bulk soft delete contacts');
    }
  }

  async bulkHardDelete(tenantId: string, ids: string[]): Promise<number> {
    try {
      const result = await this.prisma.contact.deleteMany({
        where: {
          id: { in: ids },
          organizationId: tenantId,
        },
      });

      // Invalidate individual caches
      for (const id of ids) {
        const cacheKey = this.getCacheKey(id, tenantId);
        await this.cacheManager.del(cacheKey);
      }
      await this.invalidateListCache(tenantId);

      return result.count;
    } catch (error: unknown) {
      throw normalizeError(error, 'Failed to bulk hard delete contacts');
    }
  }

  async search(
    tenantId: string,
    searchTerm: string,
    limit: number = 20,
  ): Promise<Contact[]> {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: {
          organizationId: tenantId,
          deletedAt: null,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { company: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: Math.min(limit, 100),
        orderBy: { createdAt: 'desc' },
      });
      return contacts;
    } catch (error: unknown) {
      throw normalizeError(error, `Failed to search contacts: ${searchTerm}`);
    }
  }

  async findDuplicates(tenantId: string, email: string): Promise<Contact[]> {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: {
          organizationId: tenantId,
          email: email.toLowerCase(),
          deletedAt: null,
        },
      });
      return contacts;
    } catch (error: unknown) {
      throw normalizeError(
        error,
        `Failed to find duplicate contacts: ${email}`,
      );
    }
  }

  private hasKeysMethod(
    store: Record<string, unknown>,
  ): store is { keys: () => Promise<string[]> } {
    return 'keys' in store && typeof store.keys === 'function';
  }

  private async invalidateListCache(tenantId: string): Promise<void> {
    try {
      // Safely access cache store with proper typing
      const store = this.cacheManager.store as
        | Record<string, unknown>
        | undefined;

      if (!store || typeof store !== 'object') {
        return;
      }

      // Type-safe check for store with keys method
      if (this.hasKeysMethod(store)) {
        const keys = await (store as { keys: () => Promise<string[]> }).keys();
        const listKeys = keys.filter((key: string) =>
          key.startsWith(`contacts:list:${tenantId}`),
        );

        for (const key of listKeys) {
          await this.cacheManager.del(key);
        }
      }
    } catch (error: unknown) {
      // Don't throw on cache invalidation errors - just log
      const errorMessage = getErrorMessage(error);
      console.warn(`Failed to invalidate list cache: ${errorMessage}`);
    }
  }
}
