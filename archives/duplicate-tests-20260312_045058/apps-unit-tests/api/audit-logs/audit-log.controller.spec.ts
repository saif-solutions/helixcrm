import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from '../../../src/modules/audit-logs/presentation/controllers/audit-log.controller';
import { AuditLogQueryService } from '../../../src/modules/audit-logs/application/services/audit-log-query.service';
import { BadRequestException } from '@nestjs/common';

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
const mockAuditLogQueryService = {
  getAuditLogs: jest.fn(),
  getAuditStatistics: jest.fn(),
  getAvailableActions: jest.fn(),
  getAvailableEntityTypes: jest.fn(),
  getAvailableSeverityLevels: jest.fn(),
  getAvailableActorTypes: jest.fn(),
};

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let auditLogQueryService: typeof mockAuditLogQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogQueryService, useValue: mockAuditLogQueryService }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    auditLogQueryService = module.get(AuditLogQueryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuditLogs', () => {
    const mockRequest = {
      user: { organizationId: 'org-123' },
    };

    const mockResponse = {
      data: [
        {
          id: 'log-1',
          action: 'LOGIN_SUCCESS',
          entityType: 'USER',
          actorEmail: 'user@example.com',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'log-2',
          action: 'DEAL_CREATED',
          entityType: 'DEAL',
          actorEmail: 'user2@example.com',
          createdAt: new Date('2024-01-02'),
        },
      ],
      meta: {
        page: 1,
        limit: 25,
        total: 2,
        pages: 1,
      },
    };

    it('should return audit logs with default params', async () => {
      auditLogQueryService.getAuditLogs.mockResolvedValue(mockResponse);

      const result = await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        actorEmail: undefined,
        search: undefined,
      });
    });

    it('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        startDate,
        endDate,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        actorEmail: undefined,
        search: undefined,
      });
    });

    it('should filter by action', async () => {
      await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        undefined,
        undefined,
        'LOGIN_SUCCESS',
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        action: 'LOGIN_SUCCESS',
        actorEmail: undefined,
        search: undefined,
      });
    });

    it('should filter by entity type', async () => {
      await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        undefined,
        undefined,
        undefined,
        'DEAL',
        undefined,
        undefined,
        undefined,
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        entityType: 'DEAL',
        actorEmail: undefined,
        search: undefined,
      });
    });

    it('should filter by actor email', async () => {
      await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        undefined,
        undefined,
        undefined,
        undefined,
        'user@example.com',
        undefined,
        undefined,
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        actorEmail: 'user@example.com',
        search: undefined,
      });
    });

    it('should filter by severity', async () => {
      await controller.getAuditLogs(
        mockRequest,
        1,
        25,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'HIGH',
        undefined,
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        severity: 'HIGH',
        actorEmail: undefined,
        search: undefined,
      });
    });

    it('should filter by search term', async () => {
      await controller.getAuditLogs(
        mockRequest,
        1, // page
        25, // limit
        undefined, // startDate
        undefined, // endDate
        undefined, // action
        undefined, // entityType
        undefined, // actorEmail
        undefined, // severity
        undefined, // actorType
        'test', // search - this should be the 10th parameter
      );

      expect(auditLogQueryService.getAuditLogs).toHaveBeenCalledWith({
        organizationId: 'org-123',
        page: 1,
        limit: 25,
        startDate: undefined,
        endDate: undefined,
        action: undefined,
        entityType: undefined,
        actorEmail: undefined,
        severity: undefined,
        actorType: undefined,
        search: 'test',
      });
    });

    it('should throw BadRequestException if organization ID missing', async () => {
      const requestWithoutOrg = { user: {} };

      await expect(
        controller.getAuditLogs(
          requestWithoutOrg,
          1,
          25,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if start date invalid', async () => {
      await expect(
        controller.getAuditLogs(
          mockRequest,
          1,
          25,
          'invalid-date',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end date invalid', async () => {
      await expect(
        controller.getAuditLogs(
          mockRequest,
          1,
          25,
          '2024-01-01',
          'invalid-date',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if start date after end date', async () => {
      await expect(
        controller.getAuditLogs(
          mockRequest,
          1,
          25,
          '2024-02-01',
          '2024-01-01',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    const mockRequest = {
      user: { organizationId: 'org-123' },
    };

    const mockStats = {
      totalEvents: 1000,
      uniqueUsers: 50,
      topActions: [
        { action: 'LOGIN_SUCCESS', count: 500 },
        { action: 'DEAL_CREATED', count: 300 },
      ],
      bySeverity: {
        LOW: 400,
        MEDIUM: 350,
        HIGH: 200,
        CRITICAL: 50,
      },
    };

    it('should return audit statistics', async () => {
      auditLogQueryService.getAuditStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(auditLogQueryService.getAuditStatistics).toHaveBeenCalledWith('org-123', 30);
    });

    it('should throw BadRequestException if organization ID missing', async () => {
      const requestWithoutOrg = { user: {} };

      await expect(controller.getStats(requestWithoutOrg)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableFilters', () => {
    const mockActions = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'DEAL_CREATED'];
    const mockEntityTypes = ['USER', 'DEAL', 'LEAD'];
    const mockSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const mockActorTypes = ['USER', 'SYSTEM', 'API'];

    it('should return available filter options', async () => {
      auditLogQueryService.getAvailableActions.mockResolvedValue(mockActions);
      auditLogQueryService.getAvailableEntityTypes.mockResolvedValue(mockEntityTypes);
      auditLogQueryService.getAvailableSeverityLevels.mockResolvedValue(mockSeverities);
      auditLogQueryService.getAvailableActorTypes.mockResolvedValue(mockActorTypes);

      const result = await controller.getAvailableFilters();

      expect(result).toEqual({
        success: true,
        data: {
          actions: mockActions,
          entityTypes: mockEntityTypes,
          severityLevels: mockSeverities,
          actorTypes: mockActorTypes,
        },
      });
    });
  });

  describe('exportAuditLogs', () => {
    const mockRequest = {
      user: { organizationId: 'org-123' },
    };
    const mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    it('should set CSV headers and send data', async () => {
      await controller.exportAuditLogs(mockRequest, mockResponse as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=audit-logs-'),
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw BadRequestException if organization ID missing', async () => {
      const requestWithoutOrg = { user: {} };

      await expect(
        controller.exportAuditLogs(requestWithoutOrg, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
