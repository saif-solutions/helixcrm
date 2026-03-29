import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

interface VerificationResult {
  valid: boolean;
  totalEvents: number;
  verifiedAt: Date;
  brokenAtIndex?: number;
  brokenAtHash?: string;
  expectedHash?: string;
  actualHash?: string;
}

@Injectable()
export class DailyVerificationJob {
  private readonly logger = new Logger(DailyVerificationJob.name);

  constructor(private readonly auditIntegrityService: AuditIntegrityService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyVerification(): Promise<void> {
    this.logger.log('��� Starting daily audit chain verification...');

    try {
      const result = await this.auditIntegrityService.verifyChain();

      if (result.valid) {
        this.logger.log(`✅ Daily audit chain verification SUCCESSFUL`);
        this.logger.log(`   Total events: ${result.totalEvents}`);
        this.logger.log(`   Verified at: ${result.verifiedAt.toISOString()}`);
      } else {
        this.logger.error(`❌ Daily audit chain verification FAILED`);
        this.logger.error(`   Broken at block: ${result.brokenAtIndex}`);
        this.logger.error(`   Total events: ${result.totalEvents}`);

        // In production, trigger alerts here
        this.triggerAlerts(result);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);
      this.logger.error(
        `❌ Daily verification job failed: ${errorMessage}`,
        errorStack,
      );

      // Even if verification fails, we should alert
      this.triggerErrorAlert(error);
    }
  }

  private triggerAlerts(result: VerificationResult): void {
    // This is where you would integrate with your alerting system
    // Examples: Slack, PagerDuty, Email, etc.

    const alertMessage = `��� AUDIT CHAIN INTEGRITY VIOLATION
    Time: ${new Date().toISOString()}
    Broken at block: ${result.brokenAtIndex ?? 'unknown'}
    Total events: ${result.totalEvents}
    Expected hash: ${result.expectedHash?.substring(0, 32) ?? 'unknown'}...
    Actual hash: ${result.actualHash?.substring(0, 32) ?? 'unknown'}...`;

    this.logger.error(alertMessage);

    // Example: Send to Slack (would need proper integration)
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await this.sendSlackAlert(alertMessage);
    // }
  }

  private triggerErrorAlert(error: unknown): void {
    const errorMessage = getErrorMessage(error);
    const errorStack = getErrorStack(error);

    const alertMessage = `��� AUDIT CHAIN VERIFICATION ERROR
    Time: ${new Date().toISOString()}
    Error: ${errorMessage}
    Stack: ${errorStack?.substring(0, 500) ?? 'N/A'}...`;

    this.logger.error(alertMessage);
  }
}
