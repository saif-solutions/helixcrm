import { 
  requireTenantContext, 
  getTenantContext
} from '../tenant/tenant.context';
import { PrismaService } from '../prisma/prisma.service';

// Define a local error class if the imported one doesn't accept parameters
class TenantContextMissingError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

/**
 * PRODUCTION-READY TENANT AWARE REPOSITORY BASE CLASS
 * No decorators - compatible with TypeScript 5.9.3
 * Flexible constructor for all repository patterns
 */
export abstract class TenantAwareRepository {
  // Use a more flexible approach - don't enforce strict visibility
  // Child classes can declare prisma as they need
  protected prisma: PrismaService;

  /**
   * FLEXIBLE CONSTRUCTOR: Handles ALL patterns:
   * Pattern 1: super() - no parameter (prisma injected via NestJS)
   * Pattern 2: super(prisma) - with parameter (manual injection)
   * Pattern 3: No super call (prisma set later)
   */
  constructor(prisma?: PrismaService) {
    if (prisma) {
      this.prisma = prisma;
    }
    // If prisma not provided, child class must set it via setPrisma()
  }

  /**
   * Set Prisma instance (for child classes using pattern 1 or 3)
   * This is a protected method that child classes can use
   */
  protected setPrismaService(prisma: PrismaService): void {
    this.prisma = prisma;
  }

  /**
   * Get Prisma instance with safety check
   */
  protected getPrisma(): PrismaService {
    if (!this.prisma) {
      throw new Error(
        'PrismaService not initialized. ' +
        'Options: 1) Pass to constructor, 2) Call setPrismaService(), or 3) Ensure NestJS injection'
      );
    }
    return this.prisma;
  }

  /**
   * Get current tenant ID (throws if context missing)
   */
  protected get tenantId(): string {
    const context = requireTenantContext();
    
    if (!context?.tenantId) {
      throw new TenantContextMissingError('Tenant context is required for database operations');
    }
    
    return context.tenantId;
  }

  /**
   * Get tenant ID safely (for optional operations)
   */
  protected get tenantIdOrUndefined(): string | undefined {
    const context = getTenantContext();
    return context?.tenantId;
  }

  /**
   * Add tenant filter to any WHERE clause
   */
  protected withTenantFilter<T extends Record<string, any>>(
    where?: T
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
    data: Omit<T, 'organizationId'>
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
        `but current context is organization ${tenantId}`
      );
    }
  }

  /**
   * Execute transaction with tenant context preservation
   */
  protected async transaction<T>(
    fn: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    return this.getPrisma().$transaction(fn);
  }

  /**
   * Performance monitoring hook
   */
  protected async measurePerformance<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const tenantId = this.tenantIdOrUndefined;
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`[PERFORMANCE] ${this.constructor.name}.${operationName} took ${duration}ms`, {
          tenantId,
          duration,
        });
      }
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[PERFORMANCE_ERROR] ${this.constructor.name}.${operationName} failed after ${duration}ms`, {
        tenantId,
        duration,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate cache key with tenant isolation
   */
  protected buildCacheKey(prefix: string, ...parts: string[]): string {
    const tenantId = this.tenantId;
    const keyParts = [prefix, tenantId, ...parts].filter(Boolean);
    return keyParts.join(':');
  }
}