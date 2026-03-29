// apps/api/src/modules/import/dto/create-import-job.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  Max,
  IsUrl,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Define supported import types
export enum ImportType {
  CONTACTS = 'contacts',
  DEALS = 'deals',
  LEADS = 'leads',
  ACCOUNTS = 'accounts',
  PRODUCTS = 'products',
  USERS = 'users',
}

// Define supported import sources
export enum ImportSource {
  CSV = 'csv',
  EXCEL = 'excel',
  GOOGLE_SHEETS = 'google_sheets',
  API = 'api',
  MANUAL = 'manual',
  MIGRATION = 'migration',
}

export class CreateImportJobDto {
  @IsEnum(ImportType)
  type: ImportType;

  @IsEnum(ImportSource)
  source: ImportSource;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(104857600) // 100MB max
  @Type(() => Number)
  fileSize?: number;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;

  @IsOptional()
  @IsObject()
  transformations?: Record<string, unknown>;

  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  dryRun?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyEmails?: string[];

  @IsOptional()
  @IsString()
  schedule?: string;

  constructor(data: Partial<CreateImportJobDto> = {}) {
    this.type = data.type ?? ImportType.CONTACTS;
    this.source = data.source ?? ImportSource.CSV;
    this.fileName = data.fileName;
    this.fileSize = data.fileSize;
    this.fileUrl = data.fileUrl;
    this.fieldMapping = data.fieldMapping;
    this.transformations = data.transformations;
    this.callbackUrl = data.callbackUrl;
    this.metadata = data.metadata;
    this.headers = data.headers;
    this.dryRun = data.dryRun ?? false;
    this.notifyEmails = data.notifyEmails;
    this.schedule = data.schedule;
  }
}

// Simple response DTO
export class CreateImportJobResponseDto {
  id: string;
  status: string;
  estimatedDuration?: number;
  statusWebhook?: string;
  createdAt: Date;

  constructor(data: Partial<CreateImportJobResponseDto> = {}) {
    this.id = data.id ?? '';
    this.status = data.status ?? 'pending';
    this.estimatedDuration = data.estimatedDuration;
    this.statusWebhook = data.statusWebhook;
    this.createdAt = data.createdAt ?? new Date();
  }
}
