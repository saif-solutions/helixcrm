import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../../../src/modules/dashboard/dashboard.service';

// Mock the guards
jest.mock('../../../src/shared/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/tenant.guard', () => ({
  TenantGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

// Mock service
const mockDashboardService = {
  getStats: jest.fn(),
};

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: typeof mockDashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    const mockRequest = {
      user: { sub: 'user-123' },
    };

    const mockStats = {
      data: {
        summary: {
          deals: 25,
          contacts: 150,
          leads: 75,
        },
        recentDeals: [],
        recentActivities: [],
      },
    };

    it('should successfully return dashboard stats', async () => {
      dashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockRequest as any);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', mockStats);
      expect(result).toHaveProperty('timestamp');
      expect(dashboardService.getStats).toHaveBeenCalled();
    });

    it('should handle stats with different data structures', async () => {
      // Test with stats that have direct properties
      const directStats = {
        deals: 25,
        contacts: 150,
        leads: 75,
      };
      dashboardService.getStats.mockResolvedValue(directStats);

      const result = await controller.getStats(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(directStats);
    });

    it('should handle stats with data property only', async () => {
      const dataOnlyStats = {
        data: {
          deals: 25,
          contacts: 150,
          leads: 75,
        },
      };
      dashboardService.getStats.mockResolvedValue(dataOnlyStats);

      const result = await controller.getStats(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(dataOnlyStats);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      dashboardService.getStats.mockRejectedValue(error);

      await expect(controller.getStats(mockRequest as any)).rejects.toThrow('Database error');
    });

    it('should log the request', async () => {
      const loggerSpy = jest.spyOn((controller as any).logger, 'log');
      dashboardService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(mockRequest as any);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching dashboard stats',
        expect.objectContaining({
          userId: 'user-123',
          event: 'dashboard_stats_request',
        })
      );
    });

    it('should log debug info with counts', async () => {
      const debugSpy = jest.spyOn((controller as any).logger, 'debug');
      dashboardService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(mockRequest as any);

      expect(debugSpy).toHaveBeenCalledWith(
        'Dashboard stats retrieved',
        expect.objectContaining({
          userId: 'user-123',
          dealsCount: 25,
          contactsCount: 150,
          leadsCount: 75,
        })
      );
    });

    it('should handle stats with zero counts', async () => {
      const zeroStats = {
        data: {
          summary: {
            deals: 0,
            contacts: 0,
            leads: 0,
          },
        },
      };
      dashboardService.getStats.mockResolvedValue(zeroStats);

      const result = await controller.getStats(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(zeroStats);
    });

    it('should handle null stats', async () => {
      dashboardService.getStats.mockResolvedValue(null);

      const result = await controller.getStats(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getDashboardHealth', () => {
    const mockRequest = {
      user: { sub: 'user-123' },
    };

    const mockStats = {
      data: {
        summary: {
          deals: 25,
          contacts: 150,
          leads: 75,
        },
      },
    };

    it('should return healthy status when stats are available', async () => {
      dashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getDashboardHealth(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'healthy');
      expect(result.data.components).toEqual({
        database: 'connected',
        statsService: 'operational',
      });
      expect(result).toHaveProperty('uptime');
    });

    it('should return degraded status when stats are null', async () => {
      dashboardService.getStats.mockResolvedValue(null);

      const result = await controller.getDashboardHealth(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'degraded');
      expect(result.data.components).toEqual({
        database: 'error',
        statsService: 'error',
      });
    });

    it('should return degraded status when stats throw error', async () => {
      const error = new Error('Service error');
      dashboardService.getStats.mockRejectedValue(error);

      const result = await controller.getDashboardHealth(mockRequest as any);

      expect(result.success).toBe(false);
      expect(result.data).toHaveProperty('status', 'degraded');
      expect(result.data).toHaveProperty('error', 'Service error');
    });

    it('should log health check errors', async () => {
      const loggerSpy = jest.spyOn((controller as any).logger, 'error');
      const error = new Error('Service error');
      dashboardService.getStats.mockRejectedValue(error);

      await controller.getDashboardHealth(mockRequest as any);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dashboard health check failed'),
        expect.any(Object)
      );
    });
  });
});