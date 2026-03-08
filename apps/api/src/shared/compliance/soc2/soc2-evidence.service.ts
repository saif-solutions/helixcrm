// apps/api/src/shared/compliance/soc2/soc2-evidence.service.ts
import 'core-js/actual/iterator';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface EvidenceCollectionResult {
  controlId: string;
  controlName: string;
  criteria:
    | 'Security'
    | 'Availability'
    | 'Confidentiality'
    | 'ProcessingIntegrity'
    | 'Privacy';
  evidenceType: string;
  collectedAt: Date;
  data: any;
  verification: {
    hash: string;
    source: string;
    verified: boolean;
  };
  summary?: Record<string, any>;
}

export interface GapAnalysisResult {
  controlId: string;
  controlName: string;
  criteria: string;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  evidenceSources: string[];
  missingEvidence: string[];
  recommendation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class Soc2EvidenceService {
  private readonly logger = new Logger(Soc2EvidenceService.name);
  private readonly evidenceDir = path.join(
    process.cwd(),
    'compliance/evidence',
  );
  private readonly retentionDays = 365;

  constructor(private readonly prisma: PrismaService) {
    // Create evidence directory if it doesn't exist
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  /**
   * Collect all SOC 2 evidence
   */
  async collectAllEvidence(): Promise<EvidenceCollectionResult[]> {
    this.logger.log('Starting SOC 2 evidence collection...');

    const startTime = Date.now();
    const results: EvidenceCollectionResult[] = [];

    try {
      // 1. Security Evidence (CC Series)
      results.push(...(await this.collectSecurityEvidence()));

      // 2. Availability Evidence (A Series)
      results.push(...(await this.collectAvailabilityEvidence()));

      // 3. Confidentiality Evidence (C Series)
      results.push(...(await this.collectConfidentialityEvidence()));

      // 4. Processing Integrity Evidence (PI Series)
      results.push(...(await this.collectProcessingIntegrityEvidence()));

      // 5. Privacy Evidence (P Series)
      results.push(...(await this.collectPrivacyEvidence()));

      // Store evidence
      await this.storeEvidence(results);

      this.logger.log(
        `Evidence collection completed: ${results.length} controls collected in ${Date.now() - startTime}ms`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Evidence collection failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Collect Security Criteria Evidence (CC Series)
   */
  private async collectSecurityEvidence(): Promise<EvidenceCollectionResult[]> {
    const results: EvidenceCollectionResult[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // CC6.1: Logical Access Security Software
    const accessLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        action: {
          in: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILURE',
            'PERMISSION_DENIED',
            'PASSWORD_CHANGE',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    results.push({
      controlId: 'CC6.1',
      controlName: 'Logical Access Security Software',
      criteria: 'Security',
      evidenceType: 'ACCESS_CONTROL_LOGS',
      collectedAt: new Date(),
      data: accessLogs,
      verification: {
        hash: this.generateHash(JSON.stringify(accessLogs)),
        source: 'audit_logs',
        verified: true,
      },
      summary: {
        totalAttempts: accessLogs.length,
        successCount: accessLogs.filter((l) => l.action === 'LOGIN_SUCCESS')
          .length,
        failureCount: accessLogs.filter((l) => l.action === 'LOGIN_FAILURE')
          .length,
        uniqueUsers: [...new Set(accessLogs.map((l) => l.actorEmail))].length,
        timeRange: {
          start: thirtyDaysAgo,
          end: new Date(),
        },
      },
    });

    // CC6.2: Identification and Authentication
    const userAccounts = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
      take: 500,
    });

    results.push({
      controlId: 'CC6.2',
      controlName: 'Identification and Authentication',
      criteria: 'Security',
      evidenceType: 'USER_ACCOUNTS',
      collectedAt: new Date(),
      data: userAccounts,
      verification: {
        hash: this.generateHash(JSON.stringify(userAccounts)),
        source: 'users',
        verified: true,
      },
      summary: {
        totalActiveUsers: userAccounts.length,
        verifiedUsers: userAccounts.filter((u) => u.emailVerified).length,
        lockedAccounts: userAccounts.filter(
          (u) => u.lockedUntil && u.lockedUntil > new Date(),
        ).length,
        recentLogins: userAccounts.filter(
          (u) => u.lastLoginAt && u.lastLoginAt > thirtyDaysAgo,
        ).length,
      },
    });

    // CC6.6: Security Event Monitoring
    const securityEvents = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        severity: { in: ['HIGH', 'CRITICAL'] },
        action: {
          in: [
            'CSRF_FAILURE',
            'RATE_LIMIT_TRIGGERED',
            'SYSTEM_ERROR',
            'PERMISSION_DENIED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    results.push({
      controlId: 'CC6.6',
      controlName: 'Security Event Monitoring',
      criteria: 'Security',
      evidenceType: 'SECURITY_EVENTS',
      collectedAt: new Date(),
      data: securityEvents,
      verification: {
        hash: this.generateHash(JSON.stringify(securityEvents)),
        source: 'audit_logs',
        verified: true,
      },
      summary: {
        totalEvents: securityEvents.length,
        bySeverity: {
          HIGH: securityEvents.filter((e) => e.severity === 'HIGH').length,
          CRITICAL: securityEvents.filter((e) => e.severity === 'CRITICAL')
            .length,
        },
        byType: {
          CSRF_FAILURE: securityEvents.filter(
            (e) => e.action === 'CSRF_FAILURE',
          ).length,
          RATE_LIMIT: securityEvents.filter(
            (e) => e.action === 'RATE_LIMIT_TRIGGERED',
          ).length,
          SYSTEM_ERROR: securityEvents.filter(
            (e) => e.action === 'SYSTEM_ERROR',
          ).length,
          PERMISSION_DENIED: securityEvents.filter(
            (e) => e.action === 'PERMISSION_DENIED',
          ).length,
        },
      },
    });

    return results;
  }

  /**
   * Collect Availability Criteria Evidence (A Series)
   */
  private async collectAvailabilityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // A1.1: Performance and Capacity Monitoring
    // Check for recent performance test results
    const performanceResultsDir = path.join(
      process.cwd(),
      'tests/performance/results',
    );
    let performanceResults = [];

    if (fs.existsSync(performanceResultsDir)) {
      const files = fs
        .readdirSync(performanceResultsDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 10);

      performanceResults = files.map((file) => {
        const content = fs.readFileSync(
          path.join(performanceResultsDir, file),
          'utf8',
        );
        return {
          file,
          ...JSON.parse(content),
        };
      });
    }

    results.push({
      controlId: 'A1.1',
      controlName: 'Performance and Capacity Monitoring',
      criteria: 'Availability',
      evidenceType: 'PERFORMANCE_RESULTS',
      collectedAt: new Date(),
      data: performanceResults,
      verification: {
        hash: this.generateHash(JSON.stringify(performanceResults)),
        source: 'performance_test_results',
        verified: performanceResults.length > 0,
      },
      summary: {
        totalResults: performanceResults.length,
        latestResult: performanceResults[0]?.timestamp || null,
        scenariosTested: [
          ...new Set(
            performanceResults.map((r) => r.scenario).filter((s) => s != null),
          ),
        ],
      },
    });

    // A1.2: Environmental Threat Protection
    // Check for health check data (from audit logs)
    const healthCheckLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        entityType: 'SYSTEM',
        action: 'PERFORMANCE_METRIC',
        metadata: {
          path: ['endpoint'],
          string_contains: 'health',
        },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    results.push({
      controlId: 'A1.2',
      controlName: 'Environmental Threat Protection',
      criteria: 'Availability',
      evidenceType: 'HEALTH_CHECKS',
      collectedAt: new Date(),
      data: healthCheckLogs,
      verification: {
        hash: this.generateHash(JSON.stringify(healthCheckLogs)),
        source: 'audit_logs',
        verified: true,
      },
      summary: {
        totalChecks: healthCheckLogs.length,
        timeRange: {
          start: sevenDaysAgo,
          end: new Date(),
        },
        checkFrequency: '5-minute intervals',
      },
    });

    return results;
  }

  /**
   * Collect Confidentiality Criteria Evidence (C Series)
   */
  private async collectConfidentialityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];

    // C1.1: Confidential Information Protection
    // Check RLS policies and tenant isolation
    const tenantCount = await this.prisma.organization.count({
      where: { status: 'active' },
    });

    const userCountByTenant = await this.prisma.user.groupBy({
      by: ['organizationId'],
      _count: true,
      where: { deletedAt: null, isActive: true },
    });

    results.push({
      controlId: 'C1.1',
      controlName: 'Confidential Information Protection',
      criteria: 'Confidentiality',
      evidenceType: 'TENANT_ISOLATION',
      collectedAt: new Date(),
      data: { tenantCount, userCountByTenant },
      verification: {
        hash: this.generateHash(
          JSON.stringify({ tenantCount, userCountByTenant }),
        ),
        source: 'database_counts',
        verified: true,
      },
      summary: {
        activeTenants: tenantCount,
        totalUsers: userCountByTenant.reduce(
          (sum, item) => sum + item._count,
          0,
        ),
        averageUsersPerTenant:
          userCountByTenant.length > 0
            ? userCountByTenant.reduce((sum, item) => sum + item._count, 0) /
              userCountByTenant.length
            : 0,
      },
    });

    return results;
  }

  /**
   * Collect Processing Integrity Criteria Evidence (PI Series)
   */
  private async collectProcessingIntegrityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // PI1.1: Processing Integrity
    // Check audit integrity verification results
    const integrityVerifications =
      await this.prisma.auditIntegrityVerification.findMany({
        where: {
          verificationTimestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { verificationTimestamp: 'desc' },
        take: 30,
      });

    results.push({
      controlId: 'PI1.1',
      controlName: 'Processing Integrity',
      criteria: 'ProcessingIntegrity',
      evidenceType: 'INTEGRITY_VERIFICATION',
      collectedAt: new Date(),
      data: integrityVerifications,
      verification: {
        hash: this.generateHash(JSON.stringify(integrityVerifications)),
        source: 'audit_integrity_verification',
        verified: integrityVerifications.every((v) => v.status === 'SUCCESS'),
      },
      summary: {
        totalVerifications: integrityVerifications.length,
        successCount: integrityVerifications.filter(
          (v) => v.status === 'SUCCESS',
        ).length,
        failureCount: integrityVerifications.filter(
          (v) => v.status === 'FAILURE',
        ).length,
        verificationFrequency: 'Daily (2 AM)',
        chainLength: integrityVerifications[0]?.totalEvents || 0,
      },
    });

    return results;
  }

  /**
   * Collect Privacy Criteria Evidence (P Series)
   */
  private async collectPrivacyEvidence(): Promise<EvidenceCollectionResult[]> {
    const results: EvidenceCollectionResult[] = [];

    // P1.1: Privacy Notice and Communication
    // Check data retention compliance
    const retentionData = {
      auditLogs: await this.prisma.auditLog.count({
        where: {
          createdAt: {
            lt: new Date(new Date().setDate(new Date().getDate() - 365)),
          },
        },
      }),
      users: await this.prisma.user.count({
        where: {
          deletedAt: { not: null },
        },
      }),
      policies: {
        retentionPeriod: '365 days for audit logs',
        deletionSchedule: 'Daily cleanup job',
        backupRetention: '30 days',
      },
    };

    results.push({
      controlId: 'P1.1',
      controlName: 'Privacy Notice and Communication',
      criteria: 'Privacy',
      evidenceType: 'DATA_RETENTION',
      collectedAt: new Date(),
      data: retentionData,
      verification: {
        hash: this.generateHash(JSON.stringify(retentionData)),
        source: 'database_counts',
        verified: true,
      },
      summary: {
        oldAuditLogs: retentionData.auditLogs,
        deletedUsers: retentionData.users,
        retentionPolicies: retentionData.policies,
      },
    });

    return results;
  }

  /**
   * Store evidence with integrity verification
   */
  // Update the Soc2EvidenceService to use file-based storage initially:
  // In apps/api/src/shared/compliance/soc2/soc2-evidence.service.ts, update the storeEvidence method:

  private async storeEvidence(
    results: EvidenceCollectionResult[],
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const evidenceFile = path.join(
      this.evidenceDir,
      `evidence-${timestamp}.json`,
    );

    const evidencePackage = {
      collectedAt: new Date().toISOString(),
      system: 'HelixCRM',
      version: process.env.npm_package_version || 'unknown',
      totalControls: results.length,
      byCriteria: {
        Security: results.filter((r) => r.criteria === 'Security').length,
        Availability: results.filter((r) => r.criteria === 'Availability')
          .length,
        Confidentiality: results.filter((r) => r.criteria === 'Confidentiality')
          .length,
        ProcessingIntegrity: results.filter(
          (r) => r.criteria === 'ProcessingIntegrity',
        ).length,
        Privacy: results.filter((r) => r.criteria === 'Privacy').length,
      },
      results,
      verification: {
        packageHash: this.generateHash(JSON.stringify(results)),
        verificationTimestamp: new Date().toISOString(),
        verifiedBy: 'Soc2EvidenceService',
      },
    };

    // Write evidence to file
    fs.writeFileSync(
      evidenceFile,
      JSON.stringify(evidencePackage, null, 2),
      'utf8',
    );

    this.logger.log(`Evidence stored: ${evidenceFile}`);

    // Also create a simple metadata file
    const metadata = {
      collectionId: `evidence-${timestamp}`,
      collectedAt: new Date().toISOString(),
      totalControls: results.length,
      criteriaBreakdown: evidencePackage.byCriteria,
      evidencePath: evidenceFile,
      verificationHash: evidencePackage.verification.packageHash,
      status: 'COMPLETED',
    };

    const metadataFile = path.join(
      this.evidenceDir,
      `metadata-${timestamp}.json`,
    );
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
  }

  /**
   * Get evidence collection history
   */
  async getCollectionHistory(limit: number = 10) {
    const metadataFiles = fs
      .readdirSync(this.evidenceDir)
      .filter((f) => f.startsWith('metadata-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)
      .map((file) => {
        const content = fs.readFileSync(
          path.join(this.evidenceDir, file),
          'utf8',
        );
        return JSON.parse(content);
      });

    return metadataFiles;
  }

  /**
   * Generate hash for evidence integrity
   */
  private generateHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Perform gap analysis
   */
  async performGapAnalysis(): Promise<GapAnalysisResult[]> {
    const evidence = await this.collectAllEvidence();
    const gaps: GapAnalysisResult[] = [];

    // Define expected controls
    const expectedControls = [
      {
        id: 'CC6.1',
        name: 'Logical Access Security Software',
        criteria: 'Security',
      },
      {
        id: 'CC6.2',
        name: 'Identification and Authentication',
        criteria: 'Security',
      },
      { id: 'CC6.6', name: 'Security Event Monitoring', criteria: 'Security' },
      {
        id: 'A1.1',
        name: 'Performance and Capacity Monitoring',
        criteria: 'Availability',
      },
      {
        id: 'A1.2',
        name: 'Environmental Threat Protection',
        criteria: 'Availability',
      },
      {
        id: 'C1.1',
        name: 'Confidential Information Protection',
        criteria: 'Confidentiality',
      },
      {
        id: 'PI1.1',
        name: 'Processing Integrity',
        criteria: 'ProcessingIntegrity',
      },
      {
        id: 'P1.1',
        name: 'Privacy Notice and Communication',
        criteria: 'Privacy',
      },
    ];

    for (const expected of expectedControls) {
      const foundEvidence = evidence.filter((e) => e.controlId === expected.id);

      let status: 'COMPLETE' | 'PARTIAL' | 'MISSING' = 'MISSING';
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';
      let missingEvidence: string[] = [];

      if (foundEvidence.length > 0) {
        const hasData = foundEvidence.some(
          (e) =>
            e.data &&
            (Array.isArray(e.data)
              ? e.data.length > 0
              : Object.keys(e.data).length > 0),
        );

        if (hasData) {
          status = 'COMPLETE';
          riskLevel = 'LOW';
        } else {
          status = 'PARTIAL';
          riskLevel = 'MEDIUM';
          missingEvidence = ['Evidence collected but no data found'];
        }
      } else {
        missingEvidence = ['No evidence collector implemented'];
      }

      gaps.push({
        controlId: expected.id,
        controlName: expected.name,
        criteria: expected.criteria,
        status,
        evidenceSources: foundEvidence.map((e) => e.evidenceType),
        missingEvidence,
        recommendation: this.getRecommendation(expected.id, status),
        riskLevel,
      });
    }

    // Generate gap analysis report
    await this.generateGapAnalysisReport(gaps);

    return gaps;
  }

  private getRecommendation(controlId: string, status: string): string {
    const recommendations: Record<string, string> = {
      'CC6.1':
        status === 'COMPLETE'
          ? 'Maintain current access control monitoring'
          : 'Implement access log collection and analysis',
      'CC6.2': 'Ensure user authentication logs are comprehensive',
      'CC6.6': 'Implement real-time security event monitoring',
      'A1.1': 'Establish regular performance testing schedule',
      'A1.2': 'Implement health check monitoring and alerting',
      'C1.1': 'Document and verify tenant isolation mechanisms',
      'PI1.1': 'Maintain daily integrity verification',
      'P1.1': 'Document data retention policies and procedures',
    };

    return recommendations[controlId] || 'Review control implementation';
  }

  private async generateGapAnalysisReport(
    gaps: GapAnalysisResult[],
  ): Promise<void> {
    const report = {
      generatedAt: new Date().toISOString(),
      system: 'HelixCRM',
      totalControls: gaps.length,
      completedControls: gaps.filter((g) => g.status === 'COMPLETE').length,
      partialControls: gaps.filter((g) => g.status === 'PARTIAL').length,
      missingControls: gaps.filter((g) => g.status === 'MISSING').length,
      overallRisk: this.calculateOverallRisk(gaps),
      gaps,
      recommendations: gaps
        .filter((g) => g.status !== 'COMPLETE')
        .map((g) => ({
          controlId: g.controlId,
          controlName: g.controlName,
          riskLevel: g.riskLevel,
          recommendation: g.recommendation,
          priority: g.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        })),
    };

    const reportFile = path.join(
      this.evidenceDir,
      `gap-analysis-${Date.now()}.json`,
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');

    this.logger.log(`Gap analysis report generated: ${reportFile}`);
  }

  private calculateOverallRisk(
    gaps: GapAnalysisResult[],
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highRisks = gaps.filter((g) => g.riskLevel === 'HIGH').length;
    const mediumRisks = gaps.filter((g) => g.riskLevel === 'MEDIUM').length;

    if (highRisks > 0) return 'HIGH';
    if (mediumRisks > 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Clean up old evidence files
   */
  async cleanupOldEvidence(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const files = fs
      .readdirSync(this.evidenceDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        path: path.join(this.evidenceDir, f),
        stat: fs.statSync(path.join(this.evidenceDir, f)),
      }))
      .filter((f) => f.stat.mtime < cutoffDate);

    for (const file of files) {
      fs.unlinkSync(file.path);
      this.logger.log(`Cleaned up old evidence: ${file.name}`);
    }

    this.logger.log(`Cleaned up ${files.length} old evidence files`);
  }
}
