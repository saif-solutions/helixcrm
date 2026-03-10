// test/utils/create-test-app.ts
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { AuditLogService } from '../../src/shared/audit-log/audit-log.service';
import { createMockPrisma } from '../mocks/prisma.mock';
import * as supertest from 'supertest';

interface CreateTestAppOptions {
  imports: any[];
  providers?: any[];
  overrideProviders?: Array<{
    provide: any;
    useValue: any;
  }>;
}

// Helper to create mock functions with proper typing
export const MockFn = () => jest.fn().mockImplementation(() => Promise.resolve(undefined));

export async function createTestApp({ 
  imports, 
  providers = [],
  overrideProviders = [] 
}: CreateTestAppOptions): Promise<INestApplication> {
  console.log('🔧 Starting test app creation...');
  
  const mockPrisma = createMockPrisma();
  console.log('✅ Prisma mock created');

  console.log('📦 Building test module...');
  const startTime = Date.now();

  // Build module with provided imports
  const moduleBuilder = Test.createTestingModule({
    imports,
    providers: [...providers],
  });

  // Override PrismaService with mock
  moduleBuilder.overrideProvider(PrismaService).useValue(mockPrisma);
  console.log('✅ PrismaService overridden');

  // CRITICAL: Override AuditLogService to prevent real audit logs
  moduleBuilder.overrideProvider(AuditLogService).useValue({
    logWithRequest: jest.fn().mockImplementation(() => Promise.resolve({ id: 'audit-test' })),
    logEvent: jest.fn().mockImplementation(() => Promise.resolve({ id: 'audit-test' })),
    logAuthEvent: jest.fn().mockImplementation(() => Promise.resolve({ id: 'audit-test' })),
    logDirect: jest.fn().mockImplementation(() => Promise.resolve({ id: 'audit-test' })),
    logWithRequestObject: jest.fn().mockImplementation(() => Promise.resolve({ id: 'audit-test' })),
  });
  console.log('✅ AuditLogService overridden');

  // Apply all other overrides
  overrideProviders.forEach(({ provide, useValue }) => {
    moduleBuilder.overrideProvider(provide).useValue(useValue);
    console.log(`✅ Provider ${provide.toString()} overridden`);
  });

  console.log('⏳ Compiling module...');
  const moduleRef = await moduleBuilder.compile();
  console.log(`✅ Module compiled in ${Date.now() - startTime}ms`);

  console.log('🏗️ Creating Nest application...');
  const app = moduleRef.createNestApplication();
  
  // Add cookie parser for cookie-based auth
  app.use(cookieParser());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  console.log('⏳ Initializing app...');
  await app.init();
  console.log(`✅ App initialized in ${Date.now() - startTime}ms`);

  (app as any).mockPrisma = mockPrisma;
  console.log('✅ Test app ready');
  
  return app;
}

export const testRequest = (app: INestApplication) => (supertest as any)(app.getHttpServer());

export const closeApp = async (app?: INestApplication) => {
  if (app) {
    console.log('🔚 Closing app...');
    await app.close();
    console.log('✅ App closed');
  }
};