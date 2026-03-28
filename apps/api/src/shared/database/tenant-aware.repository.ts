// apps/api/src/shared/database/tenant-aware.repository.ts

import { PrismaService } from '../prisma/prisma.service';
import { getTenantId } from '../als';

export class TenantContextMissingError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

export abstract class TenantAwareRepository {
  protected prisma: PrismaService;
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

  protected get tenantId(): string {
    if (this.cachedTenantId) {
      return this.cachedTenantId;
    }
    this.initTenantContext();
    return this.cachedTenantId;
  }

  protected get tenantIdOrUndefined(): string | undefined {
    if (this.cachedTenantId) {
      return this.cachedTenantId;
    }
    this.cachedTenantId = getTenantId();
    return this.cachedTenantId;
  }

  protected withTenantFilter<T extends Record<string, unknown>>(
    where?: T,
  ): T & { organizationId: string } {
    const tenantId = this.tenantId;
    return {
      ...(where ?? {}),
      organizationId: tenantId,
    } as T & { organizationId: string };
  }

  protected withTenantData<T extends Record<string, unknown>>(
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
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);
      console.error(
        `[PERFORMANCE_ERROR] ${this.constructor.name}.${operationName} failed after ${duration}ms`,
        {
          tenantId,
          duration,
          error: errorMessage,
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
