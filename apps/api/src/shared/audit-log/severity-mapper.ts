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
        return 'LOW';
      case 'warning':
        return 'MEDIUM';
      case 'error':
        return 'HIGH';
      case 'security':
        return 'CRITICAL';
      default:
        return 'LOW';
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
        return 'LOW';
      case 'warn':
        return 'MEDIUM';
      case 'error':
        return 'HIGH';
      case 'fatal':
        return 'CRITICAL';
      default:
        return 'LOW';
    }
  }
}
