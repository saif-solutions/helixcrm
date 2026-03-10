import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../../src/modules/analytics/analytics.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { AuditLogService } from '../../../src/shared/audit-log/audit-log.service';
import { AppLogger } from '../../../src/shared/logging/logger.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getQueueToken } from '@nestjs/bullmq';
import { TenantContextService } from '../../../src/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../../src/shared/permissions/context/permission-context.service';
import { AnalyticsRepository } from '../../../src/modules/analytics/repositories/analytics.repository';
import { AnalyticsSummaryRepository } from '../../../src/modules/analytics/repositories/analytics-summary.repository';
import { AnalyticsSummaryService } from '../../../src/modules/analytics/services/analytics-summary.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { 
  DealAnalyticsQueryDto, 
  RevenueAnalyticsQueryDto, 
  PipelineAnalyticsQueryDto, 
  ActivityAnalyticsQueryDto,
  AnalyticsExportQueryDto,
  ExportFormat,
  AnalyticsGroupBy
} from '../../../src/modules/analytics/dto/analytics-query.dto';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockAuditLogService = {
  logEvent: jest.fn(),
};

const mockAppLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('true'),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockExportQueue = {
  add: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
  getUserId: jest.fn().mockReturnValue('user-123'),
};

// Create a permission context that we can control per test
const mockPermissionContext = {
  hasPermission: jest.fn(),
};

const mockAnalyticsRepository = {
  getDealAnalyticsFromOperational: jest.fn(),
  getRevenueAnalyticsFromOperational: jest.fn(),
  getPipelineAnalyticsFromOperational: jest.fn(),
  getActivityAnalyticsFromOperational: jest.fn(),
  getAvailableExports: jest.fn(),
};

const mockAnalyticsSummaryRepository = {
  getDealAnalyticsFromSummary: jest.fn(),
  getRevenueAnalyticsFromSummary: jest.fn(),
};

const mockAnalyticsSummaryService = {};

// Mock data
const createMockDealAnalytics = () => ({
  totalDeals: 100,
  totalValue: 1000000,
  wonDeals: 40,
  wonValue: 600000,
  lostDeals: 20,
  lostValue: 150000,
  openDeals: 40,
  openValue: 250000,
  averageDealSize: 10000,
  winRate: 40,
  byStage: [
    { stage: 'Qualification', count: 30, value: 200000 },
    { stage: 'Proposal', count: 25, value: 300000 },
    { stage: 'Negotiation', count: 15, value: 250000 },
  ],
  byOwner: [
    { owner: 'user-1', count: 40, value: 400000 },
    { owner: 'user-2', count: 35, value: 350000 },
    { owner: 'user-3', count: 25, value: 250000 },
  ],
  trend: [
    { period: '2024-01', count: 10, value: 100000 },
    { period: '2024-02', count: 15, value: 150000 },
    { period: '2024-03', count: 20, value: 200000 },
  ],
});

const createMockRevenueAnalytics = () => ({
  totalRevenue: 1000000,
  recurringRevenue: 600000,
  oneTimeRevenue: 400000,
  byMonth: [
    { month: '2024-01', amount: 300000 },
    { month: '2024-02', amount: 350000 },
    { month: '2024-03', amount: 350000 },
  ],
  byQuarter: [
    { quarter: 'Q1-2024', amount: 1000000 },
  ],
  byProduct: [
    { product: 'Product A', amount: 500000 },
    { product: 'Product B', amount: 300000 },
    { product: 'Product C', amount: 200000 },
  ],
});

const createMockPipelineAnalytics = () => ({
  stages: [
    { name: 'Qualification', dealCount: 30, totalValue: 200000, averageTime: 5 },
    { name: 'Proposal', dealCount: 25, totalValue: 300000, averageTime: 7 },
    { name: 'Negotiation', dealCount: 15, totalValue: 250000, averageTime: 10 },
  ],
  conversionRates: [
    { fromStage: 'Qualification', toStage: 'Proposal', rate: 80 },
    { fromStage: 'Proposal', toStage: 'Negotiation', rate: 60 },
    { fromStage: 'Negotiation', toStage: 'Won', rate: 70 },
  ],
  averageDealTime: 22,
});

