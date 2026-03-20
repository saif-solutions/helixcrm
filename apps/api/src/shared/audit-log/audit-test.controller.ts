import { Controller, Get, Logger } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import {
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from './audit-log.constants';

// Define return type for the test methods
interface AuditTestResponse {
  mode: string;
  queueAvailable: boolean;
  result: unknown;
  isCritical?: boolean;
}

// Define metadata type
interface TestMetadata {
  test: boolean;
  timestamp: string;
  reason?: string;
}

@Controller('audit-test')
export class AuditTestController {
  private readonly logger = new Logger(AuditTestController.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('sync-test')
  async testSyncMode(): Promise<AuditTestResponse> {
    this.logger.log('Testing synchronous audit mode...');

    const metadata: TestMetadata = {
      test: true,
      timestamp: new Date().toISOString(),
    };

    // Log a test event - should be synchronous
    const result = (await this.auditLogService.logDirect(
      AuditAction.LOGIN_SUCCESS,
      AuditEntityType.AUTH,
      'test@example.com',
      'test-user-id',
      undefined,
      metadata,
      AuditSeverity.LOW,
      'test-org-id',
    )) as unknown;

    return {
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      result,
    };
  }

  @Get('async-test')
  async testAsyncMode(): Promise<AuditTestResponse> {
    this.logger.log('Testing asynchronous audit mode...');

    const metadata: TestMetadata = {
      test: true,
      timestamp: new Date().toISOString(),
    };

    // Log a test event - should go to queue if available
    const result = (await this.auditLogService.logDirect(
      AuditAction.CONTACT_CREATED,
      AuditEntityType.CONTACT,
      'test@example.com',
      'test-user-id',
      undefined,
      metadata,
      AuditSeverity.LOW,
      'test-org-id',
    )) as unknown;

    return {
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      result,
    };
  }

  @Get('critical-test')
  async testCriticalAction(): Promise<AuditTestResponse> {
    this.logger.log('Testing critical action audit (should bypass queue)...');

    const metadata: TestMetadata = {
      test: true,
      timestamp: new Date().toISOString(),
      reason: 'test failure',
    };

    // Log a critical event - should always be synchronous
    const result = (await this.auditLogService.logDirect(
      AuditAction.LOGIN_FAILURE,
      AuditEntityType.AUTH,
      'test@example.com',
      'test-user-id',
      undefined,
      metadata,
      AuditSeverity.HIGH,
      'test-org-id',
    )) as unknown;

    return {
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      isCritical: true,
      result,
    };
  }
}
