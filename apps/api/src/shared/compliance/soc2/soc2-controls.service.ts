// apps/api/src/shared/compliance/soc2/soc2-controls.service.ts
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

@Injectable()
export class Soc2ControlsService {
  private readonly logger = new Logger(Soc2ControlsService.name);

  // SOC 2 Trust Service Criteria mapping
  private readonly CONTROL_MAPPING = {
    // Security Criteria (CC Series)
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
    // Availability Criteria (A Series)
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
    // Confidentiality Criteria (C Series)
    'C1.1': {
      name: 'Confidential Information Protection',
      criteria: 'Confidentiality',
      description: 'Protect confidential information.',
    },
    // Processing Integrity Criteria (PI Series)
    'PI1.1': {
      name: 'Processing Integrity',
      criteria: 'ProcessingIntegrity',
      description: 'Ensure processing integrity.',
    },
    // Privacy Criteria (P Series)
    'P1.1': {
      name: 'Privacy Notice and Communication',
      criteria: 'Privacy',
      description: 'Provide privacy notice and communication.',
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async verifyControl(
    controlId: string,
    evidence: any,
    verifiedBy: string = 'Soc2EvidenceService',
    notes?: string,
  ): Promise<ControlVerificationResult> {
    try {
      const controlInfo = this.CONTROL_MAPPING[controlId];

      if (!controlInfo) {
        throw new Error(`Unknown control ID: ${controlId}`);
      }

      // Determine status based on evidence
      let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'FAIL';
      let evidenceCount = 0;

      if (evidence) {
        if (Array.isArray(evidence.data)) {
          evidenceCount = evidence.data.length;
          status = evidenceCount > 0 ? 'PASS' : 'FAIL';
        } else if (
          typeof evidence.data === 'object' &&
          Object.keys(evidence.data).length > 0
        ) {
          evidenceCount = 1;
          status = 'PASS';
        } else if (evidence.verified === true) {
          evidenceCount = 1;
          status = 'PASS';
        }
      }

      // Check if evidence has any verification failures
      if (evidence?.verification?.verified === false) {
        status = 'FAIL';
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
    } catch (error) {
      this.logger.error(
        `Failed to verify control ${controlId}: ${error.message}`,
        error.stack,
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
      const where: any = {};

      if (controlId) {
        where.controlId = controlId;
      }

      if (criteria) {
        where.criteria = criteria;
      }

      if (startDate || endDate) {
        where.verificationDate = {};
        if (startDate) {
          where.verificationDate.gte = startDate;
        }
        if (endDate) {
          where.verificationDate.lte = endDate;
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
        verifiedBy: v.verifiedBy || 'unknown',
        notes: v.notes || undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get control verification history: ${error.message}`,
      );
      throw error;
    }
  }

  async getControlStatusSummary(
    days: number = 30,
  ): Promise<Record<string, any>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get recent verifications grouped by criteria
      const verifications = await this.prisma.controlVerification.groupBy({
        by: ['criteria', 'status'],
        where: {
          verificationDate: { gte: cutoffDate },
        },
        _count: true,
      });

      // Calculate overall status for each control
      const recentControls = await this.prisma.controlVerification.findMany({
        where: {
          verificationDate: { gte: cutoffDate },
        },
        distinct: ['controlId'],
        orderBy: { verificationDate: 'desc' },
      });

      const summary = {
        totalControls: Object.keys(this.CONTROL_MAPPING).length,
        verifiedControls: recentControls.length,
        byCriteria: {},
        overallStatus: this.calculateOverallStatus(verifications),
        lastVerification: recentControls[0]?.verificationDate || null,
      };

      // Organize by criteria
      for (const [criteria, info] of Object.entries(this.CONTROL_MAPPING)) {
        const criteriaKey = info.criteria;
        if (!summary.byCriteria[criteriaKey]) {
          summary.byCriteria[criteriaKey] = {
            total: 0,
            passed: 0,
            failed: 0,
            partial: 0,
            controls: [],
          };
        }

        const controlStatus = recentControls.find(
          (v) => v.controlId === criteria,
        );
        summary.byCriteria[criteriaKey].total++;
        summary.byCriteria[criteriaKey][
          controlStatus?.status.toLowerCase() || 'unknown'
        ]++;
        summary.byCriteria[criteriaKey].controls.push({
          controlId: criteria,
          controlName: info.name,
          lastStatus: controlStatus?.status || 'NOT_VERIFIED',
          lastVerified: controlStatus?.verificationDate || null,
        });
      }

      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to get control status summary: ${error.message}`,
      );
      throw error;
    }
  }

  private calculateOverallStatus(
    verifications: any[],
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    const statusCounts = {
      PASS: 0,
      FAIL: 0,
      PARTIAL: 0,
    };

    verifications.forEach((v) => {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + v._count;
    });

    const total = statusCounts.PASS + statusCounts.FAIL + statusCounts.PARTIAL;

    if (total === 0) return 'CRITICAL';
    if (statusCounts.FAIL > 0) return 'CRITICAL';
    if (statusCounts.PARTIAL > statusCounts.PASS / 2) return 'WARNING'; // More than 50% partial
    return 'HEALTHY';
  }

  async getControlDetails(controlId: string): Promise<any> {
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
    const requirements = {
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

    return requirements[controlId] || [];
  }

  private getImplementationStatus(
    controlId: string,
  ): 'IMPLEMENTED' | 'PARTIAL' | 'PLANNED' {
    // This should be enhanced to check actual implementation
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

    // Different verification frequencies based on control criticality
    if (controlId.startsWith('CC')) {
      // Security controls: weekly
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (controlId.startsWith('A')) {
      // Availability controls: weekly
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      // Other controls: monthly
      nextDate.setDate(nextDate.getDate() + 30);
    }

    return nextDate;
  }
}
