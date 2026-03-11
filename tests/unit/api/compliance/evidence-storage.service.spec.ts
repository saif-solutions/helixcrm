import { EvidenceStorageService } from '@api/shared/compliance/evidence-storage/evidence-storage.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import * as crypto from 'crypto';

// Mock crypto with better debugging
jest.mock('crypto', () => ({
  createHash: jest.fn().mockImplementation(() => {
    const hashMock = {
      update: jest.fn().mockImplementation(function (this: any, data: string) {
        (this as any).data = data;
        return this;
      }),
      digest: jest.fn().mockImplementation(function (this: any) {
        const data = (this as any).data || '';
        // Return specific hashes based on the content
        if (data.includes('LOGIN')) return 'hash-1';
        if (data.includes('DEAL_CREATED')) return 'hash-2';
        if (data.includes('LEAD_UPDATED')) return 'hash-3';
        if (data.includes('CC6.1')) return 'mocked-hash-123';
        if (data.includes('test data')) return 'mocked-hash-123';
        if (data.includes('!@#$%^&*()')) return 'mocked-hash-123';
        if (data === '') return 'mocked-hash-123';
        return 'default-hash';
      }),
    };
    return hashMock;
  }),
}));

describe('EvidenceStorageService', () => {
  let service: EvidenceStorageService;
  let prismaMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock prisma service
    prismaMock = {
      evidenceChain: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      evidenceCollection: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    // Create service instance with mock
    service = new EvidenceStorageService(prismaMock as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeEvidenceWithIntegrity', () => {
    const mockEvidence = {
      controlId: 'CC6.1',
      data: { test: 'data' },
      totalControls: 8,
      byCriteria: { Security: 3, Availability: 2 },
      evidencePath: '/path/to/evidence',
    };

    const mockLastChainEntry = {
      evidenceHash: 'previous-hash-123',
    };

    const mockChainEntry = {
      id: 'chain-123',
      evidenceHash: 'mocked-hash-123',
      previousHash: 'previous-hash-123',
      collectionId: 'col-123',
    };

    const mockCollectionEntry = {
      collectionId: 'col-123',
      collectedAt: new Date('2024-01-01'),
      totalControls: 8,
      criteriaBreakdown: mockEvidence.byCriteria,
      evidencePath: mockEvidence.evidencePath,
      verificationHash: 'mocked-hash-123',
      status: 'COMPLETED',
    };

    it('should store evidence with genesis hash when no previous chain', async () => {
      // Arrange
      prismaMock.evidenceChain.findFirst.mockResolvedValue(null);
      prismaMock.evidenceChain.create.mockResolvedValue(mockChainEntry);
      prismaMock.evidenceCollection.create.mockResolvedValue(mockCollectionEntry);

      // Act
      const result = await service.storeEvidenceWithIntegrity(mockEvidence);

      // Assert
      expect(result).toEqual({
        id: mockChainEntry.id,
        collectionId: mockCollectionEntry.collectionId,
        collectedAt: mockCollectionEntry.collectedAt,
        evidenceHash: 'mocked-hash-123',
        previousHash: 'genesis',
        status: 'STORED',
      });

      expect(prismaMock.evidenceChain.findFirst).toHaveBeenCalledWith({
        orderBy: { timestamp: 'desc' },
      });

      expect(prismaMock.evidenceChain.create).toHaveBeenCalledWith({
        data: {
          evidenceHash: 'mocked-hash-123',
          previousHash: 'genesis',
          collectionId: expect.any(String),
          evidenceData: mockEvidence,
        },
      });

      expect(prismaMock.evidenceCollection.create).toHaveBeenCalledWith({
        data: {
          collectionId: expect.any(String),
          collectedAt: expect.any(Date),
          totalControls: mockEvidence.totalControls,
          criteriaBreakdown: mockEvidence.byCriteria,
          evidencePath: mockEvidence.evidencePath,
          verificationHash: 'mocked-hash-123',
          status: 'COMPLETED',
        },
      });
    });

    it('should store evidence with previous hash when chain exists', async () => {
      // Arrange
      prismaMock.evidenceChain.findFirst.mockResolvedValue(mockLastChainEntry);
      prismaMock.evidenceChain.create.mockResolvedValue(mockChainEntry);
      prismaMock.evidenceCollection.create.mockResolvedValue(mockCollectionEntry);

      // Act
      const result = await service.storeEvidenceWithIntegrity(mockEvidence);

      // Assert
      expect(result.previousHash).toBe('previous-hash-123');
      expect(prismaMock.evidenceChain.create).toHaveBeenCalledWith({
        data: {
          evidenceHash: 'mocked-hash-123',
          previousHash: 'previous-hash-123',
          collectionId: expect.any(String),
          evidenceData: mockEvidence,
        },
      });
    });

    it('should use provided collectionId if present', async () => {
      // Arrange
      const evidenceWithId = {
        ...mockEvidence,
        collectionId: 'custom-col-456',
      };
      prismaMock.evidenceChain.findFirst.mockResolvedValue(mockLastChainEntry);
      prismaMock.evidenceChain.create.mockResolvedValue(mockChainEntry);
      prismaMock.evidenceCollection.create.mockResolvedValue(mockCollectionEntry);

      // Act
      await service.storeEvidenceWithIntegrity(evidenceWithId);

      // Assert
      expect(prismaMock.evidenceChain.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          collectionId: 'custom-col-456',
        }),
      });
    });

    it('should handle evidence without optional fields', async () => {
      // Arrange
      const minimalEvidence = {
        controlId: 'CC6.1',
        data: { test: 'data' },
      };
      prismaMock.evidenceChain.findFirst.mockResolvedValue(null);
      prismaMock.evidenceChain.create.mockResolvedValue(mockChainEntry);
      prismaMock.evidenceCollection.create.mockResolvedValue({
        ...mockCollectionEntry,
        totalControls: 0,
        criteriaBreakdown: {},
        evidencePath: '',
      });

      // Act
      await service.storeEvidenceWithIntegrity(minimalEvidence);

      // Assert
      expect(prismaMock.evidenceCollection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalControls: 0,
          criteriaBreakdown: {},
          evidencePath: '',
        }),
      });
    });

    it('should handle errors during storage', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.evidenceChain.findFirst.mockRejectedValue(error);

      // Act & Assert
      await expect(service.storeEvidenceWithIntegrity(mockEvidence)).rejects.toThrow(
        'Database error',
      );
    });

    it('should log success message', async () => {
      // Arrange
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      prismaMock.evidenceChain.findFirst.mockResolvedValue(null);
      prismaMock.evidenceChain.create.mockResolvedValue(mockChainEntry);
      prismaMock.evidenceCollection.create.mockResolvedValue(mockCollectionEntry);

      // Act
      await service.storeEvidenceWithIntegrity(mockEvidence);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Evidence stored with integrity'),
      );
    });
  });

  describe('verifyEvidenceChain', () => {
    const mockChainEntries = [
      {
        id: '1',
        evidenceHash: 'hash-1',
        previousHash: 'genesis',
        evidenceData: { action: 'LOGIN' },
        timestamp: new Date('2024-01-01'),
      },
      {
        id: '2',
        evidenceHash: 'hash-2',
        previousHash: 'hash-1',
        evidenceData: { action: 'DEAL_CREATED' },
        timestamp: new Date('2024-01-02'),
      },
      {
        id: '3',
        evidenceHash: 'hash-3',
        previousHash: 'hash-2',
        evidenceData: { action: 'LEAD_UPDATED' },
        timestamp: new Date('2024-01-03'),
      },
    ];

    it('should return valid for intact chain', async () => {
      // Arrange
      prismaMock.evidenceChain.findMany.mockResolvedValue(mockChainEntries);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(true);
      expect(result.chainLength).toBe(3);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect hash mismatch', async () => {
      // Arrange
      const corruptedChain = [
        ...mockChainEntries.slice(0, 2),
        {
          ...mockChainEntries[2],
          evidenceHash: 'corrupted-hash',
        },
      ];
      prismaMock.evidenceChain.findMany.mockResolvedValue(corruptedChain);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Hash verification failed');
    });

    it('should detect broken previous hash link', async () => {
      // Arrange
      const brokenChain = [
        mockChainEntries[0],
        {
          ...mockChainEntries[1],
          previousHash: 'wrong-previous-hash',
        },
        mockChainEntries[2],
      ];
      prismaMock.evidenceChain.findMany.mockResolvedValue(brokenChain);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Hash mismatch');
    });

    it('should handle empty chain', async () => {
      // Arrange
      prismaMock.evidenceChain.findMany.mockResolvedValue([]);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Evidence chain is empty');
      expect(result.chainLength).toBe(0);
    });

    it('should handle multiple issues in chain', async () => {
      // Arrange
      const corruptedChain = [
        mockChainEntries[0],
        {
          ...mockChainEntries[1],
          previousHash: 'wrong-previous-hash',
          evidenceHash: 'corrupted-hash',
        },
        mockChainEntries[2],
      ];
      prismaMock.evidenceChain.findMany.mockResolvedValue(corruptedChain);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(1);
    });

    it('should handle errors during verification', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.evidenceChain.findMany.mockRejectedValue(error);

      // Act
      const result = await service.verifyEvidenceChain();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(`Verification error: ${error.message}`);
    });
  });

  describe('getEvidenceCollection', () => {
    const collectionId = 'col-123';
    const mockCollection = {
      collectionId,
      collectedAt: new Date('2024-01-01'),
      totalControls: 8,
      criteriaBreakdown: { Security: 3 },
      evidencePath: '/path/to/evidence',
      verificationHash: 'hash-123',
      status: 'COMPLETED',
    };

    const mockChainEntry = {
      id: 'chain-123',
      collectionId,
      evidenceHash: 'hash-123',
      timestamp: new Date('2024-01-01'),
    };

    it('should return collection with chain entry', async () => {
      // Arrange
      prismaMock.evidenceCollection.findUnique.mockResolvedValue(mockCollection);
      prismaMock.evidenceChain.findFirst.mockResolvedValue(mockChainEntry);

      // Act
      const result = await service.getEvidenceCollection(collectionId);

      // Assert
      expect(result).toEqual({
        ...mockCollection,
        evidenceChain: [mockChainEntry],
      });
      expect(prismaMock.evidenceCollection.findUnique).toHaveBeenCalledWith({
        where: { collectionId },
      });
      expect(prismaMock.evidenceChain.findFirst).toHaveBeenCalledWith({
        where: { collectionId },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should return null if collection not found', async () => {
      // Arrange
      prismaMock.evidenceCollection.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getEvidenceCollection(collectionId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle collection without chain entry', async () => {
      // Arrange
      prismaMock.evidenceCollection.findUnique.mockResolvedValue(mockCollection);
      prismaMock.evidenceChain.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getEvidenceCollection(collectionId);

      // Assert
      expect(result).toEqual({
        ...mockCollection,
        evidenceChain: [],
      });
    });

    it('should throw error when database error occurs', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.evidenceCollection.findUnique.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getEvidenceCollection(collectionId)).rejects.toThrow('Database error');
    });
  });

  describe('getRecentCollections', () => {
    const mockCollections = [
      { collectionId: 'col-1', collectedAt: new Date('2024-01-03') },
      { collectionId: 'col-2', collectedAt: new Date('2024-01-02') },
      { collectionId: 'col-3', collectedAt: new Date('2024-01-01') },
    ];

    const mockChainEntries = {
      'col-1': { id: 'chain-1' },
      'col-2': { id: 'chain-2' },
      'col-3': { id: 'chain-3' },
    };

    it('should return recent collections with chain entries', async () => {
      // Arrange
      prismaMock.evidenceCollection.findMany.mockResolvedValue(mockCollections);
      prismaMock.evidenceChain.findFirst.mockImplementation(({ where }) => {
        const collectionId = where.collectionId;
        return Promise.resolve(mockChainEntries[collectionId] || null);
      });

      // Act
      const result = await service.getRecentCollections(3);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('evidenceChain');
      expect(prismaMock.evidenceCollection.findMany).toHaveBeenCalledWith({
        orderBy: { collectedAt: 'desc' },
        take: 3,
      });
      expect(prismaMock.evidenceChain.findFirst).toHaveBeenCalledTimes(3);
    });

    it('should use default limit of 10', async () => {
      // Arrange
      prismaMock.evidenceCollection.findMany.mockResolvedValue([]);

      // Act
      await service.getRecentCollections();

      // Assert
      expect(prismaMock.evidenceCollection.findMany).toHaveBeenCalledWith({
        orderBy: { collectedAt: 'desc' },
        take: 10,
      });
    });

    it('should handle collections without chain entries', async () => {
      // Arrange
      prismaMock.evidenceCollection.findMany.mockResolvedValue(mockCollections);
      prismaMock.evidenceChain.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getRecentCollections(3);

      // Assert
      expect(result[0].evidenceChain).toEqual([]);
      expect(result[1].evidenceChain).toEqual([]);
      expect(result[2].evidenceChain).toEqual([]);
    });

    it('should throw error when database error occurs', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.evidenceCollection.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getRecentCollections()).rejects.toThrow('Database error');
    });
  });

  describe('cleanupOldEvidence', () => {
    const mockDeleteResult = { count: 5 };
    const fixedDate = new Date('2024-01-01T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delete evidence older than retention days', async () => {
      // Arrange
      prismaMock.evidenceCollection.deleteMany.mockResolvedValue(mockDeleteResult);
      const cutoffDate = new Date(fixedDate);
      cutoffDate.setDate(cutoffDate.getDate() - 365);

      // Act
      const result = await service.cleanupOldEvidence(365);

      // Assert
      expect(result.deletedCount).toBe(5);
      expect(prismaMock.evidenceCollection.deleteMany).toHaveBeenCalledWith({
        where: {
          collectedAt: { lt: cutoffDate },
        },
      });
    });

    it('should use default retention of 365 days', async () => {
      // Arrange
      prismaMock.evidenceCollection.deleteMany.mockResolvedValue(mockDeleteResult);
      const cutoffDate = new Date(fixedDate);
      cutoffDate.setDate(cutoffDate.getDate() - 365);

      // Act
      await service.cleanupOldEvidence();

      // Assert
      expect(prismaMock.evidenceCollection.deleteMany).toHaveBeenCalledWith({
        where: {
          collectedAt: { lt: cutoffDate },
        },
      });
    });

    it('should handle custom retention days', async () => {
      // Arrange
      prismaMock.evidenceCollection.deleteMany.mockResolvedValue(mockDeleteResult);
      const cutoffDate = new Date(fixedDate);
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      // Act
      await service.cleanupOldEvidence(30);

      // Assert
      expect(prismaMock.evidenceCollection.deleteMany).toHaveBeenCalledWith({
        where: {
          collectedAt: { lt: cutoffDate },
        },
      });
    });

    it('should handle zero deletions', async () => {
      // Arrange
      prismaMock.evidenceCollection.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.cleanupOldEvidence(30);

      // Assert
      expect(result.deletedCount).toBe(0);
    });

    it('should log cleanup result', async () => {
      // Arrange
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      prismaMock.evidenceCollection.deleteMany.mockResolvedValue(mockDeleteResult);

      // Act
      await service.cleanupOldEvidence();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        `Cleaned up ${mockDeleteResult.count} old evidence collections`,
      );
    });

    it('should throw error when database error occurs', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.evidenceCollection.deleteMany.mockRejectedValue(error);

      // Act & Assert
      await expect(service.cleanupOldEvidence()).rejects.toThrow('Database error');
    });
  });

  describe('generateHash', () => {
    it('should generate hash using crypto', () => {
      // Act
      const result = (service as any).generateHash('test data');

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(result).toBe('mocked-hash-123');
    });

    it('should handle empty string', () => {
      // Act
      const result = (service as any).generateHash('');

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(result).toBe('mocked-hash-123');
    });

    it('should handle special characters', () => {
      // Act
      const result = (service as any).generateHash('!@#$%^&*()');

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(result).toBe('mocked-hash-123');
    });
  });
});
