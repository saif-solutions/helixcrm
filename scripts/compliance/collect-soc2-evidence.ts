// scripts/compliance/collect-soc2-evidence.ts
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from '../../apps/api/src/shared/compliance/compliance.module';
import { ComplianceSchedulerService } from '../../apps/api/src/shared/compliance/compliance-scheduler.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext({
    imports: [ComplianceModule],
  });
  
  const scheduler = app.get(ComplianceSchedulerService);
  const result = await scheduler.triggerManualCollection();
  
  console.log(JSON.stringify(result, null, 2));
  await app.close();
}

bootstrap().catch(console.error);