const createMockActivityAnalytics = () => ({
  totalActivities: 500,
  byType: [
    { type: 'call', count: 150 },
    { type: 'email', count: 200 },
    { type: 'meeting', count: 100 },
    { type: 'task', count: 50 },
  ],
  byUser: [
    { user: 'user-1', count: 180 },
    { user: 'user-2', count: 170 },
    { user: 'user-3', count: 150 },
  ],
  trend: [
    { period: '2024-01', count: 150 },
    { period: '2024-02', count: 170 },
    { period: '2024-03', count: 180 },
  ],
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: typeof mockPrismaService;
  let auditLog: typeof mockAuditLogService;
  let logger: typeof mockAppLogger;
  let configService: typeof mockConfigService;
  let cacheManager: typeof mockCacheManager;
  let tenantContext: typeof mockTenantContext;
  let permissionContext: typeof mockPermissionContext;
  let analyticsRepository: typeof mockAnalyticsRepository;
  let analyticsSummaryRepository: typeof mockAnalyticsSummaryRepository;
  let exportQueue: typeof mockExportQueue;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default permission to true for most tests
    mockPermissionContext.hasPermission.mockReturnValue(true);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AppLogger, useValue: mockAppLogger },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('analytics-export'), useValue: mockExportQueue },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
        { provide: AnalyticsSummaryRepository, useValue: mockAnalyticsSummaryRepository },
        { provide: AnalyticsSummaryService, useValue: mockAnalyticsSummaryService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get(PrismaService);
    auditLog = module.get(AuditLogService);
    logger = module.get(AppLogger);
    configService = module.get(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);
    tenantContext = module.get(TenantContextService);
    permissionContext = module.get(PermissionContextService);
    analyticsRepository = module.get(AnalyticsRepository);
    analyticsSummaryRepository = module.get(AnalyticsSummaryRepository);
    exportQueue = module.get(getQueueToken('analytics-export'));

    prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
  });

