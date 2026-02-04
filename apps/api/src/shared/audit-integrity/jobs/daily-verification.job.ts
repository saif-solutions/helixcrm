import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditIntegrityService } from '../audit-integrity.service';

@Injectable()
export class DailyVerificationJob {
  private readonly logger = new Logger(DailyVerificationJob.name);

  constructor(private readonly auditIntegrityService: AuditIntegrityService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyVerification() {
    this.logger.log('Ì∫Ä Starting daily audit chain verification...');
    
    try {
      const result = await this.auditIntegrityService.verifyChain();
      
      if (result.valid) {
        this.logger.log(`‚úÖ Daily audit chain verification SUCCESSFUL`);
        this.logger.log(`   Total events: ${result.totalEvents}`);
        this.logger.log(`   Verified at: ${result.verifiedAt.toISOString()}`);
      } else {
        this.logger.error(`‚ùå Daily audit chain verification FAILED`);
        this.logger.error(`   Broken at block: ${result.brokenAtIndex}`);
        this.logger.error(`   Total events: ${result.totalEvents}`);
        
        // In production, trigger alerts here
        await this.triggerAlerts(result);
      }
    } catch (error) {
      this.logger.error(`Ì≤• Daily verification job failed: ${error.message}`, error.stack);
      
      // Even if verification fails, we should alert
      await this.triggerErrorAlert(error);
    }
  }

  private async triggerAlerts(result: any): Promise<void> {
    // This is where you would integrate with your alerting system
    // Examples: Slack, PagerDuty, Email, etc.
    
    const alertMessage = `Ì∫® AUDIT CHAIN INTEGRITY VIOLATION
    Time: ${new Date().toISOString()}
    Broken at block: ${result.brokenAtIndex}
    Total events: ${result.totalEvents}
    Expected hash: ${result.expectedHash?.substring(0, 32)}...
    Actual hash: ${result.actualHash?.substring(0, 32)}...`;
    
    this.logger.error(alertMessage);
    
    // Example: Send to Slack (would need proper integration)
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await this.sendSlackAlert(alertMessage);
    // }
  }

  private async triggerErrorAlert(error: Error): Promise<void> {
    const alertMessage = `Ì¥¥ AUDIT CHAIN VERIFICATION ERROR
    Time: ${new Date().toISOString()}
    Error: ${error.message}
    Stack: ${error.stack?.substring(0, 500)}...`;
    
    this.logger.error(alertMessage);
  }
}
