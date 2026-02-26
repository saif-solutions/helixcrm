import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { ImportJobRepository } from './repositories/import-job.repository';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    JwtModule, // Add JwtModule to provide JwtService for AuthGuard
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportJobRepository],
  exports: [ImportService],
})
export class ImportModule {}