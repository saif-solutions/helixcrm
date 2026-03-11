// Mock Prisma before any imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

jest.mock('../../../src/shared/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      count: jest.fn(),
    },
    auditIntegrityVerification: {
      findMany: jest.fn(),
    },
  })),
}));

import { Soc2EvidenceService } from '@api/shared/compliance/soc2/soc2-evidence.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash-123'),
  }),
}));

describe('Soc2EvidenceService', () => {
  let service: Soc2EvidenceService;
  let prismaMock: any;
  let mockDate: Date;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDate = new Date('2024-01-15T10:30:00.000Z');

    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    // Mock fs.existsSync to return true for evidence directory
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock process.cwd
    const mockCwd = '/test/path';
    Object.defineProperty(process, 'cwd', {
      value: jest.fn().mockReturnValue(mockCwd),
    });

    // Mock path.join to return consistent paths
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Create mock prisma
    prismaMock = {
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      organization: {
        count: jest.fn(),
      },
      auditIntegrityVerification: {
        findMany: jest.fn(),
      },
    };

    // Mock PrismaService to return our mock
    (PrismaService as jest.Mock).mockImplementation(() => prismaMock);

    // Create service instance
    service = new Soc2EvidenceService(prismaMock as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectAllEvidence', () => {
    const mockAccessLogs = [
      { id: 1, action: 'LOGIN_SUCCESS', createdAt: new Date() },
      { id: 2, action: 'LOGIN_FAILURE', createdAt: new Date() },
    ];

    const mockUserAccounts = [
      { id: 1, email: 'user1@test.com', emailVerified: true, lastLoginAt: new Date(), failedLoginAttempts: 0 },
      { id: 2, email: 'user2@test.com', emailVerified: true, lastLoginAt: new Date(), failedLoginAttempts: 2 },
    ];

    const mockSecurityEvents = [
      { id: 1, severity: 'HIGH', action: 'CSRF_FAILURE', createdAt: new Date() },
      { id: 2, severity: 'CRITICAL', action: 'SYSTEM_ERROR', createdAt: new Date() },
    ];

    const mockHealthChecks = [
      { id: 1, entityType: 'SYSTEM', action: 'PERFORMANCE_METRIC', metadata: { endpoint: '/health' } },
    ];

    const mockIntegrityVerifications = [
      { id: 1, status: 'SUCCESS', totalEvents: 150 },
    ];

    beforeEach(() => {
      // Mock all the evidence collection methods
      prismaMock.auditLog.findMany
        .mockResolvedValueOnce(mockAccessLogs)  // CC6.1 access logs
        .mockResolvedValueOnce(mockSecurityEvents)  // CC6.6 security events
        .mockResolvedValueOnce(mockHealthChecks);  // A1.2 health checks

      prismaMock.user.findMany.mockResolvedValue(mockUserAccounts);  // CC6.2 user accounts
      prismaMock.organization.count.mockResolvedValue(5);  // C1.1 tenant count
      prismaMock.user.groupBy.mockResolvedValue([
        { organizationId: 'org1', _count: 5 },
        { organizationId: 'org2', _count: 3 },
      ]);
      prismaMock.auditIntegrityVerification.findMany.mockResolvedValue(mockIntegrityVerifications);  // PI1.1 integrity verifications
      
      // Mock count methods for privacy evidence
      prismaMock.auditLog.count.mockResolvedValue(500);
      prismaMock.user.count.mockResolvedValue(50);

      // Mock file system for A1.1 performance results
      (fs.readdirSync as jest.Mock).mockReturnValue(['result1.json', 'result2.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ timestamp: '2024-01-15', scenario: 'test' }));
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should collect all evidence successfully', async () => {
      // Act
      const results = await service.collectAllEvidence();

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // Check security evidence
      const securityEvidence = results.filter(r => r.criteria === 'Security');
      expect(securityEvidence.length).toBe(3); // CC6.1, CC6.2, CC6.6
      
      // Check availability evidence
      const availabilityEvidence = results.filter(r => r.criteria === 'Availability');
      expect(availabilityEvidence.length).toBe(2); // A1.1, A1.2
      
      // Check confidentiality evidence
      const confidentialityEvidence = results.filter(r => r.criteria === 'Confidentiality');
      expect(confidentialityEvidence.length).toBe(1); // C1.1
      
      // Check processing integrity evidence
      const integrityEvidence = results.filter(r => r.criteria === 'ProcessingIntegrity');
      expect(integrityEvidence.length).toBe(1); // PI1.1
      
      // Check privacy evidence
      const privacyEvidence = results.filter(r => r.criteria === 'Privacy');
      expect(privacyEvidence.length).toBe(1); // P1.1

      // Verify storeEvidence was called (via file writes)
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle errors during collection', async () => {
      // Arrange
      jest.clearAllMocks();
      
      // Reset all prisma mocks
      prismaMock.auditLog.findMany.mockReset();
      prismaMock.user.findMany.mockReset();
      prismaMock.organization.count.mockReset();
      prismaMock.user.groupBy.mockReset();
      prismaMock.auditIntegrityVerification.findMany.mockReset();
      
      // Mock the first call to throw an error
      prismaMock.auditLog.findMany.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.collectAllEvidence()).rejects.toThrow('Database error');
    });

    it('should log collection start and completion', async () => {
      // Arrange
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      
      // Act
      await service.collectAllEvidence();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Starting SOC 2 evidence collection...');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Evidence collection completed')
      );
    });

    it('should create evidence directory if it does not exist', async () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      // Create service with new mock
      service = new Soc2EvidenceService(prismaMock as any);

      // Act
      await service.collectAllEvidence();

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('collectSecurityEvidence', () => {
    it('should collect CC6.1 evidence', async () => {
      // Arrange
      const mockLogs = [{ id: 1, action: 'LOGIN_SUCCESS' }];
      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.auditLog.findMany.mockResolvedValueOnce(mockLogs);

      // Act
      const results = await (service as any).collectSecurityEvidence();

      // Assert
      expect(results).toBeDefined();
      expect(results[0].controlId).toBe('CC6.1');
      expect(results[0].criteria).toBe('Security');
    });

    it('should collect CC6.2 evidence', async () => {
      // Arrange
      const mockUsers = [{ id: 1, email: 'test@test.com' }];
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      // Act
      const results = await (service as any).collectSecurityEvidence();

      // Assert
      const cc62Result = results.find(r => r.controlId === 'CC6.2');
      expect(cc62Result).toBeDefined();
      expect(cc62Result.criteria).toBe('Security');
    });

    it('should collect CC6.6 evidence', async () => {
      // Arrange
      const mockEvents = [{ id: 1, severity: 'HIGH', action: 'CSRF_FAILURE' }];
      prismaMock.auditLog.findMany.mockResolvedValue(mockEvents);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.auditLog.findMany.mockResolvedValueOnce(mockEvents);

      // Act
      const results = await (service as any).collectSecurityEvidence();

      // Assert
      const cc66Result = results.find(r => r.controlId === 'CC6.6');
      expect(cc66Result).toBeDefined();
      expect(cc66Result.criteria).toBe('Security');
    });
  });

  describe('collectAvailabilityEvidence', () => {
    it('should collect A1.1 evidence', async () => {
      // Arrange
      (fs.readdirSync as jest.Mock).mockReturnValue(['result.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ timestamp: '2024-01-15' }));
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      // Act
      const results = await (service as any).collectAvailabilityEvidence();

      // Assert
      const a11Result = results.find(r => r.controlId === 'A1.1');
      expect(a11Result).toBeDefined();
      expect(a11Result.criteria).toBe('Availability');
    });

    it('should collect A1.2 evidence', async () => {
      // Arrange
      const mockHealthChecks = [{ id: 1, entityType: 'SYSTEM', action: 'PERFORMANCE_METRIC' }];
      prismaMock.auditLog.findMany.mockResolvedValue(mockHealthChecks);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      // Act
      const results = await (service as any).collectAvailabilityEvidence();

      // Assert
      const a12Result = results.find(r => r.controlId === 'A1.2');
      expect(a12Result).toBeDefined();
      expect(a12Result.criteria).toBe('Availability');
    });

    it('should handle missing performance results directory', async () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      // Act
      const results = await (service as any).collectAvailabilityEvidence();

      // Assert
      const a11Result = results.find(r => r.controlId === 'A1.1');
      expect(a11Result.data).toHaveLength(0);
    });
  });

  describe('collectConfidentialityEvidence', () => {
    it('should collect C1.1 evidence', async () => {
      // Arrange
      prismaMock.organization.count.mockResolvedValue(10);
      prismaMock.user.groupBy.mockResolvedValue([
        { organizationId: 'org1', _count: 5 },
        { organizationId: 'org2', _count: 3 },
      ]);

      // Act
      const results = await (service as any).collectConfidentialityEvidence();

      // Assert
      expect(results).toBeDefined();
      expect(results[0].controlId).toBe('C1.1');
      expect(results[0].criteria).toBe('Confidentiality');
      expect(results[0].summary.activeTenants).toBe(10);
    });
  });

  describe('collectProcessingIntegrityEvidence', () => {
    it('should collect PI1.1 evidence', async () => {
      // Arrange
      const mockVerifications = [
        { id: 1, status: 'SUCCESS', totalEvents: 100 },
        { id: 2, status: 'SUCCESS', totalEvents: 150 },
      ];
      prismaMock.auditIntegrityVerification.findMany.mockResolvedValue(mockVerifications);

      // Act
      const results = await (service as any).collectProcessingIntegrityEvidence();

      // Assert
      expect(results).toBeDefined();
      expect(results[0].controlId).toBe('PI1.1');
      expect(results[0].criteria).toBe('ProcessingIntegrity');
      expect(results[0].summary.successCount).toBe(2);
    });
  });

  describe('collectPrivacyEvidence', () => {
    it('should collect P1.1 evidence', async () => {
      // Arrange
      prismaMock.auditLog.count.mockResolvedValue(500);
      prismaMock.user.count.mockResolvedValue(50);

      // Act
      const results = await (service as any).collectPrivacyEvidence();

      // Assert
      expect(results).toBeDefined();
      expect(results[0].controlId).toBe('P1.1');
      expect(results[0].criteria).toBe('Privacy');
    });
  });

  describe('storeEvidence', () => {
    const mockResults = [
      { controlId: 'CC6.1', criteria: 'Security', data: { test: 'data' } },
      { controlId: 'CC6.2', criteria: 'Security', data: { test: 'data' } },
    ];

    it('should store evidence to file system', async () => {
      // Act
      await (service as any).storeEvidence(mockResults);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // evidence file + metadata file
      expect(path.join).toHaveBeenCalled();
    });

    it('should generate correct evidence package structure', async () => {
      // Arrange
      let writtenData: any;
      (fs.writeFileSync as jest.Mock).mockImplementation((path, data) => {
        if (path.includes('evidence-')) {
          writtenData = JSON.parse(data);
        }
      });

      // Act
      await (service as any).storeEvidence(mockResults);

      // Assert
      expect(writtenData).toHaveProperty('collectedAt');
      expect(writtenData).toHaveProperty('system', 'HelixCRM');
      expect(writtenData).toHaveProperty('totalControls', 2);
      expect(writtenData).toHaveProperty('byCriteria.Security', 2);
      expect(writtenData).toHaveProperty('results', mockResults);
      expect(writtenData).toHaveProperty('verification.packageHash');
    });
  });

  describe('getCollectionHistory', () => {
    const mockMetadataFiles = [
      'metadata-2024-01-15T10-30-00-000Z.json',
      'metadata-2024-01-14T10-30-00-000Z.json',
    ];

    const mockMetadata = {
      collectionId: 'col-123',
      collectedAt: '2024-01-15T10:30:00.000Z',
      totalControls: 8,
    };

    beforeEach(() => {
      (fs.readdirSync as jest.Mock).mockReturnValue(mockMetadataFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockMetadata));
    });

    it('should return collection history', async () => {
      // Act
      const result = await service.getCollectionHistory(2);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockMetadata);
      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should use default limit of 10', async () => {
      // Act
      await service.getCollectionHistory();

      // Assert
      expect(fs.readdirSync).toHaveBeenCalled();
    });
  });

  describe('performGapAnalysis', () => {
    const mockEvidence = [
      { controlId: 'CC6.1', data: [{ id: 1 }] },
      { controlId: 'CC6.2', data: [] },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'collectAllEvidence').mockResolvedValue(mockEvidence as any);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    it('should perform gap analysis', async () => {
      // Act
      const result = await service.performGapAnalysis();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(8); // All 8 expected controls
      
      const cc61Result = result.find(r => r.controlId === 'CC6.1');
      expect(cc61Result.status).toBe('COMPLETE');
      expect(cc61Result.riskLevel).toBe('LOW');
      
      const cc62Result = result.find(r => r.controlId === 'CC6.2');
      expect(cc62Result.status).toBe('PARTIAL');
      expect(cc62Result.riskLevel).toBe('MEDIUM');
    });

    it('should generate gap analysis report', async () => {
      // Act
      await service.performGapAnalysis();

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('gap-analysis-'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('cleanupOldEvidence', () => {
    const currentDate = new Date('2024-01-15T00:00:00.000Z');
    
    // Create dates as ISO strings to ensure consistency
    const oldDate1 = new Date('2022-12-31T00:00:00.000Z'); // ~380 days old
    const oldDate2 = new Date('2022-01-01T00:00:00.000Z'); // ~745 days old
    const recentDate = new Date('2024-01-14T00:00:00.000Z'); // 1 day old

    const evidenceDir = '/test/path/compliance/evidence';
    
    const mockFiles = [
      { 
        name: 'old1.json', 
        path: `${evidenceDir}/old1.json`, 
        stat: { mtime: oldDate1 } 
      },
      { 
        name: 'old2.json', 
        path: `${evidenceDir}/old2.json`, 
        stat: { mtime: oldDate2 } 
      },
      { 
        name: 'new.json', 
        path: `${evidenceDir}/new.json`, 
        stat: { mtime: recentDate } 
      },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(currentDate);

      // Clear all fs mocks
      (fs.readdirSync as jest.Mock).mockClear();
      (fs.statSync as jest.Mock).mockClear();
      (fs.unlinkSync as jest.Mock).mockClear();

      (fs.readdirSync as jest.Mock).mockReturnValue(['old1.json', 'old2.json', 'new.json']);
(fs.statSync as jest.Mock).mockImplementation((filePath) => {
  if (filePath.includes('old1')) return { mtime: oldDate1 };
  if (filePath.includes('old2')) return { mtime: oldDate2 };
  return { mtime: recentDate };
});
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cleanup old evidence files', async () => {
      // Act
      await service.cleanupOldEvidence();

      // Assert
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/path/compliance/evidence/old1.json');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/path/compliance/evidence/old2.json');
    });

    it('should log cleanup results', async () => {
      // Arrange
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      // Act
      await service.cleanupOldEvidence();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Cleaned up 2 old evidence files');
    });
  });

  describe('generateHash', () => {
    it('should generate hash using crypto', () => {
      // Act
      const result = (service as any).generateHash('test data');

      // Assert
      expect(result).toBe('mocked-hash-123');
    });
  });
});