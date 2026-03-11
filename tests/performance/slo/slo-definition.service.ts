// tests/performance/slo/slo-definition.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SLODefinition {
  description: string;
  p95Latency: number; // milliseconds
  errorRate: number; // percentage (0-100)
  throughput: number; // requests per second
  concurrentUsers: number;
  duration: string; // e.g., "15m"
  justification: string;
  tags?: string[];
}

export interface SLOValidationResult {
  sloName: string;
  compliant: boolean;
  violations: Array<{
    metric: string;
    expected: number | string;
    actual: number | string;
    deviation?: number;
  }>;
  summary: {
    totalMetrics: number;
    passedMetrics: number;
    failedMetrics: number;
    passRate: number;
  };
}

@Injectable()
export class SLODefinitionService {
  private readonly logger = new Logger(SLODefinitionService.name);
  private readonly sloDefinitionsPath = path.join(
    process.cwd(),
    'configs/performance/slo-definitions.json',
  );

  private defaultSLOs: Record<string, SLODefinition> = {
    salesMorningPeak: {
      description: '500 concurrent sales users during morning peak',
      p95Latency: 800,
      errorRate: 1.0,
      throughput: 100,
      concurrentUsers: 500,
      duration: '15m',
      justification: 'Based on 100 sales reps × 5 simultaneous sessions',
      tags: ['critical', 'user-facing', 'high-traffic'],
    },
    monthEndReporting: {
      description: '300 concurrent managers during month-end reporting',
      p95Latency: 1500,
      errorRate: 0.5,
      throughput: 50,
      concurrentUsers: 300,
      duration: '30m',
      justification: 'Month-end reporting with heavy analytics queries',
      tags: ['reporting', 'analytics', 'periodic'],
    },
    executiveDashboard: {
      description: '200 executives viewing real-time dashboards',
      p95Latency: 500,
      errorRate: 0.1,
      throughput: 200,
      concurrentUsers: 200,
      duration: '10m',
      justification: 'Executive dashboard requires near-instant updates',
      tags: ['executive', 'real-time', 'high-availability'],
    },
    dataExportOperations: {
      description: 'Large data export operations',
      p95Latency: 30000,
      errorRate: 2.0,
      throughput: 5,
      concurrentUsers: 50,
      duration: '1h',
      justification: 'Large exports are IO-bound operations',
      tags: ['batch', 'background', 'resource-intensive'],
    },
    smokeTest: {
      description: 'Basic smoke test for CI/CD pipeline',
      p95Latency: 1000,
      errorRate: 5.0,
      throughput: 10,
      concurrentUsers: 10,
      duration: '30s',
      justification: 'Quick validation of system health',
      tags: ['ci-cd', 'smoke', 'validation'],
    },
  };

