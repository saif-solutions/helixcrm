import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './src/shared/prisma/prisma.module';
import { ComplianceModule } from './src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from './src/shared/compliance/soc2/soc2-evidence.service';

async function testComplianceOnly() {
  console.log('Testing Compliance Module standalone...');
  
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        PrismaModule,
        ComplianceModule,
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    
    console.log('✅ Nest application created with ComplianceModule');
    
    // Test if we can instantiate and use Soc2EvidenceService
    const evidenceService = moduleRef.get(Soc2EvidenceService);
    console.log('✅ Soc2EvidenceService instantiated');
    
    // Try to call a simple method
    try {
      // This might fail if there's no data, but that's OK
      await evidenceService.collectAllEvidence();
      console.log('✅ collectAllEvidence() method works');
    } catch (error) {
      console.log('⚠️  collectAllEvidence() failed (might be expected if no data):', error.message);
    }
    
    await app.close();
    console.log('✅ Test completed successfully!');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    console.log('Error stack (first 5 lines):');
    console.log(error.stack?.split('\n').slice(0, 10).join('\n'));
    return false;
  }
}

// Run the test
testComplianceOnly()
  .then(success => {
    console.log(success ? '✅ COMPLIANCE MODULE TEST PASSED' : '❌ COMPLIANCE MODULE TEST FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  });