describe('getDealAnalytics', () => {
  const query: DealAnalyticsQueryDto = {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    groupBy: AnalyticsGroupBy.MONTH,
    pipelineId: 'pipeline-123',
    stageId: 'stage-123',
  };

  const dealMockResult = createMockDealAnalytics();

  it('should return deal analytics from summary tables', async () => {
    // Create a fresh service with summary tables enabled
    configService.get.mockReturnValue('true');
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AppLogger, useValue: mockAppLogger },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('analytics-export'), useValue: mockExportQueue },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
        { provide: AnalyticsSummaryRepository, useValue: mockAnalyticsSummaryRepository },
        { provide: AnalyticsSummaryService, useValue: mockAnalyticsSummaryService },
      ],
    }).compile();

    const freshService = module.get<AnalyticsService>(AnalyticsService);
    
    analyticsSummaryRepository.getDealAnalyticsFromSummary.mockResolvedValue(dealMockResult);

    const result = await freshService.getDealAnalytics(query);

    expect(result).toEqual({
      ...dealMockResult,
      source: 'summary-tables',
    });
    expect(analyticsSummaryRepository.getDealAnalyticsFromSummary).toHaveBeenCalledWith(query);
    expect(analyticsRepository.getDealAnalyticsFromOperational).not.toHaveBeenCalled();
  });

  it('should fall back to operational tables if summary fails', async () => {
    configService.get.mockReturnValue('true');
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AppLogger, useValue: mockAppLogger },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('analytics-export'), useValue: mockExportQueue },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
        { provide: AnalyticsSummaryRepository, useValue: mockAnalyticsSummaryRepository },
        { provide: AnalyticsSummaryService, useValue: mockAnalyticsSummaryService },
      ],
    }).compile();

    const freshService = module.get<AnalyticsService>(AnalyticsService);
    
    analyticsSummaryRepository.getDealAnalyticsFromSummary.mockRejectedValue(new Error('Summary error'));
    analyticsRepository.getDealAnalyticsFromOperational.mockResolvedValue(dealMockResult);

    const result = await freshService.getDealAnalytics(query);

    expect(result).toEqual({
      ...dealMockResult,
      source: 'operational-tables',
    });
    expect(analyticsSummaryRepository.getDealAnalyticsFromSummary).toHaveBeenCalled();
    expect(analyticsRepository.getDealAnalyticsFromOperational).toHaveBeenCalledWith(query);
  });

  it('should use operational tables directly when summary tables disabled', async () => {
    configService.get.mockReturnValue('false');
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AppLogger, useValue: mockAppLogger },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: getQueueToken('analytics-export'), useValue: mockExportQueue },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
        { provide: AnalyticsSummaryRepository, useValue: mockAnalyticsSummaryRepository },
        { provide: AnalyticsSummaryService, useValue: mockAnalyticsSummaryService },
      ],
    }).compile();

    const freshService = module.get<AnalyticsService>(AnalyticsService);
    
    analyticsRepository.getDealAnalyticsFromOperational.mockResolvedValue(dealMockResult);

    const result = await freshService.getDealAnalytics(query);

    expect(result).toEqual({
      ...dealMockResult,
      source: 'operational-tables',
    });
    expect(analyticsRepository.getDealAnalyticsFromOperational).toHaveBeenCalledWith(query);
    expect(analyticsSummaryRepository.getDealAnalyticsFromSummary).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if user lacks permission', async () => {
    permissionContext.hasPermission.mockReturnValue(false);

    await expect(service.getDealAnalytics(query)).rejects.toThrow(ForbiddenException);
    expect(analyticsRepository.getDealAnalyticsFromOperational).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException on repository error', async () => {
    // Make sure permission check passes
    permissionContext.hasPermission.mockReturnValue(true);
    analyticsRepository.getDealAnalyticsFromOperational.mockRejectedValue(new Error('Database error'));

    await expect(service.getDealAnalytics(query)).rejects.toThrow(BadRequestException);
  });
});

  describe('getRevenueAnalytics', () => {
    const query: RevenueAnalyticsQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      groupBy: AnalyticsGroupBy.MONTH,
    };

    const mockResult = createMockRevenueAnalytics();



    it('should fall back to operational tables if summary fails', async () => {
      configService.get.mockReturnValue('true');
      analyticsSummaryRepository.getRevenueAnalyticsFromSummary.mockRejectedValue(new Error('Summary error'));
      analyticsRepository.getRevenueAnalyticsFromOperational.mockResolvedValue(mockResult);

      const result = await service.getRevenueAnalytics(query);

      expect(result).toEqual({
        ...mockResult,
        source: 'operational-tables',
      });
      expect(analyticsRepository.getRevenueAnalyticsFromOperational).toHaveBeenCalledWith(query);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getRevenueAnalytics(query)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPipelineAnalytics', () => {
    const query: PipelineAnalyticsQueryDto = {
      pipelineId: 'pipeline-123',
    };

    const mockResult = createMockPipelineAnalytics();

    it('should return pipeline analytics from operational tables', async () => {
      analyticsRepository.getPipelineAnalyticsFromOperational.mockResolvedValue(mockResult);

      const result = await service.getPipelineAnalytics(query);

      expect(result).toEqual({
        ...mockResult,
        source: 'operational-tables',
      });
      expect(analyticsRepository.getPipelineAnalyticsFromOperational).toHaveBeenCalledWith(query);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getPipelineAnalytics(query)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActivityAnalytics', () => {
    const query: ActivityAnalyticsQueryDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: ['call', 'email'] as any,
      userId: 'user-123',
    };

    const mockResult = createMockActivityAnalytics();

    it('should return activity analytics from operational tables', async () => {
      analyticsRepository.getActivityAnalyticsFromOperational.mockResolvedValue(mockResult);

      const result = await service.getActivityAnalytics(query);

      expect(result).toEqual({
        ...mockResult,
        source: 'operational-tables',
      });
      expect(analyticsRepository.getActivityAnalyticsFromOperational).toHaveBeenCalledWith(query);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getActivityAnalytics(query)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createAnalyticsExport', () => {
    const query: AnalyticsExportQueryDto = {
      format: ExportFormat.CSV,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      include: [],
    };

    const mockAvailableExports = [
      { id: 'export-1', name: 'Deal Analytics', type: 'deal' },
      { id: 'export-2', name: 'Revenue Analytics', type: 'revenue' },
    ];

    it('should create an export job', async () => {
      // Set export permission to true
      permissionContext.hasPermission.mockImplementation((perm) => {
        if (perm === 'report:export') return true;
        return true;
      });
      
      analyticsRepository.getAvailableExports.mockResolvedValue(mockAvailableExports);

      const result = await service.createAnalyticsExport(query);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
      expect(result).toHaveProperty('message');
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user lacks export permission', async () => {
      permissionContext.hasPermission.mockImplementation((perm) => {
        if (perm === 'report:export') return false;
        return true;
      });

      await expect(service.createAnalyticsExport(query)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if export queue not available', async () => {
      // Override the module to have no export queue
      const moduleWithoutQueue = await Test.createTestingModule({
        providers: [
          AnalyticsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AuditLogService, useValue: mockAuditLogService },
          { provide: AppLogger, useValue: mockAppLogger },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CACHE_MANAGER, useValue: mockCacheManager },
          { provide: TenantContextService, useValue: mockTenantContext },
          { provide: PermissionContextService, useValue: mockPermissionContext },
          { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
          { provide: AnalyticsSummaryRepository, useValue: mockAnalyticsSummaryRepository },
          { provide: AnalyticsSummaryService, useValue: mockAnalyticsSummaryService },
        ],
      }).compile();

      const serviceWithoutQueue = moduleWithoutQueue.get<AnalyticsService>(AnalyticsService);
      
      // Set permission to true
      mockPermissionContext.hasPermission.mockReturnValue(true);

      await expect(serviceWithoutQueue.createAnalyticsExport(query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExportStatus', () => {
    it('should return export status', async () => {
      permissionContext.hasPermission.mockReturnValue(true);
      
      const result = await service.getExportStatus('export-123');

      expect(result).toHaveProperty('jobId', 'export-123');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('createdAt');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getExportStatus('export-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadExport', () => {
    it('should return export data', async () => {
      permissionContext.hasPermission.mockImplementation((perm) => {
        if (perm === 'report:export') return true;
        return true;
      });

      const result = await service.downloadExport('export-123', 'token-export-123');

      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('data');
    });

    it('should throw ForbiddenException if user lacks export permission', async () => {
      permissionContext.hasPermission.mockImplementation((perm) => {
        if (perm === 'report:export') return false;
        return true;
      });

      await expect(service.downloadExport('export-123', 'token-export-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if token invalid', async () => {
      permissionContext.hasPermission.mockImplementation((perm) => {
        if (perm === 'report:export') return true;
        return true;
      });

      await expect(service.downloadExport('export-123', 'invalid-token')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAvailableExports', () => {
    const query: AnalyticsExportQueryDto = {
      format: ExportFormat.CSV,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      include: [],
    };

    const mockExports = [
      { id: 'export-1', name: 'Export 1', createdAt: new Date() },
      { id: 'export-2', name: 'Export 2', createdAt: new Date() },
    ];

    it('should return available exports', async () => {
      permissionContext.hasPermission.mockReturnValue(true);
      analyticsRepository.getAvailableExports.mockResolvedValue(mockExports);

      const result = await service.getAvailableExports(query);

      expect(result).toEqual(mockExports);
      expect(analyticsRepository.getAvailableExports).toHaveBeenCalledWith(query, 'org-123', 'user-123');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getAvailableExports(query)).rejects.toThrow(ForbiddenException);
    });
  });
});