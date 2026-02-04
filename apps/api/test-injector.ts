// apps/api/test-injector.ts
import { Test } from '@nestjs/testing';
import { PrismaModule } from './src/shared/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

async function testInjector() {
  console.log('Testing dependency injection...\n');
  
  try {
    // First test just PrismaModule
    console.log('1. Testing PrismaModule...');
    const module1 = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
      ],
    }).compile();
    
    console.log('✓ PrismaModule compiled successfully');
    
    // Try to get PrismaService
    const prismaService = module1.get('PrismaService');
    console.log('✓ PrismaService retrieved');
    
    // Now test individual compliance services
    console.log('\n2. Testing individual services...');
    
    // Test Soc2EvidenceService
    const { Soc2EvidenceService } = await import('./src/shared/compliance/soc2/soc2-evidence.service');
    console.log('✓ Soc2EvidenceService class loaded');
    
    // Test EvidenceStorageService
    const { EvidenceStorageService } = await import('./src/shared/compliance/evidence-storage/evidence-storage.service');
    console.log('✓ EvidenceStorageService class loaded');
    
    // Test Soc2ControlsService
    const { Soc2ControlsService } = await import('./src/shared/compliance/soc2/soc2-controls.service');
    console.log('✓ Soc2ControlsService class loaded');
    
    console.log('\n✅ All services can be loaded');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error?.message);
    console.error('Stack:', error?.stack);
  }
}

testInjector().catch(console.error);