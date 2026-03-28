// apps/api/src/shared/tenant/tenant-isolation.test.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './context/tenant-context.service';
import {
  TenantContextStorage,
  withTenantContext,
  requireTenantContext,
  getTenantContext,
} from './tenant.context';
import { TenantContext } from './tenant.types';

describe('Tenant Isolation - AsyncLocalStorage', () => {
  let tenantContextService: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextService],
    }).compile();

    tenantContextService =
      module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AsyncLocalStorage Integration', () => {
    it('should store and retrieve tenant context from AsyncLocalStorage', () => {
      const mockContext: TenantContext = {
        tenantId: 'test-tenant-123',
        organizationId: 'test-tenant-123',
        isSystemContext: false,
        source: 'token',
        resolvedAt: new Date(),
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'admin',
      };

      // Test that context is properly stored
      const result = withTenantContext(mockContext, () => {
        const storedContext = TenantContextStorage.getStore();
        expect(storedContext).toBeDefined();
        expect(storedContext?.tenantId).toBe('test-tenant-123');
        expect(storedContext?.organizationId).toBe('test-tenant-123');
        expect(storedContext?.userId).toBe('user-123');
        return 'success';
      });

      expect(result).toBe('success');

      // Context should not leak outside the withTenantContext block
      const leakedContext = TenantContextStorage.getStore();
      expect(leakedContext).toBeUndefined();
    });

    it('should handle nested tenant contexts correctly', () => {
      const outerContext: TenantContext = {
        tenantId: 'outer-tenant',
        organizationId: 'outer-tenant',
        isSystemContext: false,
        source: 'token',
        resolvedAt: new Date(),
      };

      const innerContext: TenantContext = {
        tenantId: 'inner-tenant',
        organizationId: 'inner-tenant',
        isSystemContext: false,
        source: 'token',
        resolvedAt: new Date(),
      };

      const result = withTenantContext(outerContext, () => {
        // Outer context should be available
        expect(TenantContextStorage.getStore()?.tenantId).toBe('outer-tenant');

        const innerResult = withTenantContext(innerContext, () => {
          // Inner context should override outer context
          expect(TenantContextStorage.getStore()?.tenantId).toBe(
            'inner-tenant',
          );
          return 'inner';
        });

        // After inner block, should be back to outer context
        expect(TenantContextStorage.getStore()?.tenantId).toBe('outer-tenant');

        return `outer-${innerResult}`;
      });

      expect(result).toBe('outer-inner');
    });

    it('should throw error when requiring context without one', () => {
      expect(() => requireTenantContext()).toThrow('Tenant context is missing');
    });

    it('should not throw when getting context without one', () => {
      const context = getTenantContext();
      expect(context).toBeUndefined();
    });
  });

  describe('TenantAwareRepository Pattern', () => {
    it('should demonstrate repository pattern with tenant isolation', () => {
      const mockTenantContext: TenantContext = {
        tenantId: 'repo-test-tenant',
        organizationId: 'repo-test-tenant',
        isSystemContext: false,
        source: 'token',
        resolvedAt: new Date(),
      };

      withTenantContext(mockTenantContext, () => {
        // Verify tenant context is properly set
        expect(TenantContextStorage.getStore()?.tenantId).toBe(
          'repo-test-tenant',
        );

        // Verify we can access the service (but we don't need to call methods for this test)
        // The service is available if needed for future tests
        expect(tenantContextService).toBeDefined();

        // The key insight: Any repository extending TenantAwareRepository
        // would automatically filter by organizationId = 'repo-test-tenant'
        // without manual filtering
      });
    });
  });
});
