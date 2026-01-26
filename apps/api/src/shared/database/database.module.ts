import { Module, Global, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RLSService } from './rls.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RLSService],
  exports: [PrismaModule, RLSService],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly rlsService: RLSService) {}

  async onModuleInit() {
    this.logger.log('DatabaseModule initialized');
    
    // RLS will initialize automatically via its onModuleInit
    // We just log the status here
    if (this.rlsService.isEnabled()) {
      this.logger.log('Row Level Security is enabled and will initialize automatically');
    } else {
      this.logger.warn('Row Level Security is disabled via configuration');
    }
  }
}