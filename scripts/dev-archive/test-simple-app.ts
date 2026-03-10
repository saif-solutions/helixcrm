// apps/api/test-simple-app.ts
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from './src/shared/compliance/compliance.module';

async function testSimpleApp() {
  console.log('Testing simple Nest application context...\n');
  
  try {
    // Create application context
    const app = await NestFactory.createApplicationContext({
      imports: [ComplianceModule],
    });
    
    console.log('✓ Application context created successfully');
    
    // Try to get the Soc2EvidenceService
    const evidenceService = app.get('Soc2EvidenceService');
    console.log('✓ Soc2EvidenceService retrieved');
    
    // Try a simple method
    const history = await evidenceService.getCollectionHistory(1);
    console.log(`✓ getCollectionHistory works. Found ${history?.length || 0} collections`);
    
    await app.close();
    console.log('\n✅ Simple application test passed!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error?.message);
    console.error('Stack:', error?.stack);
    
    if (error?.message?.includes('metatype is not a constructor')) {
      console.error('\nHint: Check if all services have @Injectable() decorator');
      console.error('Services to check:');
      console.error('  - Soc2EvidenceService');
      console.error('  - EvidenceStorageService');
      console.error('  - Soc2ControlsService');
      console.error('  - ComplianceSchedulerService');
    }
  }
}

testSimpleApp().catch(console.error);