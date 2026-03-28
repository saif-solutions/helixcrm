#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { AuditIntegrityService } from '../audit-integrity.service';

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

async function bootstrap() {
  console.log('��� Starting audit chain verification...');
  console.log('========================================');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const auditIntegrityService = app.get(AuditIntegrityService);

  try {
    console.log('��� Verifying audit chain integrity...');
    const startTime = Date.now();

    const result = await auditIntegrityService.verifyChain();
    const duration = Date.now() - startTime;

    console.log('');
    console.log('��� VERIFICATION RESULTS:');
    console.log('────────────────────────');
    console.log(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Total Events: ${result.totalEvents}`);
    console.log(`Verified At: ${result.verifiedAt.toISOString()}`);
    console.log(`Duration: ${duration}ms`);

    if (!result.valid) {
      console.log('');
      console.log('⚠️ INTEGRITY VIOLATION DETECTED:');
      console.log('────────────────────────────────');
      console.log(`Broken at block: ${result.brokenAtIndex}`);
      console.log(`Broken hash: ${result.brokenAtHash?.substring(0, 32)}...`);
      console.log(`Expected hash: ${result.expectedHash?.substring(0, 32)}...`);
      console.log(`Actual hash: ${result.actualHash?.substring(0, 32)}...`);

      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Audit chain integrity verified successfully!');
      process.exit(0);
    }
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    const errorStack = getErrorStack(error);
    console.error('');
    console.error('❌ Verification error:');
    console.error('─────────────────────');
    console.error(`Message: ${errorMessage}`);
    if (errorStack) {
      const truncatedStack = errorStack.split('\n').slice(0, 5).join('\n');
      console.error(`Stack: ${truncatedStack}...`);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    const errorMessage = getErrorMessage(error);
    console.error('❌ Fatal error:', errorMessage);
    process.exit(1);
  });
}
