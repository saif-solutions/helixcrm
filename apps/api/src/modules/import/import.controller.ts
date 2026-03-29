// apps/api/src/modules/import/import.controller.ts
import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ImportService } from './import.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CreateImportJobDto } from './dto/create-import-job.dto';
import { Request } from 'express';

// Extend Express Request to include user from auth guard
interface RequestWithUser extends Request {
  user?: {
    id: string;
    sub?: string;
    email?: string;
    [key: string]: unknown;
  };
}

@Controller('import')
@UseGuards(AuthGuard, TenantGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('jobs')
  async createImportJob(
    @Body() dto: CreateImportJobDto,
    @Req() req: RequestWithUser,
  ): Promise<unknown> {
    const userId = req.user?.id ?? req.user?.sub ?? '';
    return this.importService.createImportJob(dto, userId);
  }

  @Get('jobs')
  async getImportJobs(): Promise<unknown> {
    return this.importService.getImportJobs();
  }
}