  /**
   * Load SLO definitions from file or use defaults
   */
  async getSLODefinitions(): Promise<Record<string, SLODefinition>> {
    try {
      if (fs.existsSync(this.sloDefinitionsPath)) {
        const content = await fs.promises.readFile(this.sloDefinitionsPath, 'utf8');
        const fileSLOs = JSON.parse(content);

        // Merge with defaults (file SLOs override defaults)
        return { ...this.defaultSLOs, ...fileSLOs };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load SLO definitions from file: ${errorMessage}`);
    }

    return this.defaultSLOs;
  }

  /**
   * Save SLO definitions to file
   */
  async saveSLODefinitions(sloDefinitions: Record<string, SLODefinition>): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.sloDefinitionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify(sloDefinitions, null, 2);
      await fs.promises.writeFile(this.sloDefinitionsPath, content, 'utf8');

      this.logger.log(`SLO definitions saved to: ${this.sloDefinitionsPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save SLO definitions: ${errorMessage}`);
    }
  }

  /**
   * Validate SLO definition
   */
  validateSLODefinition(slo: SLODefinition): string[] {
    const errors: string[] = [];

    if (!slo.description || slo.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (slo.p95Latency <= 0) {
      errors.push('p95Latency must be greater than 0');
    }

    if (slo.p95Latency > 60000) {
      // 60 seconds
      errors.push('p95Latency cannot exceed 60000ms (60 seconds)');
    }

    if (slo.errorRate < 0 || slo.errorRate > 100) {
      errors.push('errorRate must be between 0 and 100');
    }

    if (slo.throughput <= 0) {
      errors.push('throughput must be greater than 0');
    }

    if (slo.concurrentUsers <= 0) {
      errors.push('concurrentUsers must be greater than 0');
    }

    if (slo.concurrentUsers > 10000) {
      errors.push('concurrentUsers cannot exceed 10000 (sanity check)');
    }

    // Validate duration format
    const durationRegex = /^(\d+)([smhd])$/;
    if (!durationRegex.test(slo.duration)) {
      errors.push('duration must be in format like "15m", "1h", "30s"');
    }

    if (!slo.justification || slo.justification.trim().length === 0) {
      errors.push('Justification is required for audit trail');
    }

    return errors;
  }

  /**
   * Validate test results against SLO
   */
  validateAgainstSLO(
    sloName: string,
    slo: SLODefinition,
    actualMetrics: {
      p95Latency?: number;
      errorRate?: number;
      throughput?: number;
      concurrentUsers?: number;
    },
  ): SLOValidationResult {
    const violations: Array<{
      metric: string;
      expected: number | string;
      actual: number | string;
      deviation?: number;
    }> = [];

    let totalMetrics = 0;
    let passedMetrics = 0;

    // Validate latency
    if (actualMetrics.p95Latency !== undefined) {
      totalMetrics++;
      if (actualMetrics.p95Latency <= slo.p95Latency) {
        passedMetrics++;
      } else {
        const deviation = ((actualMetrics.p95Latency - slo.p95Latency) / slo.p95Latency) * 100;
        violations.push({
          metric: 'p95Latency',
          expected: `${slo.p95Latency}ms`,
          actual: `${actualMetrics.p95Latency.toFixed(2)}ms`,
          deviation,
        });
      }
    }

    // Validate error rate
    if (actualMetrics.errorRate !== undefined) {
      totalMetrics++;
      if (actualMetrics.errorRate <= slo.errorRate) {
        passedMetrics++;
      } else {
        violations.push({
          metric: 'errorRate',
          expected: `${slo.errorRate}%`,
          actual: `${actualMetrics.errorRate.toFixed(2)}%`,
        });
      }
    }

    // Validate throughput
    if (actualMetrics.throughput !== undefined) {
      totalMetrics++;
      if (actualMetrics.throughput >= slo.throughput) {
        passedMetrics++;
      } else {
        const deviation = ((slo.throughput - actualMetrics.throughput) / slo.throughput) * 100;
        violations.push({
          metric: 'throughput',
          expected: `${slo.throughput} req/sec`,
          actual: `${actualMetrics.throughput.toFixed(2)} req/sec`,
          deviation,
        });
      }
    }

    // Validate concurrent users (warning only, not a failure)
    if (actualMetrics.concurrentUsers !== undefined) {
      if (actualMetrics.concurrentUsers < slo.concurrentUsers) {
        this.logger.warn(
          `Concurrent users (${actualMetrics.concurrentUsers}) below SLO target (${slo.concurrentUsers}) for ${sloName}`,
        );
      }
    }

    const passRate = totalMetrics > 0 ? (passedMetrics / totalMetrics) * 100 : 100;

    return {
      sloName,
      compliant: violations.length === 0,
      violations,
      summary: {
        totalMetrics,
        passedMetrics,
        failedMetrics: totalMetrics - passedMetrics,
        passRate,
      },
    };
  }

  /**
   * Get SLO by name
   */
  async getSLO(sloName: string): Promise<SLODefinition | null> {
    const slos = await this.getSLODefinitions();
    return slos[sloName] || null;
  }

  /**
   * Update SLO definition
   */
  async updateSLO(sloName: string, updates: Partial<SLODefinition>): Promise<void> {
    const slos = await this.getSLODefinitions();

    const existingSLO = slos[sloName] || {
      description: '',
      p95Latency: 0,
      errorRate: 0,
      throughput: 0,
      concurrentUsers: 0,
      duration: '',
      justification: '',
    };

    const updatedSLO = { ...existingSLO, ...updates };

    // Validate before saving
    const errors = this.validateSLODefinition(updatedSLO);
    if (errors.length > 0) {
      throw new Error(`Invalid SLO definition: ${errors.join(', ')}`);
    }

    slos[sloName] = updatedSLO;
    await this.saveSLODefinitions(slos);
  }

  /**
   * Delete SLO definition
   */
  async deleteSLO(sloName: string): Promise<void> {
    const slos = await this.getSLODefinitions();

    if (!slos[sloName]) {
      throw new Error(`SLO ${sloName} not found`);
    }

    delete slos[sloName];
    await this.saveSLODefinitions(slos);
  }

  /**
   * Get SLO summary statistics
   */
  async getSLOSummary(): Promise<{
    total: number;
    byTag: Record<string, number>;
    complianceSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const slos = await this.getSLODefinitions();
    const sloArray = Object.values(slos);

    // Count by tag
    const byTag: Record<string, number> = {};
    sloArray.forEach((slo) => {
      slo.tags?.forEach((tag) => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    });

    // Categorize by compliance criticality (based on error rate tolerance)
    const complianceSummary = {
      critical: 0, // errorRate <= 0.1%
      high: 0, // errorRate <= 1.0%
      medium: 0, // errorRate <= 5.0%
      low: 0, // errorRate > 5.0%
    };

    sloArray.forEach((slo) => {
      if (slo.errorRate <= 0.1) {
        complianceSummary.critical++;
      } else if (slo.errorRate <= 1.0) {
        complianceSummary.high++;
      } else if (slo.errorRate <= 5.0) {
        complianceSummary.medium++;
      } else {
        complianceSummary.low++;
      }
    });

    return {
      total: sloArray.length,
      byTag,
      complianceSummary,
    };
  }

  /**
   * Generate SLO documentation
   */
  async generateDocumentation(): Promise<string> {
    const slos = await this.getSLODefinitions();
    const summary = await this.getSLOSummary();

    let doc = `# Service Level Objectives (SLOs)\n\n`;
    doc += `*Generated: ${new Date().toISOString()}*\n\n`;

    doc += `## Summary\n\n`;
    doc += `- **Total SLOs:** ${summary.total}\n`;
    doc += `- **Critical:** ${summary.complianceSummary.critical}\n`;
    doc += `- **High:** ${summary.complianceSummary.high}\n`;
    doc += `- **Medium:** ${summary.complianceSummary.medium}\n`;
    doc += `- **Low:** ${summary.complianceSummary.low}\n\n`;

    if (Object.keys(summary.byTag).length > 0) {
      doc += `## SLOs by Tag\n\n`;
      Object.entries(summary.byTag).forEach(([tag, count]) => {
        doc += `- **${tag}:** ${count} SLO${count !== 1 ? 's' : ''}\n`;
      });
      doc += `\n`;
    }

    doc += `## SLO Definitions\n\n`;

    Object.entries(slos).forEach(([name, slo]) => {
      doc += `### ${name}\n\n`;
      doc += `**Description:** ${slo.description}\n\n`;
      doc += `**Metrics:**\n`;
      doc += `- p95 Latency: ${slo.p95Latency}ms\n`;
      doc += `- Error Rate: ${slo.errorRate}%\n`;
      doc += `- Throughput: ${slo.throughput} req/sec\n`;
      doc += `- Concurrent Users: ${slo.concurrentUsers}\n`;
      doc += `- Duration: ${slo.duration}\n\n`;

      if (slo.tags && slo.tags.length > 0) {
        doc += `**Tags:** ${slo.tags.join(', ')}\n\n`;
      }

      doc += `**Justification:** ${slo.justification}\n\n`;
      doc += `---\n\n`;
    });

    return doc;
  }
}
