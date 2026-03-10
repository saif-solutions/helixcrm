import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './src/shared/prisma/prisma.module';

async function testService(serviceClass: any, serviceName: string) {
  console.log(`\n��� Testing ${serviceName}...`);
  
  try {
    // Check if the class exists
    if (!serviceClass) {
      console.log(`❌ ${serviceName}: Class not found`);
      return false;
    }
    
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
      ],
      providers: [serviceClass],
    }).compile();
    
    const service = module.get(serviceClass);
    console.log(`✅ ${serviceName}: Instantiated successfully`);
    return true;
  } catch (error: any) {
    console.log(`❌ ${serviceName}: ${error.message}`);
    console.log(`   ${error.stack?.split('\n')[1]}`);
    return false;
  }
}

async function runTests() {
  console.log('=== Testing SOC 2 Compliance Services ===');
  
  // Dynamically import each service
  const imports = [
    { name: 'Soc2EvidenceService', path: './src/shared/compliance/soc2/soc2-evidence.service' },
    { name: 'Soc2ControlsService', path: './src/shared/compliance/soc2/soc2-controls.service' },
    { name: 'EvidenceStorageService', path: './src/shared/compliance/evidence-storage/evidence-storage.service' },
    { name: 'ComplianceSchedulerService', path: './src/shared/compliance/compliance-scheduler.service' },
  ];
  
  let allPassed = true;
  
  for (const imp of imports) {
    try {
      const module = await import(imp.path);
      const serviceClass = module[imp.name];
      
      if (!serviceClass) {
        console.log(`❌ ${imp.name}: Export not found in module`);
        allPassed = false;
        continue;
      }
      
      const passed = await testService(serviceClass, imp.name);
      if (!passed) allPassed = false;
      
    } catch (error: any) {
      console.log(`❌ Failed to import ${imp.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);
