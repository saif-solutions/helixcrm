import { Controller, Get, Post, Logger, Query } from '@nestjs/common';
import { AuditLogService, AuditAction, AuditEntityType, AuditSeverity, AuditMode } from './audit-log.service';
import { AuditQueueService } from './audit-queue.service';

@Controller('audit-test')
// Audit test endpoints for verifying async pipeline
export class AuditTestController {
  private readonly logger = new Logger(AuditTestController.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditQueueService: AuditQueueService,
  ) {}

  @Get('sync')
  async testSyncAudit(@Query('count') count = '1') {
    const num = parseInt(count, 10) || 1;
    const results = [];

    for (let i = 0; i < num; i++) {
      const start = Date.now();
      const result = await this.auditLogService.logDirect(
        AuditAction.LOGIN_SUCCESS,
        AuditEntityType.AUTH,
        `test-user-${i}@example.com`,
        `user-${i}`,
        undefined,
        { test: true, iteration: i, mode: 'sync' },
        AuditSeverity.LOW,
        `org-test-${i}`,
        '127.0.0.1',
        'AuditTest/1.0'
      );
      const duration = Date.now() - start;
      results.push({ iteration: i, duration, result });
    }

    return {
      message: `Created ${num} synchronous audit logs`,
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      results,
    };
  }

  @Get('async')
  async testAsyncAudit(@Query('count') count = '1') {
    const num = parseInt(count, 10) || 1;
    const results = [];

    for (let i = 0; i < num; i++) {
      const start = Date.now();
      const result = await this.auditLogService.logDirect(
        AuditAction.CONTACT_CREATED, // Non-critical action should go to queue
        AuditEntityType.CONTACT,
        `test-user-${i}@example.com`,
        `user-${i}`,
        `contact-${i}`,
        { test: true, iteration: i, mode: 'async' },
        AuditSeverity.LOW,
        `org-test-${i}`,
        '127.0.0.1',
        'AuditTest/1.0'
      );
      const duration = Date.now() - start;
      results.push({ iteration: i, duration, result });
    }

    return {
      message: `Created ${num} audit logs (may be async if queue available)`,
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      results,
    };
  }

  @Get('critical')
  async testCriticalAudit() {
    const start = Date.now();
    const result = await this.auditLogService.logDirect(
      AuditAction.LOGIN_FAILURE, // Critical action should always be synchronous
      AuditEntityType.AUTH,
      'attacker@example.com',
      'user-attacker',
      undefined,
      { test: true, critical: true, reason: 'failed_login_attempt' },
      AuditSeverity.HIGH,
      'org-security',
      '192.168.1.100',
      'MaliciousBot/1.0'
    );
    const duration = Date.now() - start;

    return {
      message: 'Created critical audit log (should be synchronous)',
      mode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      duration,
      result,
    };
  }

  @Get('queue-metrics')
  async getQueueMetrics() {
    try {
      const metrics = await this.auditQueueService.getQueueMetrics();
      return {
        message: 'Audit queue metrics',
        metrics,
        mode: this.auditLogService.getAuditMode(),
        queueAvailable: this.auditLogService.isQueueAvailable(),
      };
    } catch (error) {
      return {
        message: 'Failed to get queue metrics',
        error: error.message,
        mode: this.auditLogService.getAuditMode(),
        queueAvailable: this.auditLogService.isQueueAvailable(),
      };
    }
  }

  @Post('toggle-mode')
  async toggleMode(@Query('mode') mode: 'SYNC_MODE' | 'ASYNC_MODE' | 'QUEUE_DISABLED') {
    const validModes = ['SYNC_MODE', 'ASYNC_MODE', 'QUEUE_DISABLED'];
    if (!validModes.includes(mode)) {
      return { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` };
    }

    this.auditLogService.setAuditMode(mode as AuditMode);
    
    return {
      message: `Audit mode changed to ${mode}`,
      currentMode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
    };
  }

  @Get('status')
  async getStatus() {
    return {
      auditMode: this.auditLogService.getAuditMode(),
      queueAvailable: this.auditLogService.isQueueAvailable(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
