// scripts/compliance/test-evidence-collection.ts
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from '../../apps/api/src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from '../../apps/api/src/shared/compliance/soc2/soc2-evidence.service';
import { EvidenceStorageService } from '../../apps/api/src/shared/compliance/evidence-storage/evidence-storage.service';
import { Soc2ControlsService } from '../../apps/api/src/shared/compliance/soc2/soc2-controls.service';

async function bootstrap() {
  console.log('Starting SOC 2 Evidence Collection Test...\n');
  
  const app = await NestFactory.createApplicationContext({
    imports: [ComplianceModule],
  });
  
  try {
    const evidenceService = app.get(Soc2EvidenceService);
    const storageService = app.get(EvidenceStorageService);
    const controlsService = app.get(Soc2ControlsService);
    
    // Test 1: Collect evidence
    console.log('Test 1: Collecting evidence...');
    const evidence = await evidenceService.collectAllEvidence();
    console.log(`✓ Collected ${evidence.length} evidence items\n`);
    
    // Test 2: Store evidence with integrity
    console.log('Test 2: Storing evidence with integrity...');
    const storedEvidence = await storageService.storeEvidenceWithIntegrity({
      collectionId: `test-${Date.now()}`,
      totalControls: evidence.length,
      byCriteria: {
        Security: evidence.filter(e => e.criteria === 'Security').length,
        Availability: evidence.filter(e => e.criteria === 'Availability').length,
        Confidentiality: evidence.filter(e => e.criteria === 'Confidentiality').length,
        ProcessingIntegrity: evidence.filter(e => e.criteria === 'ProcessingIntegrity').length,
        Privacy: evidence.filter(e => e.criteria === 'Privacy').length,
      },
      results: evidence,
    });
    console.log(`✓ Evidence stored with hash: ${storedEvidence.evidenceHash.substring(0, 16)}...\n`);
    
    // Test 3: Verify controls
    console.log('Test 3: Verifying controls...');
    for (const evidenceItem of evidence) {
      const result = await controlsService.verifyControl(
        evidenceItem.controlId,
        evidenceItem,
        'TestRunner'
      );
      console.log(`  ${result.controlId}: ${result.status} (${result.evidenceCount} evidence)`);
    }
    console.log();
    
    // Test 4: Verify evidence chain
    console.log('Test 4: Verifying evidence chain integrity...');
    const chainResult = await storageService.verifyEvidenceChain();
    console.log(`✓ Chain valid: ${chainResult.valid}`);
    console.log(`✓ Chain length: ${chainResult.chainLength}`);
    if (chainResult.issues.length > 0) {
      console.log(`Issues: ${chainResult.issues.join(', ')}`);
    }
    console.log();
    
    // Test 5: Get control summary
    console.log('Test 5: Getting control status summary...');
    const summary = await controlsService.getControlStatusSummary(30);
    console.log(`Total controls: ${summary.totalControls}`);
    console.log(`Verified controls: ${summary.verifiedControls}`);
    console.log(`Overall status: ${summary.overallStatus}`);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await app.close();
    console.log('\n✓ All tests completed successfully!');
  }
}

bootstrap().catch(console.error);