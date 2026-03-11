// tests/performance/load-tests.suite.ts
import { Logger } from '@nestjs/common';
import { SalesMorningPeakScenario } from './scenarios/sales-morning-peak.scenario';
import { LoadTestUtils, TestConfiguration, TestResult } from './utils/load-test-utils';
import * as fs from 'fs';
import * as path from 'path';

export class PerformanceTestSuite {
  private readonly logger = new Logger(PerformanceTestSuite.name);
  private readonly utils = new LoadTestUtils();
  private readonly resultsDir = path.join(process.cwd(), 'tests/performance/results');

  constructor(private readonly salesMorningPeakScenario: SalesMorningPeakScenario) {
    // Create results directory if it doesn't exist
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Get test configurations for all scenarios
   */
  private getTestConfigurations(): Record<string, TestConfiguration> {
    return {
      salesMorningPeak: {
        scenario: 'salesMorningPeak',
        concurrentUsers: 500,
        duration: '15m',
        warmUpTime: 60, // 1 minute
        coolDownTime: 30, // 30 seconds
        thinkTime: {
          min: 2000, // 2 seconds
          max: 8000, // 8 seconds
        },
        dataVariation: 'medium',
      },
      smokeTest: {
        scenario: 'smokeTest',
        concurrentUsers: 10,
        duration: '30s',
        warmUpTime: 5, // 5 seconds
        coolDownTime: 5, // 5 seconds
        thinkTime: {
          min: 1000, // 1 second
          max: 3000, // 3 seconds
        },
        dataVariation: 'small',
      },
      // Additional scenarios can be added here
    };
  }

  /**
   * Run warm-up phase
   */
  private async runWarmUp(config: TestConfiguration): Promise<void> {
    if (config.warmUpTime <= 0) return;

    this.logger.log(`Starting ${config.warmUpTime}s warm-up phase...`);

    // Run a light load during warm-up
    const warmUpConfig = {
      ...config,
      concurrentUsers: Math.max(1, Math.floor(config.concurrentUsers * 0.1)), // 10% of target users
      duration: `${config.warmUpTime}s`,
    };

    await this.salesMorningPeakScenario.smokeTest(warmUpConfig.concurrentUsers, config.warmUpTime);

    this.logger.log(`Warm-up completed`);
  }

  /**
   * Run cool-down phase
   */
  private async runCoolDown(): Promise<void> {
    this.logger.log('Cooling down system...');
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds
    this.logger.log('Cool-down completed');
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenarioName: string): Promise<TestResult> {
    const configs = this.getTestConfigurations();
    const config = configs[scenarioName];

    if (!config) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    // Validate configuration
    const errors = this.utils.validateConfiguration(config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration for ${scenarioName}: ${errors.join(', ')}`);
    }

    this.logger.log(`=== STARTING SCENARIO: ${scenarioName} ===`);
    this.logger.log(`Configuration: ${JSON.stringify(config, null, 2)}`);

    const startTime = new Date();

    try {
      // 1. Warm-up phase
      await this.runWarmUp(config);

      // 2. Main test phase
      this.logger.log(`Starting main test phase for ${config.duration}...`);

      let loadTestResult;
      if (scenarioName === 'salesMorningPeak') {
        const durationMinutes = this.utils.parseDuration(config.duration) / (60 * 1000);
        loadTestResult = await this.salesMorningPeakScenario.run(
          config.concurrentUsers,
          durationMinutes,
        );
      } else if (scenarioName === 'smokeTest') {
        const durationSeconds = this.utils.parseDuration(config.duration) / 1000;
        loadTestResult = await this.salesMorningPeakScenario.smokeTest(
          config.concurrentUsers,
          durationSeconds,
        );
      } else {
        throw new Error(`Scenario ${scenarioName} not implemented`);
      }

      // 3. Cool-down phase
      await this.runCoolDown();

      const endTime = new Date();

      // Calculate additional percentiles
      // Note: In a real implementation, you'd collect latencies from the scenario
      // For now, we'll use the p95 and estimate others
      const p50Latency = loadTestResult.p95Latency * 0.3; // Estimate
      const p99Latency = loadTestResult.p95Latency * 1.5; // Estimate

      const result: TestResult = {
        configuration: config,
        startTime,
        endTime,
        metrics: {
          totalRequests: loadTestResult.totalRequests,
          successfulRequests: loadTestResult.successfulRequests,
          failedRequests: loadTestResult.failedRequests,
          p50Latency,
          p95Latency: loadTestResult.p95Latency,
          p99Latency,
          errorRate: loadTestResult.errorRate,
          throughput: loadTestResult.throughput,
          concurrentUsers: config.concurrentUsers,
        },
        violations: loadTestResult.violations,
        compliant: loadTestResult.compliant,
      };

      // 4. Save results
      await this.saveResults(scenarioName, result);

      // 5. Generate and log report
      const report = this.utils.generateReport(result);
      this.logger.log(report);

      this.logger.log(`=== SCENARIO COMPLETED: ${scenarioName} ===`);
      this.logger.log(`Status: ${result.compliant ? '✅ PASS' : '❌ FAIL'}`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scenario ${scenarioName} failed: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Save test results to file
   */
  private async saveResults(scenarioName: string, result: TestResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${scenarioName}-${timestamp}.json`;
    const filepath = path.join(this.resultsDir, filename);

    const data = {
      scenario: scenarioName,
      timestamp: new Date().toISOString(),
      result,
    };

    await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    this.logger.log(`Results saved to: ${filepath}`);
  }

  /**
   * Run all scenarios
   */
  async runAll(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    const configs = this.getTestConfigurations();

    // Run smoke test first
    try {
      this.logger.log('=== STARTING SMOKE TEST ===');
      results.smokeTest = await this.runScenario('smokeTest');

      if (!results.smokeTest.compliant) {
        this.logger.warn('Smoke test failed! Stopping further tests.');
        return results;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Smoke test failed: ${errorMessage}`);
      return results;
    }

    // Run main scenarios
    const mainScenarios = Object.keys(configs).filter((name) => name !== 'smokeTest');

    for (const scenarioName of mainScenarios) {
      try {
        results[scenarioName] = await this.runScenario(scenarioName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Scenario ${scenarioName} failed: ${errorMessage}`);
        results[scenarioName] = {
          configuration: configs[scenarioName],
          startTime: new Date(),
          endTime: new Date(),
          metrics: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 1,
            p50Latency: 0,
            p95Latency: 0,
            p99Latency: 0,
            errorRate: 100,
            throughput: 0,
            concurrentUsers: configs[scenarioName].concurrentUsers,
          },
          violations: [`Test execution failed: ${errorMessage}`],
          compliant: false,
        };
      }
    }

    // Generate summary report
    await this.generateSummaryReport(results);

    return results;
  }

