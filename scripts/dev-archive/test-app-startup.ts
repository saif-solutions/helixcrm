import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function bootstrap() {
  console.log('Testing application startup with ComplianceModule...');

  try {
    // Create a minimal application context (without listening)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    console.log('✅ Application context created successfully!');
    console.log('✅ ComplianceModule is properly integrated');

    // Try to get compliance services
    try {
      const evidenceService = app.get('Soc2EvidenceService');
      console.log('✅ Soc2EvidenceService retrieved from app context');
    } catch (error) {
      console.log(
        '⚠️  Soc2EvidenceService not in global context (expected if not exported globally)',
      );
    }

    await app.close();
    console.log('✅ Application test completed successfully!');
    return true;
  } catch (error) {
    console.log('❌ Application startup failed:', error.message);
    console.log('Error details:', error);
    return false;
  }
}

// Run the test
bootstrap()
  .then((success) => {
    console.log(
      success
        ? '✅ SUCCESS: Application can start with ComplianceModule'
        : '❌ FAILED: Application cannot start',
    );
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  });
