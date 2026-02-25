import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { ImportJobRepository } from './repositories/import-job.repository';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [ImportController],
  providers: [ImportService, ImportJobRepository],
  exports: [ImportService],
})
export class ImportModule {}
