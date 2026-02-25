// src/shared/audit-log/severity-mapper.ts
import { AuditSeverity } from './audit-log.service';

export class SeverityMapper {
  /**
   * Map business event type to audit severity
   * Enterprise Standard: INFO → LOW, WARNING → MEDIUM, ERROR → HIGH, SECURITY → CRITICAL
   */
  static forEventType(
    eventType: 'info' | 'warning' | 'error' | 'security',
  ): AuditSeverity {
    switch (eventType) {
      case 'info':
        return AuditSeverity.LOW;
      case 'warning':
        return AuditSeverity.MEDIUM;
      case 'error':
        return AuditSeverity.HIGH;
      case 'security':
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.LOW;
    }
  }

  /**
   * Map log level to audit severity
   */
  static fromLogLevel(
    level: 'info' | 'warn' | 'error' | 'fatal',
  ): AuditSeverity {
    switch (level) {
      case 'info':
        return AuditSeverity.LOW;
      case 'warn':
        return AuditSeverity.MEDIUM;
      case 'error':
        return AuditSeverity.HIGH;
      case 'fatal':
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.LOW;
    }
  }
}
