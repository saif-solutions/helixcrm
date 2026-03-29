// apps/api/src/modules/import/import.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { ImportJobRepository } from './repositories/import-job.repository';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportJobRepository],
  exports: [ImportService],
})
export class ImportModule {}
