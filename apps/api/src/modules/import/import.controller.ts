import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ImportService } from './import.service';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CreateImportJobDto } from './dto/create-import-job.dto';

@Controller('import')
@UseGuards(AuthGuard, TenantGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('jobs')
  async createImportJob(@Body() dto: CreateImportJobDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.importService.createImportJob(dto, userId);
  }

  @Get('jobs')
  async getImportJobs() {
    return this.importService.getImportJobs();
  }
}
