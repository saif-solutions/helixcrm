// test/test.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { jest } from '@jest/globals';
import { Soc2EvidenceService } from '../src/shared/compliance/soc2/soc2-evidence.service';
import { ComplianceSchedulerService } from '../src/shared/compliance/compliance-scheduler.service';
import { mockSoc2EvidenceService, mockComplianceSchedulerService } from './mocks/compliance.mock';

// Mock ConfigService provider for testing
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret-key-min-32-chars-long-here-123',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-min-32-chars-long-here-123',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      NODE_ENV: 'test',
      BCRYPT_SALT_ROUNDS: 10,
    };
    return config[key] ?? defaultValue;
  }),
};

@Module({
  imports: [
    // Import ConfigModule to make ConfigService available globally
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    AuthModule,
  ],
  providers: [
    // Override ConfigService with our mock
    {
      provide: ConfigService,
      useValue: mockConfigService,
    },
    // Mock compliance services
    {
      provide: Soc2EvidenceService,
      useValue: mockSoc2EvidenceService,
    },
    {
      provide: ComplianceSchedulerService,
      useValue: mockComplianceSchedulerService,
    },
  ],
  exports: [ConfigService],
})
export class TestModule {}
