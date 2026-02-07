import { 
  TenantContextMissingError, 
  requireTenantContext, 
  getTenantContext
} from '../tenant/tenant.context';

export abstract class TenantAwareRepository {
  
  /**
   * Get current tenant ID (throws if context missing)
   */
  protected get tenantId(): string {
    return requireTenantContext().tenantId;
  }

  /**
   * Safely get tenant ID (returns undefined if missing)
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
    
    if (!tenantId) {
      throw new TenantContextMissingError();
    }

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
    
    if (!tenantId) {
      throw new TenantContextMissingError();
    }

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
    
    if (!tenantId) {
      throw new TenantContextMissingError();
    }

    if (entity.organizationId !== tenantId) {
      throw new Error(
        `Access denied: Entity belongs to organization ${entity.organizationId}, ` +
        `but current context is organization ${tenantId}`
      );
    }
  }
}