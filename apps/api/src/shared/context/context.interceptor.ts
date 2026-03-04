// apps/api/src/shared/database/tenant-aware.repository.ts

import { PrismaService } from '../prisma/prisma.service';
import { als } from '../als'; // ✅ Import shared ALS

export class TenantContextMissingError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

export abstract class TenantAwareRepository {
  protected prisma: PrismaService;

  constructor(prisma?: PrismaService) {
    if (prisma) {
      this.prisma = prisma;
    }
  }

  protected setPrismaService(prisma: PrismaService): void {
    this.prisma = prisma;
  }

  protected getPrisma(): PrismaService {
    if (!this.prisma) {
      throw new Error('PrismaService not initialized');
    }
    return this.prisma;
  }

  /**
   * Get current tenant ID from shared ALS
   */
  protected get tenantId(): string {
    const store = als.getStore();
    if (!store?.tenantId) {
      throw new TenantContextMissingError(
        'Tenant context is required for database operations',
      );
    }
    return store.tenantId;
  }

  /**
   * Get tenant ID safely (for optional operations)
   */
  protected get tenantIdOrUndefined(): string | undefined {
    return als.getStore()?.tenantId;
  }

  /**
   * Add tenant filter to any WHERE clause
   */
  protected withTenantFilter<T extends Record<string, any>>(
    where?: T,
  ): T & { organizationId: string } {
    const tenantId = this.tenantId;
    return {
      ...where,
      organizationId: tenantId,
    } as T & { organizationId: string };
  }

  protected withTenantData<T extends Record<string, any>>(
    data: Omit<T, 'organizationId'>,
  ): T & { organizationId: string } {
    const tenantId = this.tenantId;
    return {
      ...data,
      organizationId: tenantId,
    } as T & { organizationId: string };
  }

  protected assertTenantOwnership(entity: { organizationId: string }): void {
    const tenantId = this.tenantId;
    if (entity.organizationId !== tenantId) {
      throw new TenantContextMissingError(
        `Access denied: Entity belongs to organization ${entity.organizationId}, ` +
          `but current context is organization ${tenantId}`,
      );
    }
  }

  protected async transaction<T>(
    fn: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.getPrisma().$transaction(fn);
  }
}