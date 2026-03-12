import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { TenantContextService } from '../../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { AppLogger } from '../../../shared/logging/logger.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;
  let dashboardRepository: DashboardRepository;
  let permissionContext: PermissionContextService;
  let tenantContext: TenantContextService;

  const mockDashboardRepository = {
    getLeadCount: jest.fn(),
    getContactCount: jest.fn(),
    getDealCount: jest.fn(),
    getDealValueSum: jest.fn(),
    getDefaultPipelineWithStats: jest.fn(),
    getDealStatusDistribution: jest.fn(),
  };

  const mockPermissionContext = {
    hasPermission: jest.fn(),
  };

  const mockTenantContext = {
    getTenantId: jest.fn(),
    getUserId: jest.fn(),
  };

  const mockAuditLogService = {
    logEvent: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: mockDashboardRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AppLogger, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    dashboardRepository = module.get<DashboardRepository>(DashboardRepository);
    permissionContext = module.get<PermissionContextService>(
      PermissionContextService,
    );
    tenantContext = module.get<TenantContextService>(TenantContextService);

    // Setup default mocks
    mockPermissionContext.hasPermission.mockReturnValue(true);
    mockTenantContext.getTenantId.mockReturnValue('test-org-123');
    mockTenantContext.getUserId.mockReturnValue('test-user-456');
    mockPrismaService.user.findUnique.mockResolvedValue({
      email: 'test@example.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should throw ForbiddenException if user lacks dashboard.read permission', async () => {
      // Arrange
      mockPermissionContext.hasPermission.mockReturnValue(false);

      // Act & Assert
      await expect(service.getStats()).rejects.toThrow(ForbiddenException);
      expect(mockPermissionContext.hasPermission).toHaveBeenCalledWith(
        'dashboard.read',
      );
    });

    it('should return dashboard stats when permission is granted', async () => {
      // Arrange
      const mockStats = {
        leads: 10,
        contacts: 20,
        deals: 5,
        dealValue: { _sum: { amount: 10000 } },
        defaultPipeline: {
          id: 'pipeline-123',
          name: 'Default Pipeline',
          _count: { deals: 5 },
          stages: [
            {
              id: 'stage-1',
              name: 'Lead',
              order: 1,
              probability: 10,
              _count: { deals: 2 },
            },
          ],
        },
        statusStats: [
          { status: 'won', _count: { id: 3 } },
          { status: 'lost', _count: { id: 2 } },
        ],
      };

      mockDashboardRepository.getLeadCount.mockResolvedValue(mockStats.leads);
      mockDashboardRepository.getContactCount.mockResolvedValue(
        mockStats.contacts,
      );
      mockDashboardRepository.getDealCount.mockResolvedValue(mockStats.deals);
      mockDashboardRepository.getDealValueSum.mockResolvedValue(
        mockStats.dealValue,
      );
      mockDashboardRepository.getDefaultPipelineWithStats.mockResolvedValue(
        mockStats.defaultPipeline,
      );
      mockDashboardRepository.getDealStatusDistribution.mockResolvedValue(
        mockStats.statusStats,
      );

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('summary');
      expect(result.data.summary).toHaveProperty('leads', 10);
      expect(result.data.summary).toHaveProperty('contacts', 20);
      expect(result.data.summary).toHaveProperty('deals', 5);
      expect(result.data.summary).toHaveProperty('totalWonValue', 10000);
      expect(result.data.summary).toHaveProperty('averageDealValue', 2000); // 10000 / 5

      // Verify repository methods were called
      expect(mockDashboardRepository.getLeadCount).toHaveBeenCalled();
      expect(mockDashboardRepository.getContactCount).toHaveBeenCalled();
      expect(mockDashboardRepository.getDealCount).toHaveBeenCalled();
      expect(mockDashboardRepository.getDealValueSum).toHaveBeenCalled();
      expect(
        mockDashboardRepository.getDefaultPipelineWithStats,
      ).toHaveBeenCalled();
      expect(
        mockDashboardRepository.getDealStatusDistribution,
      ).toHaveBeenCalled();
    });

    it('should handle missing default pipeline gracefully', async () => {
      // Arrange
      mockDashboardRepository.getLeadCount.mockResolvedValue(5);
      mockDashboardRepository.getContactCount.mockResolvedValue(10);
      mockDashboardRepository.getDealCount.mockResolvedValue(3);
      mockDashboardRepository.getDealValueSum.mockResolvedValue({
        _sum: { amount: 5000 },
      });
      mockDashboardRepository.getDefaultPipelineWithStats.mockResolvedValue(
        null,
      );
      mockDashboardRepository.getDealStatusDistribution.mockResolvedValue([]);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.data.pipeline).toBeNull();
      expect(result.data.dealStatus).toEqual({});
    });

    it('should log performance metrics after execution', async () => {
      // Arrange
      mockDashboardRepository.getLeadCount.mockResolvedValue(1);
      mockDashboardRepository.getContactCount.mockResolvedValue(2);
      mockDashboardRepository.getDealCount.mockResolvedValue(3);
      mockDashboardRepository.getDealValueSum.mockResolvedValue({
        _sum: { amount: 1000 },
      });
      mockDashboardRepository.getDefaultPipelineWithStats.mockResolvedValue(
        null,
      );
      mockDashboardRepository.getDealStatusDistribution.mockResolvedValue([]);

      // Act
      await service.getStats();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Dashboard.getStats completed in'),
        expect.objectContaining({
          duration: expect.any(Number),
          organizationId: 'test-org-123',
          userId: 'test-user-456',
          performance: expect.stringMatching(/normal|slow|warning/),
        }),
      );
    });
  });
});
