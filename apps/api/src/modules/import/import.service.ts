import { Injectable } from '@nestjs/common';
import { ImportJobRepository } from './repositories/import-job.repository';
import { CreateImportJobDto } from './dto/create-import-job.dto';

@Injectable()
export class ImportService {
  constructor(private readonly importJobRepository: ImportJobRepository) {}

  async createImportJob(data: CreateImportJobDto, userId: string) {
    return this.importJobRepository.create({
      ...data,
      userId,
      status: 'pending',
    });
  }

  async getImportJobs() {
    return this.importJobRepository.findAll();
  }

  // Add other CRUD methods following email-templates.service.ts pattern
}
