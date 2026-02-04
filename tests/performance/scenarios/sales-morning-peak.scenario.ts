// tests/performance/scenarios/sales-morning-peak.scenario.ts
import { PerformanceMetricsService } from '../../../apps/api/src/shared/performance/performance-metrics.service';
import { PrismaService } from '../../../apps/api/src/shared/prisma/prisma.service';
import { Logger } from '@nestjs/common';

export interface LoadTestResult {
  scenario: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  p95Latency: number;
  errorRate: number;
  throughput: number;
  violations: string[];
  compliant: boolean;
}

export class SalesMorningPeakScenario {
  private readonly logger = new Logger(SalesMorningPeakScenario.name);
  private readonly SCENARIO_NAME = 'salesMorningPeak';

  constructor(
    private readonly performanceMetrics: PerformanceMetricsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Simulate a sales rep user journey
   */
  private async simulateSalesRepJourney(userIndex: number): Promise<{
    success: boolean;
    duration: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // 1. Login (simulated)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      // 2. View dashboard
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // 3. Search for contacts
      const searchStart = Date.now();
      await this.prisma.contact.findMany({
        where: {
          organizationId: 'test-org-id', // Use test organization
          deletedAt: null,
        },
        take: 20,
      });
      const searchDuration = Date.now() - searchStart;
      
      if (searchDuration > 1000) {
        errors.push(`Contact search slow: ${searchDuration}ms`);
      }
      
      // 4. View deals
      const dealsStart = Date.now();
      await this.prisma.deal.findMany({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
          status: 'open',
        },
        take: 10,
        include: {
          contact: true,
          stage: true,
        },
      });
      const dealsDuration = Date.now() - dealsStart;
      
      if (dealsDuration > 1500) {
        errors.push(`Deals query slow: ${dealsDuration}ms`);
      }
      
      // 5. Create activity (simulated)
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
      
      const totalDuration = Date.now() - startTime;
      
      // Record performance metric
      await this.performanceMetrics.recordMetric({
        endpoint: '/simulate/sales-rep-journey',
        duration: totalDuration,
        statusCode: 200,
        method: 'GET',
        userId: `test-user-${userIndex}`,
        organizationId: 'test-org-id',
        metadata: {
          scenario: this.SCENARIO_NAME,
          userType: 'sales-rep',
          stepDurations: {
            login: 150,
            dashboard: 250,
            contactSearch: searchDuration,
            dealsView: dealsDuration,
            activityCreate: 350,
          },
          errors: errors.length > 0 ? errors : undefined,
        },
      });

      return {
        success: errors.length === 0,
        duration: totalDuration,
        errors,
      };

// In tests/performance/scenarios/sales-morning-peak.scenario.ts, update the catch block:

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Sales rep journey failed: ${errorMessage}`);
      
      await this.performanceMetrics.recordMetric({
        endpoint: '/simulate/sales-rep-journey',
        duration,
        statusCode: 500,
        method: 'GET',
        userId: `test-user-${userIndex}`,
        organizationId: 'test-org-id',
        metadata: {
          scenario: this.SCENARIO_NAME,
          userType: 'sales-rep',
          error: errorMessage,
          stack: errorStack,
        },
      });

      return {
        success: false,
        duration,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Run the sales morning peak scenario
   */
  async run(
    concurrentUsers: number = 500,
    durationMinutes: number = 15
  ): Promise<LoadTestResult> {
    this.logger.log(`Starting ${this.SCENARIO_NAME} scenario with ${concurrentUsers} concurrent users for ${durationMinutes} minutes`);
    
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    const results: Array<{
      success: boolean;
      duration: number;
      errors: string[];
    }> = [];
    
    let completedRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const latencies: number[] = [];

    // Create user simulation promises
    const userPromises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      userPromises.push(
        (async () => {
          while (Date.now() < endTime) {
            // Simulate user think time between actions
            const thinkTime = 5000 + Math.random() * 10000; // 5-15 seconds
            await new Promise(resolve => setTimeout(resolve, thinkTime));
            
            // Execute user journey
            const result = await this.simulateSalesRepJourney(i);
            
            results.push(result);
            latencies.push(result.duration);
            
            completedRequests++;
            if (result.success) {
              successfulRequests++;
            } else {
              failedRequests++;
            }
            
            // Record progress every 100 requests
            if (completedRequests % 100 === 0) {
              this.logger.log(`Progress: ${completedRequests} requests completed`);
            }
          }
        })()
      );
    }

    // Wait for all user simulations to complete or timeout
    await Promise.allSettled(userPromises.map(p => 
      Promise.race([
        p,
        new Promise(resolve => setTimeout(resolve, (durationMinutes + 1) * 60 * 1000))
      ])
    ));

    const totalDuration = Date.now() - startTime;
    
    // Calculate metrics
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const errorRate = (failedRequests / completedRequests) * 100;
    const throughput = completedRequests / (totalDuration / 1000);
    
    // Check SLO compliance
    const sloCheck = await this.performanceMetrics.checkSLOCompliance(
      this.SCENARIO_NAME,
      {
        p95Latency,
        errorRate,
        throughput,
      }
    );

    // Store baseline
    const baseline = await this.performanceMetrics.getPerformanceBaseline(this.SCENARIO_NAME);
    
    this.logger.log(`Scenario ${this.SCENARIO_NAME} completed:`);
    this.logger.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    this.logger.log(`  Total Requests: ${completedRequests}`);
    this.logger.log(`  Successful: ${successfulRequests}`);
    this.logger.log(`  Failed: ${failedRequests}`);
    this.logger.log(`  p95 Latency: ${p95Latency.toFixed(2)}ms`);
    this.logger.log(`  Error Rate: ${errorRate.toFixed(2)}%`);
    this.logger.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);
    this.logger.log(`  SLO Compliant: ${sloCheck.compliant ? '✅' : '❌'}`);
    
    if (!sloCheck.compliant && sloCheck.violations.length > 0) {
      sloCheck.violations.forEach(violation => {
        this.logger.warn(`  Violation: ${violation}`);
      });
    }

    return {
      scenario: this.SCENARIO_NAME,
      duration: totalDuration,
      totalRequests: completedRequests,
      successfulRequests,
      failedRequests,
      p95Latency,
      errorRate,
      throughput,
      violations: sloCheck.violations,
      compliant: sloCheck.compliant,
    };
  }

  /**
   * Quick smoke test to verify the scenario works
   */
  async smokeTest(users: number = 10, durationSeconds: number = 30): Promise<LoadTestResult> {
    this.logger.log(`Running smoke test with ${users} users for ${durationSeconds} seconds`);
    
    // Override duration for smoke test
    const originalRun = this.run;
    this.run = async (concurrentUsers, durationMinutes) => {
      return originalRun.call(this, concurrentUsers, durationSeconds / 60);
    };
    
    const result = await this.run(users, durationSeconds / 60);
    
    // Restore original method
    this.run = originalRun;
    
    return result;
  }
}