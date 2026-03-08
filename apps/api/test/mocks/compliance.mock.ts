// test/mocks/compliance.mock.ts
import { jest } from '@jest/globals';

// Mock Soc2EvidenceService
export const mockSoc2EvidenceService = {
  collectAllEvidence: jest.fn().mockResolvedValue([] as never),
  collectSecurityEvidence: jest.fn().mockResolvedValue([] as never),
  generateHash: jest.fn().mockReturnValue('mock-hash-123' as never),
  verifyEvidence: jest.fn().mockResolvedValue(true as never),
};

// Mock ComplianceSchedulerService
export const mockComplianceSchedulerService = {
  collectDailyEvidence: jest.fn().mockResolvedValue(undefined as never),
  scheduleComplianceTasks: jest.fn().mockResolvedValue(undefined as never),
};

// Mock the entire compliance module
jest.mock('../../src/shared/compliance/soc2/soc2-evidence.service', () => ({
  Soc2EvidenceService: jest.fn().mockImplementation(() => mockSoc2EvidenceService),
}));

jest.mock('../../src/shared/compliance/compliance-scheduler.service', () => ({
  ComplianceSchedulerService: jest.fn().mockImplementation(() => mockComplianceSchedulerService),
}));