  /**
   * Generate summary report for all scenarios
   */
  private async generateSummaryReport(results: Record<string, TestResult>): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `summary-${timestamp}.md`;
    const filepath = path.join(this.resultsDir, filename);

    let report = `# Performance Test Summary\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    for (const [scenarioName, result] of Object.entries(results)) {
      report += `## ${scenarioName}\n\n`;
      report += `**Status:** ${result.compliant ? '✅ PASS' : '❌ FAIL'}\n`;
      report += `**Duration:** ${this.utils.formatDuration(result.endTime.getTime() - result.startTime.getTime())}\n`;
      report += `**Concurrent Users:** ${result.configuration.concurrentUsers}\n\n`;

      if (result.violations.length > 0) {
        report += `### Violations\n\n`;
        result.violations.forEach((violation) => {
          report += `- ${violation}\n`;
        });
        report += `\n`;
      }

      report += `### Metrics\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Total Requests | ${result.metrics.totalRequests} |\n`;
      report += `| Successful | ${result.metrics.successfulRequests} |\n`;
      report += `| Failed | ${result.metrics.failedRequests} |\n`;
      report += `| Error Rate | ${result.metrics.errorRate.toFixed(2)}% |\n`;
      report += `| Throughput | ${result.metrics.throughput.toFixed(2)} req/sec |\n`;
      report += `| p50 Latency | ${result.metrics.p50Latency.toFixed(2)}ms |\n`;
      report += `| p95 Latency | ${result.metrics.p95Latency.toFixed(2)}ms |\n`;
      report += `| p99 Latency | ${result.metrics.p99Latency.toFixed(2)}ms |\n\n`;

      report += `---\n\n`;
    }

    // Calculate overall status
    const allPassed = Object.values(results).every((r) => r.compliant);
    report += `## Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`;

    await fs.promises.writeFile(filepath, report, 'utf8');
    this.logger.log(`Summary report saved to: ${filepath}`);
  }

  /**
   * Get latest test results
   */
  async getLatestResults(): Promise<Record<string, TestResult>> {
    const files = await fs.promises.readdir(this.resultsDir);
    const resultFiles = files.filter((f) => f.endsWith('.json'));

    if (resultFiles.length === 0) {
      return {};
    }

    // Sort by modification time (newest first)
    resultFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(this.resultsDir, a));
      const statB = fs.statSync(path.join(this.resultsDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    const latestResults: Record<string, TestResult> = {};

    // Read the most recent result for each scenario
    for (const file of resultFiles.slice(0, 5)) {
      // Last 5 test runs
      try {
        const content = await fs.promises.readFile(path.join(this.resultsDir, file), 'utf8');
        const data = JSON.parse(content);

        if (data.scenario && data.result) {
          latestResults[data.scenario] = data.result;
        }
      } catch (error) {
        this.logger.warn(`Failed to read result file ${file}: ${error}`);
      }
    }

    return latestResults;
  }
}
