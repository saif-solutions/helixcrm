import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageController } from '../../../src/modules/file-storage/file-storage.controller';
import { FileStorageService } from '../../../src/modules/file-storage/file-storage.service';

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
const mockFileStorageService = {
  uploadFile: jest.fn(),
  getAllFiles: jest.fn(),
  getFileById: jest.fn(),
  deleteFile: jest.fn(),
};

describe('FileStorageController', () => {
  let controller: FileStorageController;
  let fileStorageService: typeof mockFileStorageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileStorageController],
      providers: [
        { provide: FileStorageService, useValue: mockFileStorageService },
      ],
    }).compile();

    controller = module.get<FileStorageController>(FileStorageController);
    fileStorageService = module.get(FileStorageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    const uploadDto = {
      originalName: 'test-file.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      path: '/uploads/test-file.pdf',
      metadata: { description: 'Test file' },
    };

    const mockResult = { id: 'file-123', ...uploadDto };

    it('should successfully upload a file', async () => {
      fileStorageService.uploadFile.mockResolvedValue(mockResult);

      const result = await controller.uploadFile(uploadDto);

      expect(result).toEqual(mockResult);
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(uploadDto);
    });

    it('should handle upload without metadata', async () => {
      const dtoWithoutMetadata = {
        originalName: 'test-file.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-file.pdf',
      };
      fileStorageService.uploadFile.mockResolvedValue({ id: 'file-123', ...dtoWithoutMetadata });

      const result = await controller.uploadFile(dtoWithoutMetadata);

      expect(result).toBeDefined();
      expect(fileStorageService.uploadFile).toHaveBeenCalledWith(dtoWithoutMetadata);
    });
  });

  describe('getAllFiles', () => {
    const mockFiles = {
      data: [
        { id: 'file-1', originalName: 'file1.pdf', size: 1024 },
        { id: 'file-2', originalName: 'file2.jpg', size: 2048 },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1 },
    };

    it('should return all files with default pagination', async () => {
      fileStorageService.getAllFiles.mockResolvedValue(mockFiles);

      const result = await controller.getAllFiles(1, 20);

      expect(result).toEqual(mockFiles);
      expect(fileStorageService.getAllFiles).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    it('should handle custom pagination', async () => {
      fileStorageService.getAllFiles.mockResolvedValue(mockFiles);

      await controller.getAllFiles(2, 50);

      expect(fileStorageService.getAllFiles).toHaveBeenCalledWith({
        skip: 50,
        take: 50,
      });
    });

    it('should clamp limit to max 100', async () => {
      fileStorageService.getAllFiles.mockResolvedValue(mockFiles);

      await controller.getAllFiles(1, 200);

      expect(fileStorageService.getAllFiles).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });

    it('should ensure page is at least 1', async () => {
      fileStorageService.getAllFiles.mockResolvedValue(mockFiles);

      await controller.getAllFiles(0, 20);

      expect(fileStorageService.getAllFiles).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    it('should calculate skip correctly', async () => {
      fileStorageService.getAllFiles.mockResolvedValue(mockFiles);

      await controller.getAllFiles(3, 30);

      expect(fileStorageService.getAllFiles).toHaveBeenCalledWith({
        skip: 60,
        take: 30,
      });
    });
  });

  describe('getFileById', () => {
    const fileId = 'file-123';
    const mockFile = {
      id: fileId,
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      path: '/uploads/test.pdf',
    };

    it('should return file by id', async () => {
      fileStorageService.getFileById.mockResolvedValue(mockFile);

      const result = await controller.getFileById(fileId);

      expect(result).toEqual(mockFile);
      expect(fileStorageService.getFileById).toHaveBeenCalledWith(fileId);
    });

    it('should handle UUID validation', async () => {
      const invalidId = 'not-a-uuid';
      fileStorageService.getFileById.mockRejectedValue(new Error('Invalid UUID'));

      await expect(controller.getFileById(invalidId)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    const fileId = 'file-123';
    const mockResult = { message: 'File deleted successfully' };

    it('should successfully delete a file', async () => {
      fileStorageService.deleteFile.mockResolvedValue(mockResult);

      const result = await controller.deleteFile(fileId);

      expect(result).toEqual(mockResult);
      expect(fileStorageService.deleteFile).toHaveBeenCalledWith(fileId);
    });

    it('should handle non-existent file', async () => {
      fileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      await expect(controller.deleteFile(fileId)).rejects.toThrow('File not found');
    });
  });
});