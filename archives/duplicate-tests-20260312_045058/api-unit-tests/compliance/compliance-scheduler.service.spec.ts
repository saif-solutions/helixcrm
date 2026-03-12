import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceSchedulerService } from '../../../src/shared/compliance/compliance-scheduler.service';
import { Soc2EvidenceService } from '../../../src/shared/compliance/soc2/soc2-evidence.service';

// Mock the evidence service
const mockSoc2EvidenceService = {
  collectAllEvidence: jest.fn(),
  performGapAnalysis: jest.fn(),
  cleanupOldEvidence: jest.fn(),
};

describe('ComplianceSchedulerService', () => {
  let service: ComplianceSchedulerService;
  let evidenceService: typeof mockSoc2EvidenceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceSchedulerService,
        { provide: Soc2EvidenceService, useValue: mockSoc2EvidenceService },
      ],
    }).compile();

    service = module.get<ComplianceSchedulerService>(
      ComplianceSchedulerService,
    );
    evidenceService = module.get(Soc2EvidenceService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start scheduled tasks on module init', () => {
      const startSpy = jest.spyOn(service as any, 'startScheduledTasks');

      service.onModuleInit();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should log initialization', () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        'Compliance scheduler initialized',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop scheduled tasks on module destroy', () => {
      const stopSpy = jest.spyOn(service as any, 'stopScheduledTasks');

      service.onModuleDestroy();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('startScheduledTasks', () => {
    it('should set up daily and weekly intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      (service as any).startScheduledTasks();

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should schedule initial collection after 5 seconds', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      (service as any).startScheduledTasks();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });

  describe('stopScheduledTasks', () => {
    it('should clear daily interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      (service as any).dailyInterval = 123 as any;

      (service as any).stopScheduledTasks();

      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
      expect((service as any).dailyInterval).toBeNull();
    });

    it('should clear weekly interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      (service as any).weeklyInterval = 456 as any;

      (service as any).stopScheduledTasks();

      expect(clearIntervalSpy).toHaveBeenCalledWith(456);
      expect((service as any).weeklyInterval).toBeNull();
    });
  });

  describe('collectDailyEvidence', () => {
    it('should collect evidence and log success', async () => {
      const mockResults = [{ controlId: 'CC6.1' }, { controlId: 'CC6.2' }];
      evidenceService.collectAllEvidence.mockResolvedValue(mockResults);
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await (service as any).collectDailyEvidence();

      expect(evidenceService.collectAllEvidence).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Daily evidence collection completed: ${mockResults.length} controls collected`,
      );
    });

    it('should handle errors during evidence collection', async () => {
      const error = new Error('Collection failed');
      evidenceService.collectAllEvidence.mockRejectedValue(error);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).collectDailyEvidence();

      expect(loggerSpy).toHaveBeenCalledWith(
        `Daily evidence collection failed: ${error.message}`,
        error.stack,
      );
    });
  });

  describe('performWeeklyGapAnalysis', () => {
    const mockGaps = [
      { status: 'COMPLETE', riskLevel: 'LOW' },
      { status: 'COMPLETE', riskLevel: 'LOW' },
      { status: 'PARTIAL', riskLevel: 'MEDIUM' },
      { status: 'MISSING', riskLevel: 'HIGH' },
    ];

    it('should perform gap analysis and log results', async () => {
      evidenceService.performGapAnalysis.mockResolvedValue(mockGaps);
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await (service as any).performWeeklyGapAnalysis();

      expect(evidenceService.performGapAnalysis).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weekly gap analysis completed'),
      );
    });

    it('should warn if completion rate drops below 80%', async () => {
      const lowComplianceGaps = [
        { status: 'COMPLETE', riskLevel: 'LOW' },
        { status: 'PARTIAL', riskLevel: 'MEDIUM' },
        { status: 'MISSING', riskLevel: 'HIGH' },
        { status: 'MISSING', riskLevel: 'HIGH' },
      ];
      evidenceService.performGapAnalysis.mockResolvedValue(lowComplianceGaps);
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await (service as any).performWeeklyGapAnalysis();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('LOW COMPLIANCE COMPLETION'),
      );
    });

    it('should handle errors during gap analysis', async () => {
      const error = new Error('Analysis failed');
      evidenceService.performGapAnalysis.mockRejectedValue(error);
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).performWeeklyGapAnalysis();

      expect(loggerSpy).toHaveBeenCalledWith(
        `Weekly gap analysis failed: ${error.message}`,
        error.stack,
      );
    });
  });

  describe('triggerManualCollection', () => {
    it('should manually trigger collection and return success', async () => {
      const mockResults = [{ controlId: 'CC6.1' }];
      evidenceService.collectAllEvidence.mockResolvedValue(mockResults);

      const result = await service.triggerManualCollection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Evidence collection completed');
      expect(result.results).toHaveProperty('count', 1);
      expect(result.results).toHaveProperty('duration');
      expect(result.results).toHaveProperty('timestamp');
    });

    it('should handle errors during manual collection', async () => {
      const error = new Error('Collection failed');
      evidenceService.collectAllEvidence.mockRejectedValue(error);

      const result = await service.triggerManualCollection();

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        `Evidence collection failed: ${error.message}`,
      );
    });
  });

  describe('triggerManualGapAnalysis', () => {
    const mockGaps = [
      { status: 'COMPLETE', riskLevel: 'LOW' },
      { status: 'COMPLETE', riskLevel: 'LOW' },
      { status: 'PARTIAL', riskLevel: 'MEDIUM' },
      { status: 'MISSING', riskLevel: 'HIGH' },
    ];

    it('should manually trigger gap analysis and return summary', async () => {
      evidenceService.performGapAnalysis.mockResolvedValue(mockGaps);

      const result = await service.triggerManualGapAnalysis();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Gap analysis completed');
      expect(result.gaps).toHaveProperty('total', 4);
      expect(result.gaps).toHaveProperty('completed', 2);
      expect(result.gaps).toHaveProperty('partial', 1);
      expect(result.gaps).toHaveProperty('missing', 1);
      expect(result.gaps).toHaveProperty('overallRisk', 'HIGH');
    });

    it('should calculate overall risk correctly', async () => {
      const lowRiskGaps = [
        { status: 'COMPLETE', riskLevel: 'LOW' },
        { status: 'COMPLETE', riskLevel: 'LOW' },
        { status: 'COMPLETE', riskLevel: 'LOW' },
      ];
      evidenceService.performGapAnalysis.mockResolvedValue(lowRiskGaps);

      const result = await service.triggerManualGapAnalysis();

      expect(result.gaps.overallRisk).toBe('LOW');
    });

    it('should handle errors during manual gap analysis', async () => {
      const error = new Error('Analysis failed');
      evidenceService.performGapAnalysis.mockRejectedValue(error);

      const result = await service.triggerManualGapAnalysis();

      expect(result.success).toBe(false);
      expect(result.message).toBe(`Gap analysis failed: ${error.message}`);
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger cleanup and return success', async () => {
      evidenceService.cleanupOldEvidence.mockResolvedValue(undefined);

      const result = await service.triggerCleanup();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Evidence cleanup completed');
    });

    it('should handle errors during cleanup', async () => {
      const error = new Error('Cleanup failed');
      evidenceService.cleanupOldEvidence.mockRejectedValue(error);

      const result = await service.triggerCleanup();

      expect(result.success).toBe(false);
      expect(result.message).toBe(`Evidence cleanup failed: ${error.message}`);
    });
  });
});
