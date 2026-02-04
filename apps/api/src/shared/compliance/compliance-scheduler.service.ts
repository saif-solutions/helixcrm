// apps/api/src/shared/compliance/compliance-scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Soc2EvidenceService } from './soc2/soc2-evidence.service';

@Injectable()
export class ComplianceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ComplianceSchedulerService.name);
  private dailyInterval: NodeJS.Timeout | null = null;
  private weeklyInterval: NodeJS.Timeout | null = null;

  constructor(private readonly evidenceService: Soc2EvidenceService) {}

  onModuleInit() {
    this.logger.log('Compliance scheduler initialized');
    this.startScheduledTasks();
  }

  onModuleDestroy() {
    this.stopScheduledTasks();
  }

  private startScheduledTasks() {
    // Daily evidence collection (24 hours)
    this.dailyInterval = setInterval(() => {
      this.collectDailyEvidence();
    }, 24 * 60 * 60 * 1000);

    // Weekly gap analysis (7 days)
    this.weeklyInterval = setInterval(() => {
      this.performWeeklyGapAnalysis();
    }, 7 * 24 * 60 * 60 * 1000);

    // Run once immediately on startup
    setTimeout(() => {
      this.collectDailyEvidence();
    }, 5000); // Wait 5 seconds after startup
  }

  private stopScheduledTasks() {
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
  private async collectDailyEvidence() {
    this.logger.log('Starting daily SOC 2 evidence collection...');
    
    try {
      const results = await this.evidenceService.collectAllEvidence();
      
      this.logger.log(`Daily evidence collection completed: ${results.length} controls collected`);
      
    } catch (error) {
      this.logger.error(`Daily evidence collection failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Weekly gap analysis
   */
  private async performWeeklyGapAnalysis() {
    this.logger.log('Starting weekly SOC 2 gap analysis...');
    
    try {
      const gaps = await this.evidenceService.performGapAnalysis();
      
      const completed = gaps.filter(g => g.status === 'COMPLETE').length;
      const total = gaps.length;
      const completionRate = Math.round((completed / total) * 100);
      
      this.logger.log(`Weekly gap analysis completed: ${completionRate}% complete (${completed}/${total} controls)`);
      
      // Alert if completion rate drops below 80%
      if (completionRate < 80) {
        this.logger.warn(`LOW COMPLIANCE COMPLETION: ${completionRate}% - Action required`);
      }
      
    } catch (error) {
      this.logger.error(`Weekly gap analysis failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Manual trigger for immediate evidence collection
   */
  async triggerManualCollection(): Promise<{ success: boolean; message: string; results?: any }> {
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
      
    } catch (error) {
      return {
        success: false,
        message: `Evidence collection failed: ${error.message}`,
      };
    }
  }

  /**
   * Manual trigger for gap analysis
   */
  async triggerManualGapAnalysis(): Promise<{ success: boolean; message: string; gaps?: any }> {
    this.logger.log('Manual gap analysis triggered');
    
    try {
      const gaps = await this.evidenceService.performGapAnalysis();
      
      return {
        success: true,
        message: 'Gap analysis completed',
        gaps: {
          total: gaps.length,
          completed: gaps.filter(g => g.status === 'COMPLETE').length,
          partial: gaps.filter(g => g.status === 'PARTIAL').length,
          missing: gaps.filter(g => g.status === 'MISSING').length,
          overallRisk: gaps.some(g => g.riskLevel === 'HIGH') ? 'HIGH' : 
                      gaps.some(g => g.riskLevel === 'MEDIUM') ? 'MEDIUM' : 'LOW',
        },
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Gap analysis failed: ${error.message}`,
      };
    }
  }

  /**
   * Cleanup old evidence (monthly)
   */
  async triggerCleanup(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Manual evidence cleanup triggered');
    
    try {
      await this.evidenceService.cleanupOldEvidence();
      return {
        success: true,
        message: 'Evidence cleanup completed',
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Evidence cleanup failed: ${error.message}`,
      };
    }
  }
}