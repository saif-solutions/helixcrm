import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './src/shared/prisma/prisma.module';
import { ComplianceModule } from './src/shared/compliance/compliance.module';

async function testComplianceModule() {
  console.log('Testing Compliance Module...');
  
  try {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ComplianceModule,
      ],
    }).compile();
    
    console.log('✅ ComplianceModule compiled successfully!');
    
    // Try to get each service
    const services = [
      'Soc2EvidenceService',
      'Soc2ControlsService',
      'EvidenceStorageService',
      'ComplianceSchedulerService'
    ];
    
    for (const serviceName of services) {
      try {
        const service = module.get(serviceName);
        console.log(`✅ ${serviceName}: OK`);
      } catch (error) {
        console.log(`❌ ${serviceName}: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Module compilation failed:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

// Run the test
testComplianceModule()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
