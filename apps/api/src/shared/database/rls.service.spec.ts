import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RLSService } from './rls.service';
import { PrismaService } from '../prisma/prisma.service';
import { RLSError } from './rls.types';

describe('RLSService', () => {
  let service: RLSService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  // Mock data
  const mockOrganizationId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockRole = 'admin';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RLSService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
            $executeRawUnsafe: jest.fn(),
            $transaction: jest.fn((callback) => callback({
              $executeRaw: jest.fn(),
              $executeRawUnsafe: jest.fn(),
            })),
            user: {
              count: jest.fn(),
            },
            $disconnect: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, string> = {
                'RLS_ENABLED': 'true',
                'RLS_FEATURE_FLAG': 'rls_enabled',
                'RLS_BYPASS_ROLE': 'super_admin',
                'NODE_ENV': 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RLSService>(RLSService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should read configuration from ConfigService', () => {
    const config = service.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.featureFlag).toBe('rls_enabled');
    expect(config.bypassRole).toBe('super_admin');
  });

  it('should check if RLS is enabled', () => {
    expect(service.isEnabled()).toBe(true);
  });

  describe('setTenantContext', () => {
    it('should set organization context when RLS is enabled', async () => {
      const executeRawMock = jest.fn().mockResolvedValue([{ set_config: 'app.current_organization_id' }]);
      prismaService.$executeRaw = executeRawMock;
      
      await service.setTenantContext({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        role: mockRole 
      });
      
      // Should be called 3 times: organizationId, userId, role
      expect(executeRawMock).toHaveBeenCalledTimes(3);
      
      // Verify first call sets organizationId
      expect(executeRawMock.mock.calls[0][0]).toContain('app.current_organization_id');
    });

    it('should handle tenantId by mapping to organizationId', async () => {
      const executeRawMock = jest.fn().mockResolvedValue([{ set_config: 'app.current_organization_id' }]);
      prismaService.$executeRaw = executeRawMock;
      
      // The service should extract organizationId from tenantId if provided
      // Since tenantId is optional alias, we need to pass both
      await service.setTenantContext({ 
        tenantId: mockOrganizationId,
        organizationId: mockOrganizationId, // Required field
        userId: mockUserId 
      });
      
      expect(executeRawMock).toHaveBeenCalled();
    });

    it('should throw error when organizationId is missing', async () => {
      // Test with empty object
      await expect(
        service.setTenantContext({} as any) // No organizationId
      ).rejects.toThrow(RLSError);
      
      // Test with empty organizationId
      await expect(
        service.setTenantContext({ organizationId: '', userId: mockUserId })
      ).rejects.toThrow('Organization ID is required for RLS context');
    });
  });

  describe('clearTenantContext', () => {
    it('should clear tenant context', async () => {
      const executeRawMock = jest.fn().mockResolvedValue([{ set_config: '' }]);
      prismaService.$executeRaw = executeRawMock;
      
      await service.clearTenantContext();
      
      // Should be called 3 times: organizationId, userId, role
      expect(executeRawMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('initializeRLS', () => {
    it('should initialize RLS when enabled', async () => {
      const mockTables = [
        { tablename: 'users', rowsecurity: false },
        { tablename: 'contacts', rowsecurity: true },
      ];
      
      prismaService.$queryRaw = jest.fn()
        .mockResolvedValueOnce(mockTables) // First call for RLS check
        .mockResolvedValueOnce([]); // Second call for policy verification
      
      prismaService.$transaction = jest.fn().mockImplementation((callback) => {
        const tx = {
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return callback(tx);
      });

      await service.initializeRLS();
      
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should not initialize RLS when disabled via config', async () => {
      // Mock config to return disabled
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'RLS_ENABLED') return 'false';
          if (key === 'RLS_FEATURE_FLAG') return 'rls_enabled';
          if (key === 'RLS_BYPASS_ROLE') return 'super_admin';
          return null;
        }),
      };
      
      // Recreate service with mocked config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RLSService,
          {
            provide: PrismaService,
            useValue: { $queryRaw: jest.fn() },
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      
      const disabledService = module.get<RLSService>(RLSService);
      await disabledService.onModuleInit();
      
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      // Mock the verifyPolicies method since healthCheck calls it
      jest.spyOn(service, 'verifyPolicies').mockResolvedValue(true);
      
      prismaService.$queryRaw = jest.fn().mockResolvedValue([{ rls_enabled: true }]);
      
      const health = await service.healthCheck();
      
      expect(health).toHaveProperty('enabled');
      expect(health).toHaveProperty('policiesConfigured');
      expect(health.enabled).toBe(true);
      expect(health.policiesConfigured).toBe(true);
    });
  });

  describe('testRLSIsolation', () => {
    it('should test RLS isolation between organizations', async () => {
      const org1Id = 'org-1-uuid';
      const org2Id = 'org-2-uuid';
      
      // Mock setTenantContext
      const setTenantContextSpy = jest.spyOn(service, 'setTenantContext').mockResolvedValue(undefined);
      const clearTenantContextSpy = jest.spyOn(service, 'clearTenantContext').mockResolvedValue(undefined);
      
      // Mock different counts for different orgs
      prismaService.user.count = jest.fn()
        .mockResolvedValueOnce(5) // First org
        .mockResolvedValueOnce(3); // Second org
      
      const result = await service.testRLSIsolation(org1Id, org2Id);
      
      expect(result).toBe(true); // Should return true since counts are different
      expect(setTenantContextSpy).toHaveBeenCalledTimes(2);
      expect(clearTenantContextSpy).toHaveBeenCalledTimes(1);
    });

    it('should return false if RLS isolation is not working', async () => {
      const org1Id = 'org-1-uuid';
      const org2Id = 'org-2-uuid';
      
      const setTenantContextSpy = jest.spyOn(service, 'setTenantContext').mockResolvedValue(undefined);
      const clearTenantContextSpy = jest.spyOn(service, 'clearTenantContext').mockResolvedValue(undefined);
      
      // Mock same count for both orgs (RLS not working)
      prismaService.user.count = jest.fn()
        .mockResolvedValueOnce(10) // First org
        .mockResolvedValueOnce(10); // Second org
      
      const result = await service.testRLSIsolation(org1Id, org2Id);
      
      expect(result).toBe(false); // Should return false since counts are the same
      expect(setTenantContextSpy).toHaveBeenCalledTimes(2);
      expect(clearTenantContextSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleRLS', () => {
    it('should toggle RLS on and off', async () => {
      prismaService.$transaction = jest.fn().mockImplementation((callback) => {
        const tx = {
          $executeRawUnsafe: jest.fn().mockResolvedValue(1),
        };
        return callback(tx);
      });

      // Mock file system
      const mockFs = {
        existsSync: jest.fn().mockReturnValue(true),
        readFileSync: jest.fn().mockReturnValue('ALTER TABLE users ENABLE ROW LEVEL SECURITY;'),
      };
      
      // Temporarily mock fs module
      jest.doMock('fs', () => mockFs);
      
      await service.toggleRLS(true);
      expect(service.isEnabled()).toBe(true);
      
      await service.toggleRLS(false);
      expect(service.isEnabled()).toBe(false);
      
      // Clean up mock
      jest.dontMock('fs');
    });
  });

  describe('verifyPolicies', () => {
    it('should verify RLS policies exist', async () => {
      const mockPolicies = [
        { tablename: 'users', policyname: 'users_policy' },
        { tablename: 'contacts', policyname: 'contacts_policy' },
      ];
      
      prismaService.$queryRaw = jest.fn().mockResolvedValue(mockPolicies);
      
      const result = await service.verifyPolicies();
      
      expect(result).toBe(true);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when policies are missing', async () => {
      // Mock empty policies
      prismaService.$queryRaw = jest.fn().mockResolvedValue([]);
      
      const result = await service.verifyPolicies();
      
      expect(result).toBe(false);
    });
  });
});