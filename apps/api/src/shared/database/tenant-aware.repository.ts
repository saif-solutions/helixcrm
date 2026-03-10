// apps/api/src/shared/database/tenant-aware.repository.ts

import { PrismaService } from '../prisma/prisma.service';
import { getTenantId, requireTenantId } from '../als'; // ✅ Import from als.ts

export class TenantContextMissingError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

export abstract class TenantAwareRepository {
  protected prisma: PrismaService;

  // Cache the tenant ID for the current request
  private cachedTenantId: string | null = null;

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
   * Initialize tenant context from ALS
   */
  protected initTenantContext(): void {
    if (!this.cachedTenantId) {
      this.cachedTenantId = getTenantId();
      if (!this.cachedTenantId) {
        throw new TenantContextMissingError(
          'Tenant context is required for database operations',
        );
      }
    }
  }

  /**
   * Get current tenant ID (throws if context missing)
   */
  protected get tenantId(): string {
    if (this.cachedTenantId) {
      return this.cachedTenantId;
    }

    this.initTenantContext();
    return this.cachedTenantId;
  }

  /**
   * Get tenant ID safely (for optional operations)
   */
  protected get tenantIdOrUndefined(): string | undefined {
    if (this.cachedTenantId) {
      return this.cachedTenantId;
    }

    this.cachedTenantId = getTenantId();
    return this.cachedTenantId;
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

  /**
   * Add tenant ID to data being created
   */
  protected withTenantData<T extends Record<string, any>>(
    data: Omit<T, 'organizationId'>,
  ): T & { organizationId: string } {
    const tenantId = this.tenantId;
    return {
      ...data,
      organizationId: tenantId,
    } as T & { organizationId: string };
  }

  /**
   * Assert that data belongs to current tenant
   */
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

  protected async measurePerformance<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    const tenantId = this.tenantIdOrUndefined;

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        console.warn(
          `[PERFORMANCE] ${this.constructor.name}.${operationName} took ${duration}ms`,
          {
            tenantId,
            duration,
          },
        );
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[PERFORMANCE_ERROR] ${this.constructor.name}.${operationName} failed after ${duration}ms`,
        {
          tenantId,
          duration,
          error: error.message,
        },
      );
      throw error;
    }
  }

  protected buildCacheKey(prefix: string, ...parts: string[]): string {
    const tenantId = this.tenantId;
    const keyParts = [prefix, tenantId, ...parts].filter(Boolean);
    return keyParts.join(':');
  }
}
