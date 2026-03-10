import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './src/shared/prisma/prisma.module';
import { ComplianceModule } from './src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from './src/shared/compliance/soc2/soc2-evidence.service';
import { Soc2ControlsService } from './src/shared/compliance/soc2/soc2-controls.service';
import { EvidenceStorageService } from './src/shared/compliance/evidence-storage/evidence-storage.service';
import { ComplianceSchedulerService } from './src/shared/compliance/compliance-scheduler.service';

async function testComplianceModule() {
  console.log('Testing Compliance Module with direct service imports...');
  
  try {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ComplianceModule,
      ],
      providers: [
        Soc2EvidenceService,
        Soc2ControlsService,
        EvidenceStorageService,
        ComplianceSchedulerService,
      ],
    }).compile();
    
    console.log('✅ Testing module compiled successfully!');
    
    // Try to get each service using their classes
    const serviceClasses = [
      Soc2EvidenceService,
      Soc2ControlsService,
      EvidenceStorageService,
      ComplianceSchedulerService
    ];
    
    for (const ServiceClass of serviceClasses) {
      try {
        const service = module.get(ServiceClass);
        console.log(`✅ ${ServiceClass.name}: OK`);
        
        // Check if the service has required dependencies
        if (service['prisma']) {
          console.log(`   ↳ Has PrismaService dependency`);
        }
      } catch (error) {
        console.log(`❌ ${ServiceClass.name}: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Module compilation failed:', error.message);
    console.log('Stack trace:', error.stack?.split('\n').slice(0, 5).join('\n'));
    return false;
  }
}

// Run the test
testComplianceModule()
  .then(success => {
    console.log(success ? '✅ All tests passed!' : '❌ Tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  });
