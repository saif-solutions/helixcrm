// apps/api/scripts/compliance-cli-fixed.ts
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from '../src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from '../src/shared/compliance/soc2/soc2-evidence.service';
import { EvidenceStorageService } from '../src/shared/compliance/evidence-storage/evidence-storage.service';
import { Soc2ControlsService } from '../src/shared/compliance/soc2/soc2-controls.service';

const program = new Command();

program
  .name('compliance-cli')
  .description('SOC 2 Compliance Evidence Management CLI')
  .version('1.0.0');

program
  .command('test')
  .description('Test if compliance module works')
  .action(async () => {
    console.log('Testing compliance module...\n');

    try {
      // Create app with ONLY ComplianceModule
      const app = await NestFactory.createApplicationContext(ComplianceModule);

      console.log('✅ Application context created!');

      // Try to get each service
      try {
        const evidenceService = app.get(Soc2EvidenceService);
        console.log('✅ Soc2EvidenceService: OK');
      } catch (error: any) {
        console.log('❌ Soc2EvidenceService:', error.message);
      }

      try {
        const storageService = app.get(EvidenceStorageService);
        console.log('✅ EvidenceStorageService: OK');
      } catch (error: any) {
        console.log('❌ EvidenceStorageService:', error.message);
      }

      try {
        const controlsService = app.get(Soc2ControlsService);
        console.log('✅ Soc2ControlsService: OK');
      } catch (error: any) {
        console.log('❌ Soc2ControlsService:', error.message);
      }

      await app.close();
      console.log('\n✅ Test completed!');
    } catch (error: any) {
      console.log('\n❌ Overall error:', error.message);
      console.log('Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    }
  });

program.parse(process.argv);
