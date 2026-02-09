import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FileRepository } from './repositories/file.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface UploadFileDto {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  metadata?: Record<string, any>;
}

export interface UpdateFileDto {
  originalName?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a new file
   */
  async uploadFile(uploadDto: UploadFileDto) {
    // Permission check
    if (!this.permissionContext.hasPermission('files.upload')) {
      throw new ForbiddenException('Insufficient permissions: files.upload required');
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // Generate unique filename
      const filename = this.generateUniqueFilename(uploadDto.originalName);

      // Create file record
      const file = await this.fileRepository.createFile({
        filename,
        originalName: uploadDto.originalName,
        mimeType: uploadDto.mimeType,
        size: uploadDto.size,
        path: uploadDto.path,
        metadata: uploadDto.metadata,
      });

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'FILE_UPLOADED' as any,
        entityId: file.id,
        entityType: 'FILE' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`File uploaded successfully`, {
        fileId: file.id,
        tenantId,
        userId,
        filename: file.filename,
        size: file.size,
      });

      return file;
    } catch (error: any) {
      this.logger.error(`Upload file failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        data: uploadDto,
      });

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(id: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('files.download')) {
      throw new ForbiddenException('Insufficient permissions: files.download required');
    }

    const tenantId = this.tenantContext.getTenantId();

    try {
      const file = await this.fileRepository.findFileById(id);

      if (!file) {
        throw new NotFoundException(`File ${id} not found`);
      }

      return file;
    } catch (error: any) {
      this.logger.error(`Get file by ID failed: ${error.message}`, error.stack, {
        tenantId,
        id,
      });

      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch file');
    }
  }

  /**
   * Get all files for current tenant
   */
  async getAllFiles(options?: {
    skip?: number;
    take?: number;
  }) {
    // Permission check
    if (!this.permissionContext.hasPermission('files.read')) {
      throw new ForbiddenException('Insufficient permissions: files.read required');
    }

    const tenantId = this.tenantContext.getTenantId();

    try {
      const [files, total] = await Promise.all([
        this.fileRepository.findAllFiles(options),
        this.fileRepository.countFiles(),
      ]);

      return {
        data: files,
        meta: {
          page: options?.skip ? Math.floor(options.skip / (options.take || 20)) + 1 : 1,
          limit: options?.take || 20,
          total,
          pages: options?.take ? Math.ceil(total / (options.take || 20)) : 1,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get all files failed: ${error.message}`, error.stack, {
        tenantId,
        options,
      });

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch files');
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(id: string) {
    // Permission check
    if (!this.permissionContext.hasPermission('files.manage')) {
      throw new ForbiddenException('Insufficient permissions: files.manage required');
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // Get existing file
      const existingFile = await this.fileRepository.findFileById(id);
      if (!existingFile) {
        throw new NotFoundException(`File ${id} not found`);
      }

      // Soft delete
      await this.fileRepository.softDeleteFile(id);

      // Audit logging
      await this.auditLogService.logEvent({
        action: 'FILE_DELETED' as any,
        entityId: id,
        entityType: 'FILE' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          fileId: id,
          filename: existingFile.filename,
          originalName: existingFile.originalName,
          wasPermanentlyDeleted: false,
        },
        severity: SeverityMapper.forEventType('warning'),
      });

      this.logger.log(`File soft deleted successfully`, {
        fileId: id,
        tenantId,
        userId,
        filename: existingFile.filename,
      });

      return { message: 'File deleted successfully' };
    } catch (error: any) {
      this.logger.error(`Delete file failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        id,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to delete file');
    }
  }

  // ==================== HELPER METHODS ====================

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.includes('.')
      ? originalName.substring(originalName.lastIndexOf('.'))
      : '';
    const baseName = originalName.includes('.')
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName;

    return `${baseName}_${timestamp}_${randomString}${extension}`;
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(`Failed to fetch email for user ${userId}: ${error.message}`);
      return `user-${userId}@error.example.com`;
    }
  }
}
