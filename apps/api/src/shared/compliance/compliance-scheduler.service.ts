import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Soc2EvidenceService } from './soc2/soc2-evidence.service';

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

@Injectable()
export class ComplianceSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ComplianceSchedulerService.name);
  private dailyInterval: NodeJS.Timeout | null = null;
  private weeklyInterval: NodeJS.Timeout | null = null;

  constructor(private readonly evidenceService: Soc2EvidenceService) {}

  onModuleInit(): void {
    this.logger.log('Compliance scheduler initialized');
    this.startScheduledTasks();
  }

  onModuleDestroy(): void {
    this.stopScheduledTasks();
  }

  private startScheduledTasks(): void {
    // Daily evidence collection (24 hours)
    this.dailyInterval = setInterval(
      () => {
        void this.collectDailyEvidence();
      },
      24 * 60 * 60 * 1000,
    );

    // Weekly gap analysis (7 days)
    this.weeklyInterval = setInterval(
      () => {
        void this.performWeeklyGapAnalysis();
      },
      7 * 24 * 60 * 60 * 1000,
    );

    // Run once immediately on startup
    setTimeout(() => {
      void this.collectDailyEvidence();
    }, 5000);
  }

  private stopScheduledTasks(): void {
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
      this.dailyInterval = null;
    }
    if (this.weeklyInterval) {
      clearInterval(this.weeklyInterval);
      this.weeklyInterval = null;
    }
  }

  /**
   * Daily evidence collection
   */
  private async collectDailyEvidence(): Promise<void> {
    this.logger.log('Starting daily SOC 2 evidence collection...');

    try {
      const results = await this.evidenceService.collectAllEvidence();

      this.logger.log(
        `Daily evidence collection completed: ${results.length} controls collected`,
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Daily evidence collection failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Weekly gap analysis
   */
  private async performWeeklyGapAnalysis(): Promise<void> {
    this.logger.log('Starting weekly SOC 2 gap analysis...');

    try {
      // Call without await first to see if it's a Promise
      const result = this.evidenceService.performGapAnalysis();

      // Handle both Promise and non-Promise results
      const gaps = result instanceof Promise ? await result : result;

      if (!Array.isArray(gaps)) {
        this.logger.error('performGapAnalysis did not return an array');
        return;
      }

      const completed = gaps.filter((g) => g.status === 'COMPLETE').length;
      const total = gaps.length;
      const completionRate = Math.round((completed / total) * 100);

      this.logger.log(
        `Weekly gap analysis completed: ${completionRate}% complete (${completed}/${total} controls)`,
      );

      if (completionRate < 80) {
        this.logger.warn(
          `LOW COMPLIANCE COMPLETION: ${completionRate}% - Action required`,
        );
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Weekly gap analysis failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Manual trigger for immediate evidence collection
   */
  async triggerManualCollection(): Promise<{
    success: boolean;
    message: string;
    results?: {
      count: number;
      duration: number;
      timestamp: string;
    };
  }> {
    this.logger.log('Manual evidence collection triggered');

    try {
      const startTime = Date.now();
      const results = await this.evidenceService.collectAllEvidence();
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: `Evidence collection completed in ${duration}ms`,
        results: {
          count: results.length,
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return {
        success: false,
        message: `Evidence collection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Manual trigger for gap analysis
   */
  async triggerManualGapAnalysis(): Promise<{
    success: boolean;
    message: string;
    gaps?: {
      total: number;
      completed: number;
      partial: number;
      missing: number;
      overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }> {
    this.logger.log('Manual gap analysis triggered');

    try {
      // Call without await first to see if it's a Promise
      const result = this.evidenceService.performGapAnalysis();

      // Handle both Promise and non-Promise results
      const gaps = result instanceof Promise ? await result : result;

      if (!Array.isArray(gaps)) {
        this.logger.error('performGapAnalysis did not return an array');
        return {
          success: false,
          message: 'Gap analysis did not return expected data',
        };
      }

      const hasHighRisk = gaps.some((g) => g.riskLevel === 'HIGH');
      const hasMediumRisk = gaps.some((g) => g.riskLevel === 'MEDIUM');

      return {
        success: true,
        message: 'Gap analysis completed',
        gaps: {
          total: gaps.length,
          completed: gaps.filter((g) => g.status === 'COMPLETE').length,
          partial: gaps.filter((g) => g.status === 'PARTIAL').length,
          missing: gaps.filter((g) => g.status === 'MISSING').length,
          overallRisk: hasHighRisk ? 'HIGH' : hasMediumRisk ? 'MEDIUM' : 'LOW',
        },
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return {
        success: false,
        message: `Gap analysis failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Cleanup old evidence (monthly)
   */
  async triggerCleanup(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Manual evidence cleanup triggered');

    try {
      const result = this.evidenceService.cleanupOldEvidence();
      // If it's a Promise, await it
      if (result instanceof Promise) {
        await result;
      }
      return {
        success: true,
        message: 'Evidence cleanup completed',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      return {
        success: false,
        message: `Evidence cleanup failed: ${errorMessage}`,
      };
    }
  }
}
