import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
  data: unknown;
  verification: {
    hash: string;
    source: string;
    verified: boolean;
  };
  summary?: Record<string, unknown>;
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

@Injectable()
export class Soc2EvidenceService {
  private readonly logger = new Logger(Soc2EvidenceService.name);
  private readonly evidenceDir = path.join(
    process.cwd(),
    'compliance/evidence',
  );
  private readonly retentionDays = 365;

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  async collectAllEvidence(): Promise<EvidenceCollectionResult[]> {
    this.logger.log('Starting SOC 2 evidence collection...');

    const startTime = Date.now();
    const results: EvidenceCollectionResult[] = [];

    try {
      const securityEvidence = await this.collectSecurityEvidence();
      results.push(...securityEvidence);

      const availabilityEvidence = await this.collectAvailabilityEvidence();
      results.push(...availabilityEvidence);

      const confidentialityEvidence =
        await this.collectConfidentialityEvidence();
      results.push(...confidentialityEvidence);

      const processingEvidence =
        await this.collectProcessingIntegrityEvidence();
      results.push(...processingEvidence);

      const privacyEvidence = await this.collectPrivacyEvidence();
      results.push(...privacyEvidence);

      this.storeEvidence(results);

      this.logger.log(
        `Evidence collection completed: ${results.length} controls collected in ${Date.now() - startTime}ms`,
      );

      return results;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Evidence collection failed: ${errorMessage}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  private async collectSecurityEvidence(): Promise<EvidenceCollectionResult[]> {
    const results: EvidenceCollectionResult[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      },
    });

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
      },
    });

    return results;
  }

  private async collectAvailabilityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const performanceResultsDir = path.join(
      process.cwd(),
      'tests/performance/results',
    );
    let performanceResults: unknown[] = [];

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
        const parsedContent = JSON.parse(content) as Record<string, unknown>;
        return {
          file,
          ...parsedContent,
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
        latestResult: performanceResults[0] ? new Date() : null,
      },
    });

    const healthCheckLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        entityType: 'SYSTEM',
        action: 'PERFORMANCE_METRIC',
        metadata: {
          path: ['endpoint'],
          string_contains: 'health',
        },
      },
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
      },
    });

    return results;
  }

  private async collectConfidentialityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];

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
      },
    });

    return results;
  }

  private async collectProcessingIntegrityEvidence(): Promise<
    EvidenceCollectionResult[]
  > {
    const results: EvidenceCollectionResult[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      },
    });

    return results;
  }

  private async collectPrivacyEvidence(): Promise<EvidenceCollectionResult[]> {
    const results: EvidenceCollectionResult[] = [];

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
      },
    });

    return results;
  }

  private storeEvidence(results: EvidenceCollectionResult[]): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const evidenceFile = path.join(
      this.evidenceDir,
      `evidence-${timestamp}.json`,
    );

    const evidencePackage = {
      collectedAt: new Date().toISOString(),
      system: 'HelixCRM',
      version: process.env.npm_package_version ?? 'unknown',
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

    fs.writeFileSync(
      evidenceFile,
      JSON.stringify(evidencePackage, null, 2),
      'utf8',
    );

    this.logger.log(`Evidence stored: ${evidenceFile}`);

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

  getCollectionHistory(limit: number = 10): Record<string, unknown>[] {
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
        return JSON.parse(content) as Record<string, unknown>;
      });

    return metadataFiles;
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async performGapAnalysis(): Promise<GapAnalysisResult[]> {
    const evidence = await this.collectAllEvidence();
    const gaps: GapAnalysisResult[] = [];

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
        const hasData = foundEvidence.some((e) => {
          if (!e.data) return false;
          if (Array.isArray(e.data)) return e.data.length > 0;
          if (typeof e.data === 'object') {
            return Object.keys(e.data as Record<string, unknown>).length > 0;
          }
          return true;
        });

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

    this.generateGapAnalysisReport(gaps);

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

    return recommendations[controlId] ?? 'Review control implementation';
  }

  private generateGapAnalysisReport(gaps: GapAnalysisResult[]): void {
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

  cleanupOldEvidence(): void {
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
