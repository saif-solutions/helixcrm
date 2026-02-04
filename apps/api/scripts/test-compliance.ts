// apps/api/scripts/test-compliance.ts
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from '../src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from '../src/shared/compliance/soc2/soc2-evidence.service';

async function bootstrap() {
  console.log('Testing SOC 2 Evidence Collection...\n');
  
  const app = await NestFactory.createApplicationContext({
    imports: [ComplianceModule],
  });
  
  try {
    const evidenceService = app.get(Soc2EvidenceService);
    
    console.log('Collecting evidence...');
    const evidence = await evidenceService.collectAllEvidence();
    
    console.log(`✓ Collected ${evidence.length} evidence items`);
    console.log('\nSummary:');
    
// Update apps/api/scripts/test-compliance.ts line 23:
const byCriteria = evidence.reduce((acc: Record<string, number>, item) => {
  acc[item.criteria] = (acc[item.criteria] || 0) + 1;
  return acc;
}, {});
    
    Object.entries(byCriteria).forEach(([criteria, count]) => {
      console.log(`  ${criteria}: ${count} items`);
    });
    
    console.log('\nControls collected:');
    evidence.forEach(item => {
      console.log(`  ${item.controlId}: ${item.controlName}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await app.close();
    console.log('\n✓ Test completed!');
  }
}

bootstrap().catch(console.error);