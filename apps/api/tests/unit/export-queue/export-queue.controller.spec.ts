import { Test, TestingModule } from '@nestjs/testing';
import { ExportQueueController } from '../../../src/modules/export-queue/export-queue.controller';
import { ExportQueueService } from '../../../src/modules/export-queue/export-queue.service';

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
const mockExportQueueService = {
  requestExport: jest.fn(),
  getJobStatus: jest.fn(),
  listUserJobs: jest.fn(),
  cancelJob: jest.fn(),
  downloadExport: jest.fn(),
  cleanupOldJobs: jest.fn(),
};

describe('ExportQueueController', () => {
  let controller: ExportQueueController;
  let exportQueueService: typeof mockExportQueueService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportQueueController],
      providers: [
        { provide: ExportQueueService, useValue: mockExportQueueService },
      ],
    }).compile();

    controller = module.get<ExportQueueController>(ExportQueueController);
    exportQueueService = module.get(ExportQueueService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestExport', () => {
    const requestDto = {
      exportType: 'contacts' as const,
      format: 'csv' as const,
      filters: { status: 'active' },
      options: {
        includeArchived: false,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      },
    };

    const mockResult = {
      jobId: 'export-123',
      status: 'queued',
      message: 'Export job queued successfully',
    };

    it('should successfully request an export', async () => {
      exportQueueService.requestExport.mockResolvedValue(mockResult);

      const result = await controller.requestExport(requestDto);

      expect(result).toEqual(mockResult);
      expect(exportQueueService.requestExport).toHaveBeenCalledWith(
        requestDto.exportType,
        requestDto.format,
        requestDto.filters,
        requestDto.options,
      );
    });

    it('should handle different export types', async () => {
      const types = ['contacts', 'deals', 'leads', 'all'] as const;

      for (const exportType of types) {
        const dto = { ...requestDto, exportType };
        exportQueueService.requestExport.mockResolvedValue({
          ...mockResult,
          exportType,
        });

        await controller.requestExport(dto);

        expect(exportQueueService.requestExport).toHaveBeenCalledWith(
          exportType,
          requestDto.format,
          requestDto.filters,
          requestDto.options,
        );
      }
    });

    it('should handle different formats', async () => {
      const formats = ['csv', 'excel', 'pdf'] as const;

      for (const format of formats) {
        const dto = { ...requestDto, format };
        exportQueueService.requestExport.mockResolvedValue({
          ...mockResult,
          format,
        });

        await controller.requestExport(dto);

        expect(exportQueueService.requestExport).toHaveBeenCalledWith(
          requestDto.exportType,
          format,
          requestDto.filters,
          requestDto.options,
        );
      }
    });

    it('should handle request without options', async () => {
      const dtoWithoutOptions = {
        exportType: 'contacts' as const,
        format: 'csv' as const,
      };

      exportQueueService.requestExport.mockResolvedValue(mockResult);

      await controller.requestExport(dtoWithoutOptions);

      expect(exportQueueService.requestExport).toHaveBeenCalledWith(
        dtoWithoutOptions.exportType,
        dtoWithoutOptions.format,
        undefined,
        undefined,
      );
    });
  });

  describe('getJobStatus', () => {
    const jobId = 'export-123';
    const mockStatus = {
      jobId,
      status: 'processing',
      progress: 50,
      createdAt: new Date(),
    };

    it('should return job status', async () => {
      exportQueueService.getJobStatus.mockResolvedValue(mockStatus);

      const result = await controller.getJobStatus(jobId);

      expect(result).toEqual(mockStatus);
      expect(exportQueueService.getJobStatus).toHaveBeenCalledWith(jobId);
    });
  });

  describe('listUserJobs', () => {
    const mockJobs = {
      data: [
        { jobId: 'job-1', status: 'completed' },
        { jobId: 'job-2', status: 'processing' },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1 },
    };

    it('should list jobs with default pagination', async () => {
      exportQueueService.listUserJobs.mockResolvedValue(mockJobs);

      const result = await controller.listUserJobs(1, 20);

      expect(result).toEqual(mockJobs);
      expect(exportQueueService.listUserJobs).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should list jobs with status filter', async () => {
      exportQueueService.listUserJobs.mockResolvedValue(mockJobs);

      await controller.listUserJobs(1, 20, 'completed');

      expect(exportQueueService.listUserJobs).toHaveBeenCalledWith(
        1,
        20,
        'completed',
      );
    });

    it('should handle custom pagination', async () => {
      exportQueueService.listUserJobs.mockResolvedValue(mockJobs);

      await controller.listUserJobs(2, 50, 'processing');

      expect(exportQueueService.listUserJobs).toHaveBeenCalledWith(
        2,
        50,
        'processing',
      );
    });
  });

  describe('cancelJob', () => {
    const jobId = 'export-123';
    const mockResult = { message: 'Job cancelled successfully' };

    it('should cancel a job', async () => {
      exportQueueService.cancelJob.mockResolvedValue(mockResult);

      const result = await controller.cancelJob(jobId);

      expect(result).toEqual(mockResult);
      expect(exportQueueService.cancelJob).toHaveBeenCalledWith(jobId);
    });
  });

  describe('downloadExport', () => {
    const jobId = 'export-123';
    const mockResult = {
      filename: 'export-123.csv',
      url: '/downloads/export-123.csv',
      expiresAt: new Date(),
    };

    it('should get download info', async () => {
      exportQueueService.downloadExport.mockResolvedValue(mockResult);

      const result = await controller.downloadExport(jobId);

      expect(result).toEqual(mockResult);
      expect(exportQueueService.downloadExport).toHaveBeenCalledWith(jobId);
    });
  });

  describe('cleanupOldJobs', () => {
    const mockResult = { deleted: 15, message: 'Cleanup completed' };

    it('should cleanup old jobs with default days', async () => {
      exportQueueService.cleanupOldJobs.mockResolvedValue(mockResult);

      const result = await controller.cleanupOldJobs();

      expect(result).toEqual(mockResult);
      expect(exportQueueService.cleanupOldJobs).toHaveBeenCalledWith(30);
    });

    it('should cleanup old jobs with specified days', async () => {
      exportQueueService.cleanupOldJobs.mockResolvedValue(mockResult);

      const result = await controller.cleanupOldJobs(60);

      expect(result).toEqual(mockResult);
      expect(exportQueueService.cleanupOldJobs).toHaveBeenCalledWith(60);
    });
  });
});
