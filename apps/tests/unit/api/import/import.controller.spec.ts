import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from '../../../src/modules/import/import.controller';
import { ImportService } from '../../../src/modules/import/import.service';
import { CreateImportJobDto, ImportType, ImportSource } from '../../../src/modules/import/dto/create-import-job.dto';

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

// Mock service
const mockImportService = {
  createImportJob: jest.fn(),
  getImportJobs: jest.fn(),
};

describe('ImportController', () => {
  let controller: ImportController;
  let importService: typeof mockImportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportService, useValue: mockImportService },
      ],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    importService = module.get(ImportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createImportJob', () => {
    const mockRequest = {
      user: { id: 'user-123', sub: 'user-123' },
    };

    // Create DTO with proper enum values
    const createDto: CreateImportJobDto = {
      type: ImportType.CONTACTS,
      source: ImportSource.CSV,
      fileName: 'contacts-import.csv',
      fileSize: 1024,
      fileUrl: 'https://storage.example.com/contacts-import.csv',
      fieldMapping: {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email_address',
      },
      dryRun: false,
    };

    const mockResult = {
      id: 'import-123',
      status: 'pending',
      createdAt: new Date(),
    };

    it('should successfully create an import job with user.id', async () => {
      const requestWithId = { user: { id: 'user-123' } };
      importService.createImportJob.mockResolvedValue(mockResult);

      const result = await controller.createImportJob(createDto, requestWithId as any);

      expect(result).toEqual(mockResult);
      expect(importService.createImportJob).toHaveBeenCalledWith(createDto, 'user-123');
    });

    it('should successfully create an import job with user.sub', async () => {
      const requestWithSub = { user: { sub: 'user-456' } };
      importService.createImportJob.mockResolvedValue(mockResult);

      const result = await controller.createImportJob(createDto, requestWithSub as any);

      expect(result).toEqual(mockResult);
      expect(importService.createImportJob).toHaveBeenCalledWith(createDto, 'user-456');
    });

    it('should handle different import types', async () => {
      const types = [
        ImportType.CONTACTS,
        ImportType.DEALS,
        ImportType.LEADS,
        ImportType.ACCOUNTS,
        ImportType.PRODUCTS,
        ImportType.USERS,
      ];
      
      for (const type of types) {
        const dto = { ...createDto, type };
        importService.createImportJob.mockResolvedValue({ ...mockResult, type });
        
        await controller.createImportJob(dto, mockRequest as any);
        
        expect(importService.createImportJob).toHaveBeenCalledWith(dto, 'user-123');
      }
    });

    it('should handle different import sources', async () => {
      const sources = [
        ImportSource.CSV,
        ImportSource.EXCEL,
        ImportSource.GOOGLE_SHEETS,
        ImportSource.API,
        ImportSource.MANUAL,
        ImportSource.MIGRATION,
      ];
      
      for (const source of sources) {
        const dto = { ...createDto, source };
        importService.createImportJob.mockResolvedValue({ ...mockResult, source });
        
        await controller.createImportJob(dto, mockRequest as any);
        
        expect(importService.createImportJob).toHaveBeenCalledWith(dto, 'user-123');
      }
    });

    it('should handle optional fields', async () => {
      const dtoWithOptions: CreateImportJobDto = {
        type: ImportType.CONTACTS,
        source: ImportSource.CSV,
        fileName: 'test.csv',
        fileUrl: 'https://example.com/test.csv',
        fieldMapping: { name: 'full_name' },
        transformations: { uppercase: true },
        callbackUrl: 'https://example.com/callback',
        metadata: { source: 'manual' },
        headers: { 'X-Custom': 'value' },
        dryRun: true,
        notifyEmails: ['admin@example.com'],
        schedule: '0 0 * * *',
      };

      importService.createImportJob.mockResolvedValue(mockResult);

      await controller.createImportJob(dtoWithOptions, mockRequest as any);

      expect(importService.createImportJob).toHaveBeenCalledWith(dtoWithOptions, 'user-123');
    });
  });

  describe('getImportJobs', () => {
    const mockJobs = [
      {
        id: 'import-1',
        type: ImportType.CONTACTS,
        status: 'completed',
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'import-2',
        type: ImportType.DEALS,
        status: 'processing',
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'import-3',
        type: ImportType.LEADS,
        status: 'failed',
        createdAt: new Date('2024-01-03'),
      },
    ];

    it('should return all import jobs', async () => {
      importService.getImportJobs.mockResolvedValue(mockJobs);

      const result = await controller.getImportJobs();

      expect(result).toEqual(mockJobs);
      expect(importService.getImportJobs).toHaveBeenCalled();
    });

    it('should return empty array when no jobs exist', async () => {
      importService.getImportJobs.mockResolvedValue([]);

      const result = await controller.getImportJobs();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      importService.getImportJobs.mockRejectedValue(error);

      await expect(controller.getImportJobs()).rejects.toThrow('Database error');
    });
  });
});