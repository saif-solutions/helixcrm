import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { ConfigValidationService } from './config-validation.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ConfigValidationService],
  exports: [ConfigValidationService],
})
export class ConfigValidationModule {}
