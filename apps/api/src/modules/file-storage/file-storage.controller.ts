// apps/api/src/modules/file-storage/file-storage.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  FileStorageService,
  UploadFileDto,
  UpdateFileDto,
} from './file-storage.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';

class UploadFileRequestDto implements UploadFileDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @IsNotEmpty()
  size: number;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Keep for potential future use (e.g., PATCH endpoint), but currently not used.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UpdateFileRequestDto implements UpdateFileDto {
  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@ApiTags('File Storage')
@ApiBearerAuth()
@Controller('files')
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileRequestDto })
  @RequirePermission('files.upload')
  async uploadFile(
    @Body(new ValidationPipe({ transform: true }))
    uploadDto: UploadFileRequestDto,
  ) {
    return this.fileStorageService.uploadFile(uploadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files for current organization' })
  @ApiResponse({ status: 200, description: 'List of files with pagination' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @RequirePermission('files.read')
  async getAllFiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validatedPage - 1) * validatedLimit;

    return this.fileStorageService.getAllFiles({
      skip,
      take: validatedLimit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ status: 200, description: 'File details' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @RequirePermission('files.download')
  async getFileById(@Param('id', ParseUUIDPipe) fileId: string) {
    return this.fileStorageService.getFileById(fileId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @RequirePermission('files.manage')
  async deleteFile(@Param('id', ParseUUIDPipe) fileId: string) {
    return this.fileStorageService.deleteFile(fileId);
  }
}
