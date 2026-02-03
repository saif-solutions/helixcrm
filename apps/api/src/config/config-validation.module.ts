import { Module, Global } from '@nestjs/common';
import { ConfigValidationService } from './config-validation.service';
import { PrismaModule } from '../shared/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ConfigValidationService],
  exports: [ConfigValidationService],
})
export class ConfigValidationModule {}
