import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from '../../../src/modules/leads/leads.service';
import { LeadRepository } from '../../../src/modules/leads/repositories/lead.repository';
import { TenantContextService } from '../../../src/shared/tenant/context/tenant-context.service';
import { AppLogger } from '../../../src/shared/logging/logger.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';

// Mock implementations
const mockLeadRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByIdOrThrow: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countByStatus: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

// Complete mock lead data that matches the Lead type
const createMockLead = (overrides = {}) => ({
  id: 'lead-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  company: 'Acme Inc',
  status: LeadStatus.new,
  metadata: null,
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
  ...overrides,
});

describe('LeadsService', () => {
  let service: LeadsService;
  let repository: typeof mockLeadRepository;
  let tenantContext: typeof mockTenantContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: LeadRepository, useValue: mockLeadRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: AppLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    repository = module.get(LeadRepository);
    tenantContext = module.get(TenantContextService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createLeadDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      company: 'Acme Inc',
      status: LeadStatus.new,
      source: 'website',
    };

    const mockLead = createMockLead();

    it('should successfully create a lead', async () => {
      repository.create.mockResolvedValue(mockLead);

      const result = await service.create(createLeadDto, 'user-123');

      expect(result).toEqual(mockLead);

      // ✅ FIX: Remove 'source' from the expected call since we're using metadata
      expect(repository.create).toHaveBeenCalledWith({
        name: createLeadDto.name,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        company: createLeadDto.company,
        status: LeadStatus.new,
        metadata: { source: 'website' },
      });
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email/phone', async () => {
      const error = { code: 'P2002' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createLeadDto, 'user-123')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException on referenced entity not found', async () => {
      const error = { code: 'P2025' };
      repository.create.mockRejectedValue(error);

      await expect(service.create(createLeadDto, 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const mockLeads = [
      createMockLead({ id: 'lead-1', name: 'Lead 1' }),
      createMockLead({ id: 'lead-2', name: 'Lead 2' }),
    ];

    it('should return paginated leads', async () => {
      repository.findAll.mockResolvedValue({
        data: mockLeads,
        total: 2,
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockLeads,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
      expect(tenantContext.getTenantId).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const mockLead = createMockLead();

    it('should return lead if found and belongs to tenant', async () => {
      repository.findByIdOrThrow.mockResolvedValue(mockLead);

      const result = await service.findOne('lead-123');

      expect(result).toEqual(mockLead);
      expect(repository.findByIdOrThrow).toHaveBeenCalledWith('lead-123');
    });

    it('should throw ForbiddenException if lead belongs to different tenant', async () => {
      const wrongTenantLead = createMockLead({ organizationId: 'different-org' });
      repository.findByIdOrThrow.mockResolvedValue(wrongTenantLead);

      await expect(service.findOne('lead-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lead not found', async () => {
      repository.findByIdOrThrow.mockRejectedValue(new NotFoundException());

      await expect(service.findOne('lead-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateLeadDto = {
      name: 'Updated Name',
      status: LeadStatus.contacted,
    };

    const mockLead = createMockLead();
    const updatedLead = createMockLead({ ...updateLeadDto });

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLead);
    });

    it('should successfully update a lead', async () => {
      repository.update.mockResolvedValue(updatedLead);

      const result = await service.update('lead-123', updateLeadDto, 'user-123');

      expect(result).toEqual(updatedLead);
      expect(service.findOne).toHaveBeenCalledWith('lead-123');
      expect(repository.update).toHaveBeenCalledWith({
        id: 'lead-123',
        data: updateLeadDto,
      });
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const mockLead = createMockLead();

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLead);
    });

    it('should successfully soft delete a lead', async () => {
      const deletedLead = createMockLead({ deletedAt: new Date(), deletedBy: 'user-123' });
      repository.softDelete.mockResolvedValue(deletedLead);

      const result = await service.remove('lead-123', 'user-123');

      expect(result).toEqual(deletedLead);
      expect(service.findOne).toHaveBeenCalledWith('lead-123');
      expect(repository.softDelete).toHaveBeenCalledWith('lead-123', 'user-123');
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return lead statistics', async () => {
      const stats = {
        new: 5,
        contacted: 3,
        qualified: 2,
      };
      repository.countByStatus.mockResolvedValue(stats);

      const result = await service.getStats();

      expect(result).toEqual(stats);
      expect(tenantContext.getTenantId).toHaveBeenCalled();
    });
  });
});
