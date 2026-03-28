import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ControlVerificationResult {
  controlId: string;
  controlName: string;
  criteria: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  evidenceCount: number;
  verifiedBy: string;
  notes?: string;
}

interface ControlInfo {
  name: string;
  criteria: string;
  description: string;
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
export class Soc2ControlsService {
  private readonly logger = new Logger(Soc2ControlsService.name);

  private readonly CONTROL_MAPPING: Record<string, ControlInfo> = {
    'CC6.1': {
      name: 'Logical Access Security Software',
      criteria: 'Security',
      description:
        'Implement logical access security software, infrastructure, and architectures to protect information assets.',
    },
    'CC6.2': {
      name: 'Identification and Authentication',
      criteria: 'Security',
      description: 'Identify and authenticate users.',
    },
    'CC6.6': {
      name: 'Security Event Monitoring',
      criteria: 'Security',
      description: 'Implement security event monitoring.',
    },
    'A1.1': {
      name: 'Performance and Capacity Monitoring',
      criteria: 'Availability',
      description: 'Monitor performance and capacity.',
    },
    'A1.2': {
      name: 'Environmental Threat Protection',
      criteria: 'Availability',
      description: 'Protect against environmental threats.',
    },
    'C1.1': {
      name: 'Confidential Information Protection',
      criteria: 'Confidentiality',
      description: 'Protect confidential information.',
    },
    'PI1.1': {
      name: 'Processing Integrity',
      criteria: 'ProcessingIntegrity',
      description: 'Ensure processing integrity.',
    },
    'P1.1': {
      name: 'Privacy Notice and Communication',
      criteria: 'Privacy',
      description: 'Provide privacy notice and communication.',
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async verifyControl(
    controlId: string,
    evidence: unknown,
    verifiedBy: string = 'Soc2EvidenceService',
    notes?: string,
  ): Promise<ControlVerificationResult> {
    try {
      const controlInfo = this.CONTROL_MAPPING[controlId];

      if (!controlInfo) {
        throw new Error(`Unknown control ID: ${controlId}`);
      }

      let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'FAIL';
      let evidenceCount = 0;

      // Type-safe evidence checking
      if (evidence && typeof evidence === 'object') {
        const evidenceObj = evidence as Record<string, unknown>;

        if (Array.isArray(evidenceObj.data)) {
          evidenceCount = evidenceObj.data.length;
          status = evidenceCount > 0 ? 'PASS' : 'FAIL';
        } else if (
          evidenceObj.data &&
          typeof evidenceObj.data === 'object' &&
          Object.keys(evidenceObj.data).length > 0
        ) {
          evidenceCount = 1;
          status = 'PASS';
        } else if (evidenceObj.verified === true) {
          evidenceCount = 1;
          status = 'PASS';
        }

        // Check if evidence has any verification failures
        if (evidenceObj.verification?.verified === false) {
          status = 'FAIL';
        }
      }

      // Store verification record
      await this.prisma.controlVerification.create({
        data: {
          controlId,
          controlName: controlInfo.name,
          criteria: controlInfo.criteria,
          verificationDate: new Date(),
          status,
          evidenceCount,
          verifiedBy,
          notes,
        },
      });

      this.logger.log(
        `Control ${controlId} verified: ${status} (${evidenceCount} evidence items)`,
      );

      return {
        controlId,
        controlName: controlInfo.name,
        criteria: controlInfo.criteria,
        status,
        evidenceCount,
        verifiedBy,
        notes,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to verify control ${controlId}: ${errorMessage}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async getControlVerificationHistory(
    controlId?: string,
    criteria?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<ControlVerificationResult[]> {
    try {
      const where: Record<string, unknown> = {};

      if (controlId) {
        where.controlId = controlId;
      }

      if (criteria) {
        where.criteria = criteria;
      }

      if (startDate || endDate) {
        where.verificationDate = {};
        if (startDate) {
          (where.verificationDate as Record<string, Date>).gte = startDate;
        }
        if (endDate) {
          (where.verificationDate as Record<string, Date>).lte = endDate;
        }
      }

      const verifications = await this.prisma.controlVerification.findMany({
        where,
        orderBy: { verificationDate: 'desc' },
        take: limit,
      });

      return verifications.map((v) => ({
        controlId: v.controlId,
        controlName: v.controlName,
        criteria: v.criteria,
        status: v.status as 'PASS' | 'FAIL' | 'PARTIAL',
        evidenceCount: v.evidenceCount,
        verifiedBy: v.verifiedBy ?? 'unknown',
        notes: v.notes ?? undefined,
      }));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get control verification history: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getControlStatusSummary(
    days: number = 30,
  ): Promise<Record<string, unknown>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const verifications = await this.prisma.controlVerification.groupBy({
        by: ['criteria', 'status'],
        where: {
          verificationDate: { gte: cutoffDate },
        },
        _count: true,
      });

      const recentControls = await this.prisma.controlVerification.findMany({
        where: {
          verificationDate: { gte: cutoffDate },
        },
        distinct: ['controlId'],
        orderBy: { verificationDate: 'desc' },
      });

      const summary: Record<string, unknown> = {
        totalControls: Object.keys(this.CONTROL_MAPPING).length,
        verifiedControls: recentControls.length,
        byCriteria: {},
        overallStatus: this.calculateOverallStatus(verifications),
        lastVerification: recentControls[0]?.verificationDate ?? null,
      };

      for (const [controlId, info] of Object.entries(this.CONTROL_MAPPING)) {
        const criteriaKey = info.criteria;
        if (!(summary.byCriteria as Record<string, unknown>)[criteriaKey]) {
          (summary.byCriteria as Record<string, unknown>)[criteriaKey] = {
            total: 0,
            passed: 0,
            failed: 0,
            partial: 0,
            controls: [],
          };
        }

        const criteriaObj = (summary.byCriteria as Record<string, unknown>)[
          criteriaKey
        ] as Record<string, unknown>;
        const controlStatus = recentControls.find(
          (v) => v.controlId === controlId,
        );

        criteriaObj.total = (criteriaObj.total as number) + 1;

        const statusKey =
          controlStatus?.status?.toLowerCase() === 'pass'
            ? 'passed'
            : controlStatus?.status?.toLowerCase() === 'fail'
              ? 'failed'
              : controlStatus?.status?.toLowerCase() === 'partial'
                ? 'partial'
                : 'unknown';

        criteriaObj[statusKey] = (criteriaObj[statusKey] as number) + 1;

        (criteriaObj.controls as unknown[]).push({
          controlId,
          controlName: info.name,
          lastStatus: controlStatus?.status ?? 'NOT_VERIFIED',
          lastVerified: controlStatus?.verificationDate ?? null,
        });
      }

      return summary;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get control status summary: ${errorMessage}`,
      );
      throw error;
    }
  }

  private calculateOverallStatus(
    verifications: Array<{ status: string; _count: { id: number } }>,
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    const statusCounts = {
      PASS: 0,
      FAIL: 0,
      PARTIAL: 0,
    };

    for (const v of verifications) {
      if (v.status === 'PASS') statusCounts.PASS += v._count.id;
      else if (v.status === 'FAIL') statusCounts.FAIL += v._count.id;
      else if (v.status === 'PARTIAL') statusCounts.PARTIAL += v._count.id;
    }

    const total = statusCounts.PASS + statusCounts.FAIL + statusCounts.PARTIAL;

    if (total === 0) return 'CRITICAL';
    if (statusCounts.FAIL > 0) return 'CRITICAL';
    if (statusCounts.PARTIAL > statusCounts.PASS / 2) return 'WARNING';
    return 'HEALTHY';
  }

  async getControlDetails(controlId: string): Promise<Record<string, unknown>> {
    const controlInfo = this.CONTROL_MAPPING[controlId];

    if (!controlInfo) {
      throw new Error(`Unknown control ID: ${controlId}`);
    }

    const recentVerifications = await this.getControlVerificationHistory(
      controlId,
      undefined,
      undefined,
      undefined,
      10,
    );
    const evidenceRequirements = this.getEvidenceRequirements(controlId);

    return {
      controlId,
      ...controlInfo,
      recentVerifications,
      evidenceRequirements,
      implementationStatus: this.getImplementationStatus(controlId),
      nextVerificationDue: this.calculateNextVerificationDue(controlId),
    };
  }

  private getEvidenceRequirements(controlId: string): string[] {
    const requirements: Record<string, string[]> = {
      'CC6.1': [
        'Access control configuration',
        'User permission assignments',
        'Authentication logs',
        'Permission denial events',
      ],
      'CC6.2': [
        'User account records',
        'Authentication success/failure rates',
        'Password reset activities',
        'Account lockout events',
      ],
      'CC6.6': [
        'Security event logs',
        'System error events',
        'Unauthorized access attempts',
        'Integrity verification results',
      ],
      'A1.1': [
        'Performance test results',
        'Capacity metrics',
        'SLO compliance reports',
        'Load test scenarios',
      ],
      'A1.2': [
        'Health check results',
        'Database connection logs',
        'Backup verification records',
        'Incident response documentation',
      ],
      'C1.1': [
        'Tenant isolation configuration',
        'Data encryption status',
        'Access pattern logs',
        'RLS policy enforcement',
      ],
      'PI1.1': [
        'Audit integrity verification results',
        'Data validation logs',
        'Error handling records',
        'Transaction integrity checks',
      ],
      'P1.1': [
        'Data retention policies',
        'User consent records',
        'Privacy policy documentation',
        'Data access audit logs',
      ],
    };

    return requirements[controlId] ?? [];
  }

  private getImplementationStatus(
    controlId: string,
  ): 'IMPLEMENTED' | 'PARTIAL' | 'PLANNED' {
    const implementedControls = [
      'CC6.1',
      'CC6.2',
      'CC6.6',
      'A1.1',
      'A1.2',
      'C1.1',
      'PI1.1',
      'P1.1',
    ];
    return implementedControls.includes(controlId) ? 'IMPLEMENTED' : 'PLANNED';
  }

  private calculateNextVerificationDue(controlId: string): Date {
    const nextDate = new Date();

    if (controlId.startsWith('CC') || controlId.startsWith('A')) {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + 30);
    }

    return nextDate;
  }
}
